-- Saga Eterna - Mantenimiento diario de mercenarios
-- Cada mercenario cuesta 1 oro/día.
-- Se paga desde la capital del reino.
-- Si no hay oro suficiente, los mercenarios impagados desertan.
-- La notificación queda en un registro privado del reino.

create table if not exists public.kingdom_private_logs (
  id uuid primary key default gen_random_uuid(),

  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  game_day integer not null,
  year integer not null,

  type text not null,
  message text not null,

  created_at timestamptz not null default now(),

  constraint kingdom_private_logs_type_check
    check (type in ('SYSTEM', 'ECONOMY', 'MERCENARIES', 'BUILD', 'TRAINING', 'WARNING'))
);

create index if not exists kingdom_private_logs_kingdom_id_idx
on public.kingdom_private_logs(kingdom_id);

create index if not exists kingdom_private_logs_created_at_idx
on public.kingdom_private_logs(created_at desc);

alter table public.kingdom_private_logs enable row level security;

drop policy if exists "Users can read own kingdom private logs" on public.kingdom_private_logs;

create policy "Users can read own kingdom private logs"
on public.kingdom_private_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = kingdom_private_logs.kingdom_id
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'castiwb@gmail.com'
);


create or replace function public.process_mercenary_upkeep(
  p_day integer,
  p_year integer,
  p_tick integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kingdom record;
  v_total_mercenaries integer;
  v_capital_gold integer;
  v_paid integer;
  v_deserters integer;
  v_remaining_to_charge integer;
  v_remaining_deserters integer;
  v_capital record;
  v_territory record;
  v_removed integer;
  v_user_id uuid;

  v_total_paid integer := 0;
  v_total_deserters integer := 0;
begin
  for v_kingdom in
    select id, name
    from public.kingdoms
    order by name
  loop
    select coalesce(sum(coalesce(t.mercenaries, 0)), 0)::integer
    into v_total_mercenaries
    from public.territories t
    where t.owner_kingdom_id = v_kingdom.id;

    if v_total_mercenaries <= 0 then
      continue;
    end if;

    select coalesce(sum(coalesce(e.gold, 0)), 0)::integer
    into v_capital_gold
    from public.territories t
    join public.territory_economy e on e.territory_id = t.id
    where t.owner_kingdom_id = v_kingdom.id
      and t.type = 'CAPITAL';

    v_paid := least(v_total_mercenaries, v_capital_gold);
    v_deserters := greatest(v_total_mercenaries - v_paid, 0);

    -- Cobrar oro de capitales, en orden estable.
    v_remaining_to_charge := v_paid;

    for v_capital in
      select t.id, t.name, e.gold
      from public.territories t
      join public.territory_economy e on e.territory_id = t.id
      where t.owner_kingdom_id = v_kingdom.id
        and t.type = 'CAPITAL'
      order by t.name
      for update
    loop
      exit when v_remaining_to_charge <= 0;

      update public.territory_economy
      set
        gold = gold - least(v_capital.gold, v_remaining_to_charge),
        updated_at = now()
      where territory_id = v_capital.id;

      v_remaining_to_charge := v_remaining_to_charge - least(v_capital.gold, v_remaining_to_charge);
    end loop;

    v_total_paid := v_total_paid + v_paid;

    if v_deserters > 0 then
      v_remaining_deserters := v_deserters;

      -- Desertan primero de ciudades, luego capitales, empezando por donde haya más.
      for v_territory in
        select id, name, type, mercenaries
        from public.territories
        where owner_kingdom_id = v_kingdom.id
          and coalesce(mercenaries, 0) > 0
        order by
          case when type = 'CAPITAL' then 1 else 0 end,
          mercenaries desc,
          name
        for update
      loop
        exit when v_remaining_deserters <= 0;

        v_removed := least(v_territory.mercenaries, v_remaining_deserters);

        update public.territories
        set
          mercenaries = mercenaries - v_removed,
          updated_at = now()
        where id = v_territory.id;

        v_remaining_deserters := v_remaining_deserters - v_removed;
      end loop;

      select id
      into v_user_id
      from public.profiles
      where kingdom_id = v_kingdom.id
      order by created_at asc nulls last
      limit 1;

      insert into public.kingdom_private_logs (
        kingdom_id,
        user_id,
        game_day,
        year,
        type,
        message
      )
      values (
        v_kingdom.id,
        v_user_id,
        p_day,
        p_year,
        'MERCENARIES',
        v_deserters || ' mercenarios contratados han abandonado el ejército ante la falta de pago.'
      );

      v_total_deserters := v_total_deserters + v_deserters;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'paid', v_total_paid,
    'deserters', v_total_deserters
  );
