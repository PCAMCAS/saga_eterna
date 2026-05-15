-- Saga Eterna - Mantenimiento diario de soldados regulares
-- Cada soldado regular consume 1 comida/día.
-- Se paga desde las capitales del reino.
-- Si no hay comida suficiente, los soldados sin alimento abandonan/mueren por falta de suministros.

create or replace function public.process_soldier_food_upkeep(
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
  v_total_soldiers integer;
  v_capital_food integer;
  v_fed integer;
  v_losses integer;
  v_remaining_to_charge integer;
  v_remaining_losses integer;
  v_capital record;
  v_territory record;
  v_removed integer;
  v_user_id uuid;

  v_total_fed integer := 0;
  v_total_losses integer := 0;
begin
  for v_kingdom in
    select id, name
    from public.kingdoms
    order by name
  loop
    select coalesce(sum(coalesce(t.soldiers, 0)), 0)::integer
    into v_total_soldiers
    from public.territories t
    where t.owner_kingdom_id = v_kingdom.id;

    if v_total_soldiers <= 0 then
      continue;
    end if;

    select coalesce(sum(coalesce(e.food, 0)), 0)::integer
    into v_capital_food
    from public.territories t
    join public.territory_economy e on e.territory_id = t.id
    where t.owner_kingdom_id = v_kingdom.id
      and t.type = 'CAPITAL';

    v_fed := least(v_total_soldiers, v_capital_food);
    v_losses := greatest(v_total_soldiers - v_fed, 0);

    -- Consumir comida de capitales.
    v_remaining_to_charge := v_fed;

    for v_capital in
      select t.id, t.name, e.food
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
        food = food - least(v_capital.food, v_remaining_to_charge),
        updated_at = now()
      where territory_id = v_capital.id;

      v_remaining_to_charge := v_remaining_to_charge - least(v_capital.food, v_remaining_to_charge);
    end loop;

    v_total_fed := v_total_fed + v_fed;

    if v_losses > 0 then
      v_remaining_losses := v_losses;

      -- Las pérdidas empiezan por ciudades, luego capitales, donde haya más soldados.
      for v_territory in
        select id, name, type, soldiers
        from public.territories
        where owner_kingdom_id = v_kingdom.id
          and coalesce(soldiers, 0) > 0
        order by
          case when type = 'CAPITAL' then 1 else 0 end,
          soldiers desc,
          name
        for update
      loop
        exit when v_remaining_losses <= 0;

        v_removed := least(v_territory.soldiers, v_remaining_losses);

        update public.territories
        set
          soldiers = soldiers - v_removed,
          updated_at = now()
        where id = v_territory.id;

        v_remaining_losses := v_remaining_losses - v_removed;
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
        'WARNING',
        v_losses || ' soldados regulares se han perdido por falta de comida.'
      );

      v_total_losses := v_total_losses + v_losses;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'fed', v_total_fed,
    'losses', v_total_losses
  );
end;
$$;

grant execute on function public.process_soldier_food_upkeep(integer, integer, integer)
to authenticated;


-- Reemplazamos process_daily_economy para incluir:
-- 1. Construcciones
-- 2. Entrenamiento
-- 3. Producción
-- 4. Mantenimiento de mercenarios con oro
-- 5. Mantenimiento de soldados con comida

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
  v_training_result jsonb;
  v_mercenary_upkeep_result jsonb;
  v_soldier_food_result jsonb;
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

    insert into public.kingdom_private_logs (
      kingdom_id,
      user_id,
      game_day,
      year,
      type,
      message
    )
    values (
      v_order.kingdom_id,
      v_order.user_id,
      p_day,
      p_year,
      'BUILD',
      'Una construcción ha finalizado en tu territorio.'
    );

    v_completed_orders := v_completed_orders + 1;
  end loop;

  -- Completar entrenamiento pendiente.
  v_training_result := public.process_soldier_training(p_day, p_year, p_tick);

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

  -- Mantenimiento tras producir.
  v_mercenary_upkeep_result := public.process_mercenary_upkeep(p_day, p_year, p_tick);
  v_soldier_food_result := public.process_soldier_food_upkeep(p_day, p_year, p_tick);

  return jsonb_build_object(
    'ok', true,
    'gold_generated', v_gold_generated,
    'food_generated', v_food_generated,
    'completed_orders', v_completed_orders,
    'soldier_training', v_training_result,
    'mercenary_upkeep', v_mercenary_upkeep_result,
    'soldier_food_upkeep', v_soldier_food_result
  );
end;
$$;

grant execute on function public.process_daily_economy(integer, integer, integer)
to authenticated;

select 'Mantenimiento de soldados con comida activado correctamente.' as result;
