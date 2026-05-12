-- Saga Eterna - Movimientos de tropas en tránsito
-- Registra refuerzos/ataques que viajan durante varios días.

create table if not exists public.troop_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  movement_type text not null,
  status text not null default 'IN_TRANSIT',

  source_territory_id uuid not null references public.territories(id) on delete cascade,
  target_territory_id uuid not null references public.territories(id) on delete cascade,

  soldiers integer not null check (soldiers > 0),
  route_hours integer not null default 24,
  departure_day integer not null,
  arrival_day integer not null,

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.troop_movements
drop constraint if exists troop_movements_movement_type_check;

alter table public.troop_movements
add constraint troop_movements_movement_type_check
check (movement_type in ('REINFORCE', 'ATTACK'));

alter table public.troop_movements
drop constraint if exists troop_movements_status_check;

alter table public.troop_movements
add constraint troop_movements_status_check
check (status in ('IN_TRANSIT', 'RESOLVED', 'CANCELLED'));

create index if not exists troop_movements_user_id_idx
on public.troop_movements(user_id);

create index if not exists troop_movements_kingdom_id_idx
on public.troop_movements(kingdom_id);

create index if not exists troop_movements_status_idx
on public.troop_movements(status);

create index if not exists troop_movements_arrival_day_idx
on public.troop_movements(arrival_day);

alter table public.troop_movements enable row level security;

drop policy if exists "Users can read own troop movements" on public.troop_movements;
drop policy if exists "Users can insert own troop movements" on public.troop_movements;

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

select 'Tabla troop_movements creada correctamente.' as result;