end;
$$;

grant execute on function public.process_mercenary_upkeep(integer, integer, integer)
to authenticated;


-- Reemplazamos process_daily_economy para incluir mantenimiento de mercenarios
-- después de producir oro/comida.
create or replace function public.process_daily_economy(
  p_day integer,
  p_year integer,
  p_tick integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gold_generated integer := 0;
  v_food_generated integer := 0;
  v_completed_orders integer := 0;
  v_order record;
  v_upkeep_result jsonb;
begin
  insert into public.territory_economy (territory_id)
  select id
  from public.territories
  on conflict (territory_id) do nothing;

  -- Completar construcciones pendientes al inicio del nuevo día.
  for v_order in
    select *
    from public.building_orders
    where status = 'PENDING'
      and completes_tick <= p_tick
    order by completes_tick asc, created_at asc
    for update
  loop
    if v_order.building_type = 'GOLD' then
      update public.territory_economy
      set
        gold_building_level = greatest(gold_building_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    elsif v_order.building_type = 'FOOD' then
      update public.territory_economy
      set
        food_building_level = greatest(food_building_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    elsif v_order.building_type = 'BARRACKS' then
      update public.territory_economy
      set
        barracks_level = greatest(barracks_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    end if;

    update public.building_orders
    set
      status = 'COMPLETED',
      completed_at = now()
    where id = v_order.id;

    v_completed_orders := v_completed_orders + 1;
  end loop;

  -- Producción diaria de oro y comida.
  with produced as (
    update public.territory_economy e
    set
      gold = e.gold +
        case
          when t.type = 'CAPITAL' then 100 + public.gold_income_for_level(e.gold_building_level)
          when t.type = 'CITY' then public.gold_income_for_level(e.gold_building_level)
          else 0
        end,
      food = e.food +
        case
          when t.type = 'CAPITAL' then public.food_income_for_level(e.food_building_level)
          else 0
        end,
      updated_at = now()
    from public.territories t
    where t.id = e.territory_id
      and t.owner_kingdom_id is not null
      and t.type in ('CAPITAL', 'CITY')
    returning
      case
        when t.type = 'CAPITAL' then 100 + public.gold_income_for_level(e.gold_building_level)
        when t.type = 'CITY' then public.gold_income_for_level(e.gold_building_level)
        else 0
      end as gold_gained,
      case
        when t.type = 'CAPITAL' then public.food_income_for_level(e.food_building_level)
        else 0
      end as food_gained
  )
  select
    coalesce(sum(gold_gained), 0),
    coalesce(sum(food_gained), 0)
  into
    v_gold_generated,
    v_food_generated
  from produced;

  -- Mantenimiento de mercenarios tras producir oro.
  v_upkeep_result := public.process_mercenary_upkeep(p_day, p_year, p_tick);

  return jsonb_build_object(
    'ok', true,
    'gold_generated', v_gold_generated,
    'food_generated', v_food_generated,
    'completed_orders', v_completed_orders,
    'mercenary_upkeep', v_upkeep_result
  );
end;
$$;

grant execute on function public.process_daily_economy(integer, integer, integer)
to authenticated;

select 'Mantenimiento de mercenarios activado correctamente.' as result;
