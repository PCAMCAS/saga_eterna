-- Saga Eterna - Edificios hasta nivel 10 en capitales
-- Capitales: edificios hasta nivel 10.
-- Ciudades: edificio de oro hasta nivel 3.
-- Comida y cuartel siguen siendo solo capitales.

alter table public.territory_economy
drop constraint if exists territory_economy_gold_level_check;

alter table public.territory_economy
drop constraint if exists territory_economy_food_level_check;

alter table public.territory_economy
drop constraint if exists territory_economy_barracks_level_check;

alter table public.territory_economy
add constraint territory_economy_gold_level_check
check (gold_building_level between 0 and 10);

alter table public.territory_economy
add constraint territory_economy_food_level_check
check (food_building_level between 0 and 10);

alter table public.territory_economy
add constraint territory_economy_barracks_level_check
check (barracks_level between 0 and 10);


alter table public.building_orders
drop constraint if exists building_orders_target_level_check;

alter table public.building_orders
add constraint building_orders_target_level_check
check (target_level between 1 and 10);


create or replace function public.building_upgrade_cost(
  p_building_type text,
  p_target_level integer
)
returns integer
language sql
immutable
as $$
  select case
    when p_building_type in ('GOLD', 'FOOD')
      and p_target_level between 1 and 10
      then (array[
        150,
        300,
        600,
        1000,
        1600,
        2500,
        3800,
        5500,
        8000,
        12000
      ])[p_target_level]

    when p_building_type = 'BARRACKS'
      and p_target_level between 1 and 10
      then (array[
        200,
        400,
        800,
        1400,
        2200,
        3500,
        5200,
        7500,
        11000,
        16000
      ])[p_target_level]

    else 999999
  end;
$$;


create or replace function public.gold_income_for_level(p_level integer)
returns integer
language sql
immutable
as $$
  select case
    when p_level between 1 and 10
      then (array[
        25,
        50,
        100,
        150,
        225,
        325,
        450,
        600,
        800,
        1000
      ])[p_level]
    else 0
  end;
$$;


create or replace function public.food_income_for_level(p_level integer)
returns integer
language sql
immutable
as $$
  select case
    when p_level between 1 and 10
      then (array[
        25,
        75,
        150,
        250,
        400,
        600,
        850,
        1150,
        1500,
        2000
      ])[p_level]
    else 0
  end;
$$;


create or replace function public.barracks_training_capacity(p_level integer)
returns integer
language sql
immutable
as $$
  select case
    when p_level between 1 and 10
      then (array[
        10,
        25,
        50,
        80,
        120,
        175,
        250,
        350,
        500,
        750
      ])[p_level]
    else 0
  end;
$$;


create or replace function public.soldier_training_unit_cost(p_barracks_level integer)
returns integer
language sql
immutable
as $$
  select case
    when p_barracks_level >= 10 then 3
    when p_barracks_level >= 7 then 4
    else 5
  end;
$$;


