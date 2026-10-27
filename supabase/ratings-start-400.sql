-- Änderung: Startwert 400 statt 1200 und Untergrenze 100.
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen (nach ratings.sql).

alter table public.ratings alter column rating set default 400;
alter table public.ratings alter column best set default 400;

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

  -- Untergrenze 100: tiefer kann die Wertung nicht fallen
  dw := greatest(dw, 100 - rw);
  db := greatest(db, 100 - rb);

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
