-- Saga Eterna - Reset limpio de campaña
-- Estado inicial para producción:
-- Año 725 d.C.
-- Día real del año actual
-- Capitales con 10 soldados
-- Ciudades y nodos con 0 soldados
-- Sin movimientos, disputas, informes ni registros de prueba

create or replace function public.is_leap_year(p_year integer)
returns boolean
language sql
immutable
as $$
  select (
    (p_year % 4 = 0 and p_year % 100 <> 0)
    or p_year % 400 = 0
  );
$$;

create or replace function public.days_in_game_year(p_year integer)
returns integer
language sql
immutable
as $$
  select case
    when public.is_leap_year(p_year) then 366
    else 365
  end;
$$;

create or replace function public.real_day_of_year()
returns integer
language sql
stable
as $$
  select extract(doy from timezone('Europe/Madrid', now()))::integer;
$$;

alter table public.game_state
add column if not exists current_tick integer not null default 1;

-- Limpiar datos dinámicos de campaña.
delete from public.troop_movements;
delete from public.territory_dispute_attackers;
delete from public.territory_disputes;
delete from public.scout_reports;
delete from public.player_actions;
delete from public.global_logs;

-- Resetear territorios.
update public.territories
set
  soldiers = case
    when type = 'CAPITAL' then 10
    else 0
  end,
  is_disputed = false,
  updated_at = now();

-- Resetear calendario.
update public.game_state
set
  current_year = 725,
  current_day = public.real_day_of_year(),
  current_tick = public.real_day_of_year(),
  updated_at = now();

insert into public.global_logs (
  game_day,
  year,
  message,
  type
)
values (
  public.real_day_of_year(),
  725,
  'El mundo despierta en el año 725 d.C. Las capitales conservan una pequeña guarnición inicial.',
  'SYSTEM'
);

select
  current_year,
  current_day,
  current_tick,
  public.days_in_game_year(current_year) as days_this_year
from public.game_state
limit 1;

select
  type,
  count(*) as territories,
  sum(soldiers) as total_soldiers
from public.territories
group by type
order by type;
