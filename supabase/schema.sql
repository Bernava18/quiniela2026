-- ═══════════════════════════════════════════════════════════════
-- QUINIELA MUNDIAL 2026 — Schema Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES (extiende auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text,
  is_admin    boolean default false,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_own_update"   on public.profiles for update using (auth.uid() = id);
create policy "profiles_own_insert"   on public.profiles for insert with check (auth.uid() = id);

-- Auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, username, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. QUINIELAS (cada usuario puede tener varias)
create table if not exists public.quinielas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Mi Quiniela',
  is_locked   boolean default false,
  locked_at   timestamptz,
  created_at  timestamptz default now()
);
alter table public.quinielas enable row level security;
create policy "quinielas_public_read" on public.quinielas for select using (true);
create policy "quinielas_own_insert"  on public.quinielas for insert with check (auth.uid() = user_id);
create policy "quinielas_own_update"  on public.quinielas for update using (auth.uid() = user_id and is_locked = false);
create policy "quinielas_own_delete"  on public.quinielas for delete using (auth.uid() = user_id and is_locked = false);

-- 3. PICKS (picks de partidos por quiniela)
create table if not exists public.picks (
  id           uuid primary key default gen_random_uuid(),
  quiniela_id  uuid not null references public.quinielas(id) on delete cascade,
  match_id     text not null,          -- 'A1','M73','M104', etc.
  goals_home   integer,
  goals_away   integer,
  winner       text,                   -- equipo que avanza (eliminatorias)
  h_team       text,                   -- equipo real en slot local al momento del pick
  a_team       text,                   -- equipo real en slot visitante
  updated_at   timestamptz default now(),
  unique(quiniela_id, match_id)
);
alter table public.picks enable row level security;
create policy "picks_public_read"  on public.picks for select using (true);
create policy "picks_own_write"    on public.picks for all using (
  auth.uid() = (select user_id from public.quinielas where id = quiniela_id)
  and (select is_locked from public.quinielas where id = quiniela_id) = false
);

-- 4. MATCH RESULTS (resultados reales — los carga la API + Admin)
create table if not exists public.match_results (
  match_id    text primary key,
  goals_home  integer,
  goals_away  integer,
  winner      text,                    -- quién avanzó (en eliminatorias con empate)
  status      text default 'pending',  -- pending | live | finished
  api_id      integer,                 -- ID del partido en football-data.org
  updated_at  timestamptz default now()
);
alter table public.match_results enable row level security;
create policy "results_public_read"   on public.match_results for select using (true);
create policy "results_admin_write"   on public.match_results for all using (
  exists(select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
-- También permite escritura desde la función serverless (service_role)

-- 5. SCORES (puntos calculados — cache para performance con 100+ usuarios)
create table if not exists public.scores (
  quiniela_id   uuid primary key references public.quinielas(id) on delete cascade,
  grp_pts       integer default 0,
  clasif_pts    integer default 0,
  elim_pts      integer default 0,
  final_pts     integer default 0,
  total_pts     integer default 0,
  updated_at    timestamptz default now()
);
alter table public.scores enable row level security;
create policy "scores_public_read" on public.scores for select using (true);
create policy "scores_admin_write" on public.scores for all using (
  exists(select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 6. LOCK CONFIG (fecha de cierre de quinielas)
create table if not exists public.config (
  key    text primary key,
  value  text
);
insert into public.config(key, value) values
  ('lock_date', '2026-06-11T18:00:00Z'),  -- 1er partido del Mundial
  ('world_cup_year', '2026'),
  ('api_enabled', 'true')
on conflict(key) do nothing;
alter table public.config enable row level security;
create policy "config_public_read" on public.config for select using (true);
create policy "config_admin_write" on public.config for all using (
  exists(select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 7. REALTIME — habilitar para tabla de posiciones en vivo
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.match_results;
alter publication supabase_realtime add table public.quinielas;

-- 8. ÍNDICES para performance con 100+ usuarios
create index if not exists idx_picks_quiniela    on public.picks(quiniela_id);
create index if not exists idx_picks_match       on public.picks(match_id);
create index if not exists idx_quinielas_user    on public.quinielas(user_id);
create index if not exists idx_scores_total      on public.scores(total_pts desc);
