-- Saga Eterna - Informes privados de exploración
-- Guarda el último dato conocido por el jugador al investigar territorios.

create table if not exists public.scout_reports (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,

  game_day integer not null,
  year integer not null,

  observed_soldiers integer not null default 0,
  territory_owner_kingdom_id uuid references public.kingdoms(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists scout_reports_user_id_idx
on public.scout_reports(user_id);

create index if not exists scout_reports_kingdom_id_idx
on public.scout_reports(kingdom_id);

create index if not exists scout_reports_territory_id_idx
on public.scout_reports(territory_id);

create index if not exists scout_reports_created_at_idx
on public.scout_reports(created_at desc);

alter table public.scout_reports enable row level security;

drop policy if exists "Users can read own scout reports" on public.scout_reports;
drop policy if exists "Users can insert own scout reports" on public.scout_reports;

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

select 'Tabla scout_reports creada correctamente.' as result;
