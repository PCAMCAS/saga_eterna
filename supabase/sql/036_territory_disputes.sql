-- Saga Eterna - Disputas de territorios PvP

alter table public.territories
add column if not exists is_disputed boolean not null default false;

create table if not exists public.territory_disputes (
  id uuid primary key default gen_random_uuid(),

  territory_id uuid not null references public.territories(id) on delete cascade,
  attacker_kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  defender_kingdom_id uuid not null references public.kingdoms(id) on delete cascade,

  status text not null default 'OPEN',

  attacker_soldiers integer not null default 0,
  defender_soldiers_at_open integer not null default 0,

  opened_day integer not null,
  resolved_day integer,
  winner_kingdom_id uuid references public.kingdoms(id) on delete set null,

  created_at timestamptz not null default now(),
  resolved_at timestamptz,

  constraint territory_disputes_status_check
    check (status in ('OPEN', 'RESOLVED', 'CANCELLED')),

  constraint territory_disputes_attacker_soldiers_check
    check (attacker_soldiers >= 0),

  constraint territory_disputes_defender_soldiers_check
    check (defender_soldiers_at_open >= 0)
);

create index if not exists territory_disputes_territory_id_idx
on public.territory_disputes(territory_id);

create index if not exists territory_disputes_status_idx
on public.territory_disputes(status);

create index if not exists territory_disputes_attacker_kingdom_id_idx
on public.territory_disputes(attacker_kingdom_id);

create index if not exists territory_disputes_defender_kingdom_id_idx
on public.territory_disputes(defender_kingdom_id);

alter table public.territory_disputes enable row level security;

drop policy if exists "Authenticated read territory disputes" on public.territory_disputes;

create policy "Authenticated read territory disputes"
on public.territory_disputes
for select
to authenticated
using (true);

alter table public.global_logs
drop constraint if exists global_logs_type_check;

alter table public.global_logs
add constraint global_logs_type_check
check (
  type in (
    'SYSTEM',
    'SCOUT',
    'REINFORCE',
    'ATTACK',
    'MOVE',
    'CONQUEST',
    'DISPUTE'
  )
);

select 'Sistema de disputas creado correctamente.' as result;
