-- Partien gegen Freunde. Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.
--
-- Züge, Uhr und Spielende laufen über Funktionen (security definer), damit niemand
-- für den Gegner ziehen oder die Uhr manipulieren kann. Direktes Ändern der Tabelle ist verboten.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  white_id uuid references auth.users (id) on delete set null,
  black_id uuid references auth.users (id) on delete set null,
  white_name text,
  black_name text,
  moves text[] not null default '{}',          -- Züge in SAN, z. B. {e4,e5,Nf3}
  status text not null default 'waiting',      -- waiting | active | finished
  result text,                                 -- 1-0 | 0-1 | 1/2-1/2
  reason text,                                 -- checkmate | resign | timeout | stalemate | agreement | ...
  time_initial int,                            -- Bedenkzeit in Sekunden (null = ohne Uhr)
  time_increment int not null default 0,       -- Zeitgutschrift pro Zug in Sekunden
  white_ms int,
  black_ms int,
  last_move_at timestamptz,
  draw_offer text,                             -- 'w' oder 'b': wer Remis angeboten hat
  rematch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

grant select, insert, delete on public.games to authenticated;

-- Angemeldete Nutzer dürfen Partien sehen (nötig, um per Link beizutreten oder zuzuschauen)
create policy "Partien ansehen" on public.games
  for select to authenticated using (true);

-- Eine neue Partie darf man nur für sich selbst anlegen
create policy "Partie erstellen" on public.games
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (white_id = (select auth.uid()) or black_id = (select auth.uid())));

-- Eine Einladung, die noch niemand angenommen hat, darf man wieder löschen
create policy "Einladung zurückziehen" on public.games
  for delete to authenticated
  using (created_by = (select auth.uid()) and status = 'waiting');

-- Live-Updates für Züge
alter publication supabase_realtime add table public.games;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen

-- Aktuelle Serverzeit (für die Uhr, damit beide Spieler dieselbe Zeit sehen)
create or replace function public.server_now() returns timestamptz
language sql stable as $$ select now() $$;

-- Name eines Nutzers aus dem Konto
create or replace function public.player_name(p_user uuid) returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(raw_user_meta_data ->> 'username', split_part(email, '@', 1)) from auth.users where id = p_user
$$;

-- Restzeit der Seite am Zug nach Serveruhr (null, wenn die Uhr noch nicht läuft)
create or replace function public.mover_remaining(g public.games) returns int
language plpgsql stable as $$
declare
  ply int := coalesce(array_length(g.moves, 1), 0);
  elapsed int;
begin
  -- Die Uhr startet erst, wenn beide Seiten ihren ersten Zug gemacht haben
  if g.time_initial is null or ply < 2 then return null; end if;
  elapsed := (extract(epoch from (now() - g.last_move_at)) * 1000)::int;
  return (case when ply % 2 = 0 then g.white_ms else g.black_ms end) - elapsed;
end $$;

-- ---------------------------------------------------------------------------
-- Aktionen der Spieler

create or replace function public.join_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'Partie nicht gefunden'; end if;
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden'; end if;
  if auth.uid() = g.white_id or auth.uid() = g.black_id then return; end if;
  if g.status <> 'waiting' then raise exception 'Die Partie hat schon begonnen'; end if;

  if g.white_id is null then
    update public.games set white_id = auth.uid(), white_name = public.player_name(auth.uid()),
      status = 'active', last_move_at = now(), updated_at = now() where id = p_game;
  else
    update public.games set black_id = auth.uid(), black_name = public.player_name(auth.uid()),
      status = 'active', last_move_at = now(), updated_at = now() where id = p_game;
  end if;
end $$;

