-- Saga Eterna - Reconstrucción limpia de troop_movements
-- Elimina estructura legacy y crea la tabla definitiva de movimientos.

drop table if exists public.troop_movements cascade;

create table public.troop_movements (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,

  movement_type text not null,
  status text not null default 'IN_TRANSIT',

  source_territory_id uuid not null references public.territories(id) on delete cascade,
  target_territory_id uuid not null references public.territories(id) on delete cascade,

  soldiers integer not null,
  route_hours integer not null default 24,

  departure_day integer not null,
  arrival_day integer not null,

  created_at timestamptz not null default now(),
  resolved_at timestamptz,

  constraint troop_movements_movement_type_check
    check (movement_type in ('REINFORCE', 'ATTACK')),

  constraint troop_movements_status_check
    check (status in ('IN_TRANSIT', 'RESOLVED', 'CANCELLED')),

  constraint troop_movements_soldiers_check
    check (soldiers > 0),

  constraint troop_movements_route_hours_check
    check (route_hours > 0),

  constraint troop_movements_departure_day_check
    check (departure_day >= 1),

  constraint troop_movements_arrival_day_check
    check (arrival_day >= departure_day)
);

create index troop_movements_user_id_idx
on public.troop_movements(user_id);

create index troop_movements_kingdom_id_idx
on public.troop_movements(kingdom_id);

create index troop_movements_status_idx
on public.troop_movements(status);

create index troop_movements_movement_type_idx
on public.troop_movements(movement_type);

create index troop_movements_arrival_day_idx
on public.troop_movements(arrival_day);

create index troop_movements_source_territory_id_idx
on public.troop_movements(source_territory_id);

create index troop_movements_target_territory_id_idx
on public.troop_movements(target_territory_id);

alter table public.troop_movements enable row level security;

create policy "Users can read own troop movements"
on public.troop_movements
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own troop movements"
on public.troop_movements
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own troop movements"
on public.troop_movements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'troop_movements'
order by ordinal_position;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.troop_movements'::regclass
order by conname;