create or replace function public.order_building_upgrade(
  p_territory_id uuid,
  p_building_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_kingdom_id uuid;

  v_current_day integer;
  v_current_year integer;
  v_current_tick integer;

  v_territory record;
  v_economy record;

  v_current_level integer;
  v_target_level integer;
  v_max_level integer;
  v_cost integer;

  v_completion_date jsonb;
  v_completes_day integer;
  v_completes_year integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes iniciar sesión.'
    );
  end if;

  p_building_type := upper(trim(coalesce(p_building_type, '')));

  if p_building_type not in ('GOLD', 'FOOD', 'BARRACKS') then
    return jsonb_build_object(
      'ok', false,
      'message', 'Tipo de edificio no válido.'
    );
  end if;

  select kingdom_id
  into v_kingdom_id
  from public.profiles
  where id = v_user_id;

  if v_kingdom_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes elegir un reino antes de construir.'
    );
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, owner_kingdom_id, is_disputed
  into v_territory
  from public.territories
  where id = p_territory_id
  for update;

  if v_territory.id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Territorio no encontrado.'
    );
  end if;

  if v_territory.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes construir en territorios de tu reino.'
    );
  end if;

  if v_territory.type = 'STATION' then
    return jsonb_build_object(
      'ok', false,
      'message', 'No puedes construir en nodos de viaje.'
    );
  end if;

  if p_building_type in ('FOOD', 'BARRACKS') and v_territory.type <> 'CAPITAL' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Ese edificio solo puede construirse en capitales.'
    );
  end if;

  v_max_level := case
    when v_territory.type = 'CAPITAL' then 10
    else 3
  end;

  insert into public.territory_economy (territory_id)
  values (v_territory.id)
  on conflict (territory_id) do nothing;

  select *
  into v_economy
  from public.territory_economy
  where territory_id = v_territory.id
  for update;

  if exists (
    select 1
    from public.building_orders
    where territory_id = v_territory.id
      and building_type = p_building_type
      and status = 'PENDING'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Ya hay una mejora pendiente para ese edificio.'
    );
  end if;

  v_current_level := case
    when p_building_type = 'GOLD' then v_economy.gold_building_level
    when p_building_type = 'FOOD' then v_economy.food_building_level
    when p_building_type = 'BARRACKS' then v_economy.barracks_level
    else 0
  end;

  if v_current_level >= v_max_level then
    return jsonb_build_object(
      'ok', false,
      'message', 'Ese edificio ya está al nivel máximo para este territorio.'
    );
  end if;

  v_target_level := v_current_level + 1;
  v_cost := public.building_upgrade_cost(p_building_type, v_target_level);

  if v_economy.gold < v_cost then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay oro suficiente en ' || v_territory.name || '. Necesitas ' || v_cost || ' oro.'
    );
  end if;

  update public.territory_economy
  set
    gold = gold - v_cost,
    updated_at = now()
  where territory_id = v_territory.id;

  v_completion_date := public.add_days_to_world_date(
    v_current_year,
    v_current_day,
    1
  );

  v_completes_year := (v_completion_date ->> 'year')::integer;
  v_completes_day := (v_completion_date ->> 'day')::integer;

  insert into public.building_orders (
    user_id,
    kingdom_id,
    territory_id,
    building_type,
    target_level,
    cost_gold,
    ordered_day,
    ordered_year,
    ordered_tick,
    completes_day,
    completes_year,
    completes_tick
  )
  values (
    v_user_id,
    v_kingdom_id,
    v_territory.id,
    p_building_type,
    v_target_level,
    v_cost,
    v_current_day,
    v_current_year,
    v_current_tick,
    v_completes_day,
    v_completes_year,
    v_current_tick + 1
  );

  insert into public.player_actions (
    user_id,
    kingdom_id,
    type,
    game_day,
    target_territory_id,
    soldiers
  )
  values (
    v_user_id,
    v_kingdom_id,
    'BUILD',
    v_current_tick,
    v_territory.id,
    0
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Construcción ordenada en ' || v_territory.name || '. El edificio alcanzará nivel ' || v_target_level || ' el día ' || v_completes_day || ' del año ' || v_completes_year || '.',
    'territory', v_territory.name,
    'building_type', p_building_type,
    'target_level', v_target_level,
    'max_level', v_max_level,
    'cost_gold', v_cost
  );
end;
$$;

grant execute on function public.order_building_upgrade(uuid, text)
to authenticated;


