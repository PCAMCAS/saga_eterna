-- Saga Eterna - Reset limpio de campaña
-- Estado inicial para producción:
-- Año 725 d.C.
-- Día real del año actual
-- Territorios devueltos a su dueño original
-- Capitales con 10 soldados regulares
-- Ciudades y nodos con 0 soldados
-- Mercenarios a 0
-- Economía, edificios, entrenamientos, movimientos, disputas e informes limpiados

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

alter table public.game_state
add column if not exists last_advanced_real_date date;

alter table public.territories
add column if not exists mercenaries integer not null default 0;

alter table public.territories
add column if not exists original_owner_kingdom_id uuid references public.kingdoms(id) on delete set null;

-- Guardar dueño original solo si aún no está fijado.
-- Importante: esta columna debe representar el reparto inicial correcto.
update public.territories
set original_owner_kingdom_id = owner_kingdom_id
where original_owner_kingdom_id is null
  and type <> 'STATION';

-- Correcciones explícitas de dueño original.
update public.territories
set original_owner_kingdom_id = (
  select id from public.kingdoms where name = 'Sultanato de Saladino'
)
where name in ('Damasco', 'Hama');

-- Limpiar datos dinámicos de campaña.
delete from public.troop_movements;
delete from public.territory_dispute_attackers;
delete from public.territory_disputes;
delete from public.scout_reports;
delete from public.player_actions;
delete from public.global_logs;

-- Limpiar economía nueva.
delete from public.building_orders;
delete from public.soldier_training_orders;
delete from public.kingdom_private_logs;

-- Devolver territorios conquistables a su dueño original.
update public.territories
set
  owner_kingdom_id = original_owner_kingdom_id,
  soldiers = case
    when type = 'CAPITAL' then 10
    else 0
  end,
  mercenaries = 0,
  is_disputed = false,
  updated_at = now()
where type <> 'STATION';

-- Resetear nodos de viaje.
update public.territories
set
  owner_kingdom_id = null,
  soldiers = 0,
  mercenaries = 0,
  is_disputed = false,
  updated_at = now()
where type = 'STATION';

-- Resetear economía por territorio.
insert into public.territory_economy (territory_id)
select id
from public.territories
on conflict (territory_id) do nothing;

update public.territory_economy
set
  gold = 0,
  food = 0,
  gold_building_level = 0,
  food_building_level = 0,
  barracks_level = 0,
  updated_at = now();

-- Resetear calendario.
update public.game_state
set
  current_year = 725,
  current_day = public.real_day_of_year(),
  current_tick = public.real_day_of_year(),
  last_advanced_real_date = null,
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
  'El mundo despierta en el año 725 d.C. Cada reino conserva sus dominios originales. Las capitales mantienen una pequeña guarnición inicial.',
  'SYSTEM'
);

select
  current_year,
  current_day,
  current_tick,
  last_advanced_real_date,
  public.days_in_game_year(current_year) as days_this_year
from public.game_state
limit 1;

select
  t.type,
  count(*) as territories,
  sum(t.soldiers) as total_soldiers,
  sum(t.mercenaries) as total_mercenaries
from public.territories t
group by t.type
order by t.type;

select
  sum(gold) as total_gold,
  sum(food) as total_food,
  sum(gold_building_level) as gold_building_levels,
  sum(food_building_level) as food_building_levels,
  sum(barracks_level) as barracks_levels
from public.territory_economy;

select
  t.name,
  t.type,
  k.name as owner,
  ok.name as original_owner,
  t.soldiers,
  t.mercenaries
from public.territories t
left join public.kingdoms k on k.id = t.owner_kingdom_id
left join public.kingdoms ok on ok.id = t.original_owner_kingdom_id
order by t.type, t.name;
