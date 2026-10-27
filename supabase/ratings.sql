-- Elo-Wertungen pro Spielmodus (Bullet, Blitz, Schnellschach, Klassisch).
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen (nach games.sql).
--
-- Die Wertung wird am Ende jeder gewerteten Partie von einem Trigger berechnet –
-- also auf dem Server, damit niemand seine Wertung fälschen kann.

-- Zusätzliche Spalten für Partien
alter table public.games add column if not exists rated boolean not null default true;
alter table public.games add column if not exists mode text;
alter table public.games add column if not exists white_rating int;   -- Wertung vor der Partie
alter table public.games add column if not exists black_rating int;
alter table public.games add column if not exists white_change int;   -- Änderung durch die Partie
alter table public.games add column if not exists black_change int;

-- Spielmodus aus der Bedenkzeit, geschätzt wie bei Lichess: Grundzeit + 40 × Zuschlag
create or replace function public.game_mode(p_initial int, p_increment int) returns text
language sql immutable as $$
  select case
    when p_initial is null then null
    when p_initial + 40 * p_increment < 180 then 'bullet'
    when p_initial + 40 * p_increment < 480 then 'blitz'
    when p_initial + 40 * p_increment < 1500 then 'rapid'
    else 'classical'
  end
$$;

-- Wertung jedes Spielers pro Modus
create table if not exists public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  rating int not null default 1200,
  best int not null default 1200,
  games int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.ratings enable row level security;
grant select on public.ratings to authenticated;

-- Wertungen darf jeder Angemeldete sehen (z. B. die des Gegners). Ändern nur der Trigger.
create policy "Wertungen ansehen" on public.ratings
  for select to authenticated using (true);

-- Beim Anlegen einer Partie: Modus festlegen, Partien ohne Uhr sind nie gewertet
create or replace function public.games_set_mode() returns trigger
language plpgsql as $$
begin
  new.mode := public.game_mode(new.time_initial, new.time_increment);
  if new.mode is null then new.rated := false; end if;
  return new;
end $$;

drop trigger if exists games_set_mode on public.games;
create trigger games_set_mode before insert on public.games
  for each row execute function public.games_set_mode();

-- Am Ende einer gewerteten Partie: Elo beider Spieler anpassen
create or replace function public.games_apply_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rw int; rb int;      -- Wertungen vorher
  gw int; gb int;      -- bisherige Partien
  score numeric;       -- Ergebnis aus Sicht von Weiß: 1, 0.5 oder 0
  expected numeric;    -- erwartetes Ergebnis für Weiß
  dw int; db int;      -- Änderungen
begin
  if new.status <> 'finished' or old.status = 'finished' or not new.rated
     or new.white_id is null or new.black_id is null or new.result is null then
    return new;
  end if;
  -- Partien, in denen nicht beide Seiten gezogen haben, zählen nicht
  if coalesce(array_length(new.moves, 1), 0) < 2 then return new; end if;

  insert into public.ratings (user_id, mode) values (new.white_id, new.mode), (new.black_id, new.mode)
    on conflict do nothing;
  select rating, games into rw, gw from public.ratings where user_id = new.white_id and mode = new.mode for update;
  select rating, games into rb, gb from public.ratings where user_id = new.black_id and mode = new.mode for update;

  score := case new.result when '1-0' then 1 when '0-1' then 0 else 0.5 end;
  expected := 1 / (1 + power(10, (rb - rw) / 400.0));
  -- In den ersten 20 Partien ändert sich die Wertung schneller
  dw := round((case when gw < 20 then 40 else 20 end) * (score - expected));
  db := round((case when gb < 20 then 40 else 20 end) * (expected - score));

  update public.ratings set
    rating = rating + dw, best = greatest(best, rating + dw), games = games + 1,
    wins = wins + (score = 1)::int, draws = draws + (score = 0.5)::int, losses = losses + (score = 0)::int,
    updated_at = now()
  where user_id = new.white_id and mode = new.mode;

  update public.ratings set
    rating = rating + db, best = greatest(best, rating + db), games = games + 1,
    wins = wins + (score = 0)::int, draws = draws + (score = 0.5)::int, losses = losses + (score = 1)::int,
    updated_at = now()
  where user_id = new.black_id and mode = new.mode;

  new.white_rating := rw;
  new.black_rating := rb;
  new.white_change := dw;
  new.black_change := db;
  return new;
end $$;

drop trigger if exists games_apply_rating on public.games;
create trigger games_apply_rating before update on public.games
  for each row execute function public.games_apply_rating();

-- Revanche übernimmt jetzt auch, ob die Partie gewertet ist
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

  insert into public.games (created_by, white_id, black_id, white_name, black_name, status, rated,
    time_initial, time_increment, white_ms, black_ms, last_move_at)
  values (auth.uid(), g.black_id, g.white_id, g.black_name, g.white_name, 'active', g.rated,
    g.time_initial, g.time_increment, g.time_initial * 1000, g.time_initial * 1000, now())
  returning id into new_id;

  update public.games set rematch_id = new_id, updated_at = now() where id = p_game;
  return new_id;
end $$;
