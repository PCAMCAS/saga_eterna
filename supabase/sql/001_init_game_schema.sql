-- Saga Eterna - esquema inicial sin Prisma

create table if not exists public.kingdoms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#d6a13a',
  capital_territory_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'CITY',
  x numeric not null,
  y numeric not null,
  soldiers integer not null default 0,
  owner_kingdom_id uuid not null references public.kingdoms(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint territories_type_check check (type in ('CAPITAL', 'CITY', 'STATION')),
  constraint territories_soldiers_check check (soldiers >= 0)
);

alter table public.kingdoms
add constraint kingdoms_capital_territory_id_fkey
foreign key (capital_territory_id)
references public.territories(id)
on delete set null;

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  from_territory_id uuid not null references public.territories(id) on delete cascade,
  to_territory_id uuid not null references public.territories(id) on delete cascade,
  travel_hours integer not null default 24,
  created_at timestamptz not null default now(),

  constraint routes_travel_hours_check check (travel_hours > 0),
  constraint routes_unique_direction unique (from_territory_id, to_territory_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  kingdom_id uuid references public.kingdoms(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.troop_movements (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  origin_territory_id uuid not null references public.territories(id) on delete restrict,
  target_territory_id uuid not null references public.territories(id) on delete restrict,
  soldiers integer not null,
  type text not null,
  status text not null default 'TRAVELING',
  departure_at timestamptz not null default now(),
  arrival_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint troop_movements_soldiers_check check (soldiers > 0),
  constraint troop_movements_type_check check (type in ('REINFORCEMENT', 'ATTACK')),
  constraint troop_movements_status_check check (status in ('TRAVELING', 'RESOLVED', 'CANCELLED'))
);

create table if not exists public.player_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  type text not null,
  game_day integer not null,
  origin_territory_id uuid references public.territories(id) on delete restrict,
  target_territory_id uuid not null references public.territories(id) on delete restrict,
  soldiers integer,
  created_at timestamptz not null default now(),

  constraint player_actions_type_check check (type in ('REINFORCE', 'ATTACK', 'SCOUT')),
  constraint player_actions_game_day_check check (game_day > 0),
  constraint player_actions_soldiers_check check (soldiers is null or soldiers > 0),
  constraint player_actions_one_per_type_per_day unique (user_id, type, game_day)
);

create table if not exists public.global_logs (
  id uuid primary key default gen_random_uuid(),
  game_day integer not null,
  year integer not null default 792,
  message text not null,
  type text not null,
  actor_kingdom_id uuid references public.kingdoms(id) on delete set null,
  target_kingdom_id uuid references public.kingdoms(id) on delete set null,
  territory_id uuid references public.territories(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint global_logs_type_check check (type in ('CONQUEST', 'DEFENSE', 'SCOUT', 'REINFORCEMENT', 'SYSTEM'))
);

create table if not exists public.game_state (
  id uuid primary key default gen_random_uuid(),
  current_day integer not null default 1,
  current_year integer not null default 792,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.game_state (current_day, current_year)
select 1, 792
where not exists (select 1 from public.game_state);

-- Datos mínimos de prueba

insert into public.kingdoms (name, description, color)
values
  ('Reino de Inglaterra', 'Reino inicial de prueba.', '#9f1239'),
  ('Reino de Francia', 'Reino inicial de prueba.', '#1d4ed8')
on conflict (name) do nothing;

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Wessex', 'CAPITAL', 42, 38, 5120, k.id
from public.kingdoms k
where k.name = 'Reino de Inglaterra'
on conflict (name) do nothing;

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'París', 'CAPITAL', 50, 52, 4300, k.id
from public.kingdoms k
where k.name = 'Reino de Francia'
on conflict (name) do nothing;

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Reino de Inglaterra'
and t.name = 'Wessex'
and k.capital_territory_id is null;

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Reino de Francia'
and t.name = 'París'
and k.capital_territory_id is null;

insert into public.global_logs (game_day, year, message, type)
values
  (1, 792, 'Saga Eterna ha comenzado.', 'SYSTEM')
on conflict do nothing;