-- Einen Zug speichern. p_ply = Anzahl der Züge vor diesem Zug (Schutz gegen doppelte Züge).
-- p_result/p_reason setzt der Browser, wenn der Zug die Partie beendet (Matt, Patt, ...).
create or replace function public.make_move(p_game uuid, p_san text, p_ply int, p_result text default null, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  mover text;
  remaining int;
begin
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'Partie nicht gefunden'; end if;
  if g.status <> 'active' then raise exception 'Die Partie läuft nicht mehr'; end if;
  if coalesce(array_length(g.moves, 1), 0) <> p_ply then raise exception 'Der Zug passt nicht zur Stellung'; end if;

  mover := case when p_ply % 2 = 0 then 'w' else 'b' end;
  if auth.uid() is distinct from (case when mover = 'w' then g.white_id else g.black_id end) then
    raise exception 'Du bist nicht am Zug';
  end if;

  remaining := public.mover_remaining(g);
  if remaining is not null then
    if remaining <= 0 then
      -- Zeit abgelaufen, bevor der Zug ankam
      update public.games set status = 'finished', reason = 'timeout', updated_at = now(),
        result = case when mover = 'w' then '0-1' else '1-0' end,
        white_ms = case when mover = 'w' then 0 else white_ms end,
        black_ms = case when mover = 'b' then 0 else black_ms end
      where id = p_game;
      return;
    end if;
    remaining := remaining + g.time_increment * 1000;
    if mover = 'w' then g.white_ms := remaining; else g.black_ms := remaining; end if;
  end if;

  update public.games set
    moves = array_append(moves, p_san),
    white_ms = g.white_ms,
    black_ms = g.black_ms,
    last_move_at = now(),
    draw_offer = null,
    status = case when p_result is null then 'active' else 'finished' end,
    result = p_result,
    reason = p_reason,
    updated_at = now()
  where id = p_game;
end $$;

-- Prüft, ob die Zeit der Seite am Zug abgelaufen ist, und beendet dann die Partie
create or replace function public.claim_timeout(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  remaining int;
  mover text;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if auth.uid() is distinct from g.white_id and auth.uid() is distinct from g.black_id then return; end if;
  remaining := public.mover_remaining(g);
  if remaining is null or remaining > 0 then return; end if;
  mover := case when coalesce(array_length(g.moves, 1), 0) % 2 = 0 then 'w' else 'b' end;
  update public.games set status = 'finished', reason = 'timeout', updated_at = now(),
    result = case when mover = 'w' then '0-1' else '1-0' end,
    white_ms = case when mover = 'w' then 0 else white_ms end,
    black_ms = case when mover = 'b' then 0 else black_ms end
  where id = p_game;
end $$;

create or replace function public.resign_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if auth.uid() = g.white_id then
    update public.games set status = 'finished', result = '0-1', reason = 'resign', updated_at = now() where id = p_game;
  elsif auth.uid() = g.black_id then
    update public.games set status = 'finished', result = '1-0', reason = 'resign', updated_at = now() where id = p_game;
  end if;
end $$;

-- Remis anbieten; hat der Gegner schon angeboten, wird es angenommen
create or replace function public.offer_draw(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  me text;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  me := case when auth.uid() = g.white_id then 'w' when auth.uid() = g.black_id then 'b' end;
  if me is null then return; end if;
  if g.draw_offer is not null and g.draw_offer <> me then
    update public.games set status = 'finished', result = '1/2-1/2', reason = 'agreement', draw_offer = null, updated_at = now()
    where id = p_game;
  else
    update public.games set draw_offer = me, updated_at = now() where id = p_game;
  end if;
end $$;

create or replace function public.decline_draw(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.games set draw_offer = null, updated_at = now()
  where id = p_game and status = 'active' and (auth.uid() = white_id or auth.uid() = black_id);
end $$;

-- Revanche mit getauschten Farben. Gibt die ID der neuen Partie zurück.
create or replace function public.rematch(p_game uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  new_id uuid;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'finished' then raise exception 'Die Partie ist noch nicht beendet'; end if;
  if auth.uid() is distinct from g.white_id and auth.uid() is distinct from g.black_id then raise exception 'Nur Spieler können eine Revanche starten'; end if;
  if g.rematch_id is not null then return g.rematch_id; end if;

  insert into public.games (created_by, white_id, black_id, white_name, black_name, status,
    time_initial, time_increment, white_ms, black_ms, last_move_at)
  values (auth.uid(), g.black_id, g.white_id, g.black_name, g.white_name, 'active',
    g.time_initial, g.time_increment, g.time_initial * 1000, g.time_initial * 1000, now())
  returning id into new_id;

  update public.games set rematch_id = new_id, updated_at = now() where id = p_game;
  return new_id;
end $$;

-- Nur angemeldete Nutzer dürfen die Funktionen aufrufen
revoke execute on function public.join_game(uuid), public.make_move(uuid, text, int, text, text),
  public.claim_timeout(uuid), public.resign_game(uuid), public.offer_draw(uuid),
  public.decline_draw(uuid), public.rematch(uuid), public.player_name(uuid) from public, anon;
grant execute on function public.join_game(uuid), public.make_move(uuid, text, int, text, text),
  public.claim_timeout(uuid), public.resign_game(uuid), public.offer_draw(uuid),
  public.decline_draw(uuid), public.rematch(uuid), public.player_name(uuid) to authenticated;
