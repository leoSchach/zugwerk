-- Datenbank für Zugwerk. Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.

-- Fortschritt jedes Nutzers (Einstellungen, Puzzles, Eröffnungen, Lektionen) als JSON
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: Jeder darf nur seinen eigenen Fortschritt sehen und ändern
alter table public.progress enable row level security;

create policy "Eigenen Fortschritt lesen" on public.progress
  for select using ((select auth.uid()) = user_id);

create policy "Eigenen Fortschritt anlegen" on public.progress
  for insert with check ((select auth.uid()) = user_id);

create policy "Eigenen Fortschritt ändern" on public.progress
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