create or replace function public.order_soldier_training(
  p_capital_id uuid,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_kingdom_id uuid;

  v_current_day integer;
  v_current_year integer;
  v_current_tick integer;

  v_capital record;
  v_economy record;

  v_amount integer;
  v_capacity integer;
  v_unit_cost integer;
  v_cost integer;

  v_completion_date jsonb;
  v_completes_day integer;
  v_completes_year integer;
begin
  v_user_id := auth.uid();
  v_amount := greatest(coalesce(p_amount, 0), 0);

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes iniciar sesión para entrenar soldados.'
    );
  end if;

  if p_capital_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes seleccionar una capital.'
    );
  end if;

  if v_amount <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'La cantidad de soldados debe ser mayor que 0.'
    );
  end if;

  select kingdom_id
  into v_kingdom_id
  from public.profiles
  where id = v_user_id;

  if v_kingdom_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes elegir un reino antes de entrenar soldados.'
    );
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, owner_kingdom_id, is_disputed
  into v_capital
  from public.territories
  where id = p_capital_id
  for update;

  if v_capital.id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Capital no encontrada.'
    );
  end if;

  if v_capital.type <> 'CAPITAL' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Los soldados regulares solo pueden entrenarse en capitales.'
    );
  end if;

  if v_capital.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes entrenar soldados en tu propia capital.'
    );
  end if;

  insert into public.territory_economy (territory_id)
  values (v_capital.id)
  on conflict (territory_id) do nothing;

  select *
  into v_economy
  from public.territory_economy
  where territory_id = v_capital.id
  for update;

  v_capacity := public.barracks_training_capacity(coalesce(v_economy.barracks_level, 0));
  v_unit_cost := public.soldier_training_unit_cost(coalesce(v_economy.barracks_level, 0));

  if v_capacity <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Necesitas construir un cuartel antes de entrenar soldados regulares.'
    );
  end if;

  if exists (
    select 1
    from public.soldier_training_orders
    where territory_id = v_capital.id
      and status = 'PENDING'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Ya hay una orden de entrenamiento pendiente en esta capital.'
    );
  end if;

  if v_amount > v_capacity then
    return jsonb_build_object(
      'ok', false,
      'message', 'El cuartel solo puede entrenar ' || v_capacity || ' soldados por día.'
    );
  end if;

  v_cost := v_amount * v_unit_cost;

  if v_economy.gold < v_cost then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay oro suficiente en ' || v_capital.name || '. Necesitas ' || v_cost || ' oro.'
    );
  end if;

  update public.territory_economy
  set
    gold = gold - v_cost,
    updated_at = now()
  where territory_id = v_capital.id;

  v_completion_date := public.add_days_to_world_date(
    v_current_year,
    v_current_day,
    1
  );

  v_completes_year := (v_completion_date ->> 'year')::integer;
  v_completes_day := (v_completion_date ->> 'day')::integer;

  insert into public.soldier_training_orders (
    user_id,
    kingdom_id,
    territory_id,
    soldiers,
    cost_gold,
    ordered_day,
    ordered_year,
    ordered_tick,
    completes_day,
    completes_year,
    completes_tick
  )
  values (
    v_user_id,
    v_kingdom_id,
    v_capital.id,
    v_amount,
    v_cost,
    v_current_day,
    v_current_year,
    v_current_tick,
    v_completes_day,
    v_completes_year,
    v_current_tick + 1
  );

  insert into public.player_actions (
    user_id,
    kingdom_id,
    type,
    game_day,
    target_territory_id,
    soldiers
  )
  values (
    v_user_id,
    v_kingdom_id,
    'TRAIN_SOLDIERS',
    v_current_tick,
    v_capital.id,
    v_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Orden emitida: ' || v_amount || ' soldados regulares empezarán su entrenamiento en ' ||
      v_capital.name || '. Coste: ' || v_cost || ' oro. Estarán disponibles el día ' ||
      v_completes_day || ' del año ' || v_completes_year || '.',
    'capital', v_capital.name,
    'soldiers', v_amount,
    'unit_cost', v_unit_cost,
    'cost_gold', v_cost,
    'completes_day', v_completes_day,
    'completes_year', v_completes_year
  );
end;
$$;

grant execute on function public.order_soldier_training(uuid, integer)
to authenticated;

select 'Capitales con edificios hasta nivel 10 activadas correctamente.' as result;
