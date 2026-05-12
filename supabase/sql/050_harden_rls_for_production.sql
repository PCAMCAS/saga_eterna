-- Saga Eterna - Seguridad RLS para producción
-- Endurece permisos para evitar escrituras directas desde cliente.

-- =========================================================
-- KINGDOMS
-- =========================================================

alter table public.kingdoms enable row level security;

drop policy if exists "Public read kingdoms" on public.kingdoms;
drop policy if exists "Authenticated read kingdoms" on public.kingdoms;

create policy "Public read kingdoms"
on public.kingdoms
for select
to anon, authenticated
using (true);


-- =========================================================
-- TERRITORIES
-- =========================================================

alter table public.territories enable row level security;

drop policy if exists "Public read territories" on public.territories;
drop policy if exists "Authenticated read territories" on public.territories;
drop policy if exists "Authenticated update territories" on public.territories;
drop policy if exists "Users can update territories" on public.territories;
drop policy if exists "Users can insert territories" on public.territories;
drop policy if exists "Users can delete territories" on public.territories;

create policy "Public read territories"
on public.territories
for select
to anon, authenticated
using (true);

-- No se crean policies de insert/update/delete:
-- los cambios pasan solo por funciones security definer.


-- =========================================================
-- ROUTES
-- =========================================================

alter table public.routes enable row level security;

drop policy if exists "Public read routes" on public.routes;
drop policy if exists "Authenticated read routes" on public.routes;
drop policy if exists "Authenticated update routes" on public.routes;
drop policy if exists "Users can insert routes" on public.routes;
drop policy if exists "Users can update routes" on public.routes;
drop policy if exists "Users can delete routes" on public.routes;

create policy "Public read routes"
on public.routes
for select
to anon, authenticated
using (true);


-- =========================================================
-- GAME STATE
-- =========================================================

alter table public.game_state enable row level security;

drop policy if exists "Public read game state" on public.game_state;
drop policy if exists "Authenticated read game state" on public.game_state;
drop policy if exists "Authenticated update game state" on public.game_state;
drop policy if exists "Users can update game state" on public.game_state;

create policy "Public read game state"
on public.game_state
for select
to anon, authenticated
using (true);

-- No update directo. advance_game_day lo hace por RPC.


-- =========================================================
-- PROFILES
-- =========================================================

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Authenticated read profiles" on public.profiles;

create policy "Users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own empty kingdom profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- =========================================================
-- PLAYER ACTIONS
-- =========================================================

alter table public.player_actions enable row level security;

drop policy if exists "Users can read own player actions" on public.player_actions;
drop policy if exists "Users can insert own player actions" on public.player_actions;
drop policy if exists "Authenticated read player actions" on public.player_actions;
drop policy if exists "Authenticated insert player actions" on public.player_actions;

create policy "Users can read own player actions"
on public.player_actions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own player actions"
on public.player_actions
for insert
to authenticated
with check (auth.uid() = user_id);


-- =========================================================
-- TROOP MOVEMENTS
-- =========================================================

alter table public.troop_movements enable row level security;

drop policy if exists "Users can read own troop movements" on public.troop_movements;
drop policy if exists "Users can insert own troop movements" on public.troop_movements;
drop policy if exists "Users can update own troop movements" on public.troop_movements;
drop policy if exists "Users can read kingdom troop movements" on public.troop_movements;
drop policy if exists "Users can insert own kingdom troop movements" on public.troop_movements;
drop policy if exists "Users can update own kingdom troop movements" on public.troop_movements;

create policy "Users can read kingdom troop movements"
on public.troop_movements
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
);

create policy "Users can insert own kingdom troop movements"
on public.troop_movements
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
);

-- No update directo para jugadores. Las resoluciones las hacen RPCs.


-- =========================================================
-- SCOUT REPORTS
-- =========================================================

alter table public.scout_reports enable row level security;

drop policy if exists "Users can read own scout reports" on public.scout_reports;
drop policy if exists "Users can insert own scout reports" on public.scout_reports;
drop policy if exists "Authenticated read scout reports" on public.scout_reports;

create policy "Users can read own scout reports"
on public.scout_reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own scout reports"
on public.scout_reports
for insert
to authenticated
with check (auth.uid() = user_id);


-- =========================================================
-- TERRITORY DISPUTES
-- =========================================================

alter table public.territory_disputes enable row level security;

drop policy if exists "Authenticated read territory disputes" on public.territory_disputes;
drop policy if exists "Users can read participating territory disputes" on public.territory_disputes;

create policy "Users can read participating territory disputes"
on public.territory_disputes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.kingdom_id = territory_disputes.defender_kingdom_id
        or p.kingdom_id = territory_disputes.attacker_kingdom_id
        or exists (
          select 1
          from public.territory_dispute_attackers a
          where a.dispute_id = territory_disputes.id
            and a.kingdom_id = p.kingdom_id
        )
      )
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'castiwb@gmail.com'
);


-- =========================================================
-- TERRITORY DISPUTE ATTACKERS
-- =========================================================

alter table public.territory_dispute_attackers enable row level security;

drop policy if exists "Authenticated read dispute attackers" on public.territory_dispute_attackers;
drop policy if exists "Users can read participating dispute attackers" on public.territory_dispute_attackers;

create policy "Users can read participating dispute attackers"
on public.territory_dispute_attackers
for select
to authenticated
using (
  exists (
    select 1
    from public.territory_disputes d
    join public.profiles p on p.id = auth.uid()
    where d.id = territory_dispute_attackers.dispute_id
      and (
        p.kingdom_id = d.defender_kingdom_id
        or p.kingdom_id = d.attacker_kingdom_id
        or exists (
          select 1
          from public.territory_dispute_attackers a2
          where a2.dispute_id = d.id
            and a2.kingdom_id = p.kingdom_id
        )
      )
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'castiwb@gmail.com'
);


-- =========================================================
-- GLOBAL LOGS
-- =========================================================

alter table public.global_logs enable row level security;

drop policy if exists "Public read global logs" on public.global_logs;
drop policy if exists "Authenticated read global logs" on public.global_logs;
drop policy if exists "Authenticated insert global logs" on public.global_logs;

create policy "Public read global logs"
on public.global_logs
for select
to anon, authenticated
using (true);

-- No insert directo en producción. Las RPCs escriben global_logs.


-- =========================================================
-- COMPROBACIÓN
-- =========================================================

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'kingdoms',
    'territories',
    'routes',
    'game_state',
    'profiles',
    'player_actions',
    'troop_movements',
    'scout_reports',
    'territory_disputes',
    'territory_dispute_attackers',
    'global_logs'
  )
order by tablename, policyname;
