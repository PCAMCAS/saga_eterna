-- Saga Eterna - Separar soldados regulares y mercenarios
-- soldiers = soldados regulares
-- mercenaries = mercenarios
-- fuerza total = soldiers + mercenaries

alter table public.territories
add column if not exists mercenaries integer not null default 0;

alter table public.territories
drop constraint if exists territories_mercenaries_check;

alter table public.territories
add constraint territories_mercenaries_check
check (mercenaries >= 0);


alter table public.troop_movements
add column if not exists mercenaries integer not null default 0;

alter table public.troop_movements
drop constraint if exists troop_movements_mercenaries_check;

alter table public.troop_movements
add constraint troop_movements_mercenaries_check
check (mercenaries >= 0);


alter table public.territory_dispute_attackers
add column if not exists mercenaries integer not null default 0;

alter table public.territory_dispute_attackers
drop constraint if exists territory_dispute_attackers_mercenaries_check;

alter table public.territory_dispute_attackers
add constraint territory_dispute_attackers_mercenaries_check
check (mercenaries >= 0);


-- IMPORTANTE:
-- Si durante pruebas compraste mercenarios con la versión anterior, puede que estén duplicados:
-- soldiers también subió al comprar mercenarios.
-- Si quieres limpiar pruebas, puedes ejecutar manualmente:
--
-- update public.territories
-- set soldiers = greatest(coalesce(soldiers, 0) - coalesce(mercenaries, 0), 0)
-- where mercenaries > 0;
--
-- No lo hacemos automáticamente para evitar tocar datos reales sin querer.


create or replace function public.buy_mercenaries(
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

  v_unit_cost integer;
  v_total_cost integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes iniciar sesión para contratar mercenarios.'
    );
  end if;

  if p_capital_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes seleccionar una capital.'
    );
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'La cantidad de mercenarios debe ser mayor que 0.'
    );
  end if;

  select kingdom_id
  into v_kingdom_id
  from public.profiles
  where id = v_user_id;

  if v_kingdom_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes elegir un reino antes de contratar mercenarios.'
    );
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
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
      'message', 'Los mercenarios solo pueden contratarse en capitales.'
    );
  end if;

  if v_capital.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes contratar mercenarios en tu propia capital.'
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

  v_unit_cost := case
    when coalesce(v_capital.is_disputed, false) then 20
    else 10
  end;

  v_total_cost := p_amount * v_unit_cost;

  if v_economy.gold < v_total_cost then
    return jsonb_build_object(
      'ok', false,
      'message',
        'No hay oro suficiente en ' || v_capital.name ||
        '. Necesitas ' || v_total_cost ||
        ' oro para contratar ' || p_amount || ' mercenarios.'
    );
  end if;

  update public.territory_economy
  set
    gold = gold - v_total_cost,
    updated_at = now()
  where territory_id = v_capital.id;

  -- Aquí está el cambio importante:
  -- Los mercenarios NO se suman a soldiers.
  -- soldiers queda como soldados regulares.
  update public.territories
  set
    mercenaries = coalesce(mercenaries, 0) + p_amount,
    updated_at = now()
  where id = v_capital.id;

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
    'BUY_MERCENARIES',
    coalesce(v_current_tick, v_current_day),
    v_capital.id,
    p_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Has contratado ' || p_amount ||
      ' mercenarios en ' || v_capital.name ||
      ' por ' || v_total_cost || ' oro.' ||
      case
        when coalesce(v_capital.is_disputed, false)
          then ' La capital está en disputa: los mercenarios han exigido paga doble.'
        else ''
      end,
    'capital', v_capital.name,
    'amount', p_amount,
    'unit_cost', v_unit_cost,
    'total_cost', v_total_cost
  );
end;
$$;

grant execute on function public.buy_mercenaries(uuid, integer)
to authenticated;


create or replace function public.reinforce_territory_mixed_atomic(
  p_from_territory_id uuid,
  p_target_territory_id uuid,
  p_soldiers_amount integer default 0,
  p_mercenaries_amount integer default 0
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

  v_from record;
  v_target record;
  v_route record;
  v_open_dispute record;

  v_route_hours integer;
  v_travel_days integer;

  v_arrival_day integer;
  v_arrival_year integer;
  v_arrival_tick integer;
  v_arrival_date jsonb;

  v_soldiers_amount integer;
  v_mercenaries_amount integer;
  v_total_amount integer;

  v_is_normal_reinforce boolean := false;
  v_is_siege_reinforce boolean := false;
begin
  v_user_id := auth.uid();

  v_soldiers_amount := greatest(coalesce(p_soldiers_amount, 0), 0);
  v_mercenaries_amount := greatest(coalesce(p_mercenaries_amount, 0), 0);
  v_total_amount := v_soldiers_amount + v_mercenaries_amount;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes iniciar sesión para reforzar territorios.');
  end if;

  if p_from_territory_id is null or p_target_territory_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes seleccionar origen y destino.');
  end if;

  if p_from_territory_id = p_target_territory_id then
    return jsonb_build_object('ok', false, 'message', 'El origen y el destino no pueden ser el mismo territorio.');
  end if;

  if v_total_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Debes enviar al menos 1 soldado o 1 mercenario.');
  end if;

  select kingdom_id
  into v_kingdom_id
  from public.profiles
  where id = v_user_id;

  if v_kingdom_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes elegir un reino antes de realizar acciones.');
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
  into v_from
  from public.territories
  where id = p_from_territory_id
  for update;

  select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
  into v_target
  from public.territories
  where id = p_target_territory_id
  for update;

  if v_from.id is null or v_target.id is null then
    return jsonb_build_object('ok', false, 'message', 'No se pudieron leer los territorios seleccionados.');
  end if;

  if v_from.type = 'STATION' or v_target.type = 'STATION' then
    return jsonb_build_object('ok', false, 'message', 'No puedes reforzar usando nodos de viaje.');
  end if;

  if v_from.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object('ok', false, 'message', 'Solo puedes enviar tropas desde territorios de tu propio reino.');
  end if;

  if v_soldiers_amount > coalesce(v_from.soldiers, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes soldados regulares en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.soldiers, 0) || '.'
    );
  end if;

  if v_mercenaries_amount > coalesce(v_from.mercenaries, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes mercenarios en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.mercenaries, 0) || '.'
    );
  end if;

  select *
  into v_open_dispute
  from public.territory_disputes
  where territory_id = v_target.id
    and status = 'OPEN'
  limit 1
  for update;

  v_is_normal_reinforce := v_target.owner_kingdom_id = v_kingdom_id;

  v_is_siege_reinforce :=
    v_open_dispute.id is not null
    and exists (
      select 1
      from public.territory_dispute_attackers a
      where a.dispute_id = v_open_dispute.id
        and a.kingdom_id = v_kingdom_id
    );

  if not v_is_normal_reinforce and not v_is_siege_reinforce then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes reforzar territorios propios o asedios abiertos por tu reino.'
    );
  end if;

  select id, travel_hours
  into v_route
  from public.routes r
  where
    (
      r.from_territory_id = p_from_territory_id
      and r.to_territory_id = p_target_territory_id
    )
    or
    (
      r.from_territory_id = p_target_territory_id
      and r.to_territory_id = p_from_territory_id
    )
  limit 1;

  if v_route.id is null then
    return jsonb_build_object('ok', false, 'message', 'Por ahora solo puedes reforzar territorios conectados directamente por una ruta.');
  end if;

  v_route_hours := coalesce(v_route.travel_hours, 24);
  v_travel_days := greatest(1, ceil(v_route_hours::numeric / 24)::integer);

  v_arrival_tick := v_current_tick + v_travel_days;

  v_arrival_date := public.add_days_to_world_date(
    v_current_year,
    v_current_day,
    v_travel_days
  );

  v_arrival_year := (v_arrival_date ->> 'year')::integer;
  v_arrival_day := (v_arrival_date ->> 'day')::integer;

  update public.territories
  set
    soldiers = coalesce(soldiers, 0) - v_soldiers_amount,
    mercenaries = coalesce(mercenaries, 0) - v_mercenaries_amount,
    updated_at = now()
  where id = v_from.id;

  insert into public.troop_movements (
    user_id,
    kingdom_id,
    movement_type,
    status,
    source_territory_id,
    target_territory_id,
    soldiers,
    mercenaries,
    route_hours,
    departure_day,
    arrival_day,
    departure_year,
    arrival_year,
    departure_tick,
    arrival_tick,
    is_automatic
  )
  values (
    v_user_id,
    v_kingdom_id,
    'REINFORCE',
    'IN_TRANSIT',
    v_from.id,
    v_target.id,
    v_soldiers_amount,
    v_mercenaries_amount,
    v_route_hours,
    v_current_day,
    v_arrival_day,
    v_current_year,
    v_arrival_year,
    v_current_tick,
    v_arrival_tick,
    false
  );

  insert into public.player_actions (
    user_id,
    kingdom_id,
    type,
    game_day,
    source_territory_id,
    target_territory_id,
    soldiers
  )
  values (
    v_user_id,
    v_kingdom_id,
    'REINFORCE',
    v_current_tick,
    v_from.id,
    v_target.id,
    v_total_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Orden emitida: ' ||
      v_soldiers_amount || ' soldados y ' ||
      v_mercenaries_amount || ' mercenarios han salido de ' ||
      v_from.name || ' hacia ' || v_target.name ||
      '. Llegarán el día ' || v_arrival_day || ' del año ' || v_arrival_year || '.',
    'from_territory', v_from.name,
    'target_territory', v_target.name,
    'soldiers', v_soldiers_amount,
    'mercenaries', v_mercenaries_amount,
    'total', v_total_amount,
    'arrival_day', v_arrival_day,
    'arrival_year', v_arrival_year,
    'arrival_tick', v_arrival_tick
  );
end;
$$;

grant execute on function public.reinforce_territory_mixed_atomic(uuid, uuid, integer, integer)
to authenticated;


create or replace function public.attack_territory_mixed_atomic(
  p_from_territory_id uuid,
  p_target_territory_id uuid,
  p_soldiers_amount integer default 0,
  p_mercenaries_amount integer default 0
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

  v_from record;
  v_target record;
  v_route record;

  v_route_hours integer;
  v_travel_days integer;

  v_arrival_day integer;
  v_arrival_year integer;
  v_arrival_tick integer;
  v_arrival_date jsonb;

  v_soldiers_amount integer;
  v_mercenaries_amount integer;
  v_total_amount integer;
begin
  v_user_id := auth.uid();

  v_soldiers_amount := greatest(coalesce(p_soldiers_amount, 0), 0);
  v_mercenaries_amount := greatest(coalesce(p_mercenaries_amount, 0), 0);
  v_total_amount := v_soldiers_amount + v_mercenaries_amount;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes iniciar sesión para atacar.');
  end if;

  if p_from_territory_id is null or p_target_territory_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes seleccionar origen y objetivo.');
  end if;

  if p_from_territory_id = p_target_territory_id then
    return jsonb_build_object('ok', false, 'message', 'El origen y el objetivo no pueden ser el mismo territorio.');
  end if;

  if v_total_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Debes enviar al menos 1 soldado o 1 mercenario.');
  end if;

  select kingdom_id
  into v_kingdom_id
  from public.profiles
  where id = v_user_id;

  if v_kingdom_id is null then
    return jsonb_build_object('ok', false, 'message', 'Debes elegir un reino antes de atacar.');
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, soldiers, mercenaries, owner_kingdom_id
  into v_from
  from public.territories
  where id = p_from_territory_id
  for update;

  select id, name, type, soldiers, mercenaries, owner_kingdom_id
  into v_target
  from public.territories
  where id = p_target_territory_id
  for update;

  if v_from.id is null or v_target.id is null then
    return jsonb_build_object('ok', false, 'message', 'No se pudieron leer los territorios seleccionados.');
  end if;

  if v_from.type = 'STATION' or v_target.type = 'STATION' then
    return jsonb_build_object('ok', false, 'message', 'No puedes atacar usando nodos de viaje.');
  end if;

  if v_from.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object('ok', false, 'message', 'Solo puedes atacar desde territorios de tu propio reino.');
  end if;

  if v_target.owner_kingdom_id = v_kingdom_id then
    return jsonb_build_object('ok', false, 'message', 'No puedes atacar un territorio aliado.');
  end if;

  if v_target.owner_kingdom_id is null then
    return jsonb_build_object('ok', false, 'message', 'Este territorio no pertenece a ningún reino.');
  end if;

  if v_soldiers_amount > coalesce(v_from.soldiers, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes soldados regulares en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.soldiers, 0) || '.'
    );
  end if;

  if v_mercenaries_amount > coalesce(v_from.mercenaries, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes mercenarios en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.mercenaries, 0) || '.'
    );
  end if;

  select id, travel_hours
  into v_route
  from public.routes r
  where
    (
      r.from_territory_id = p_from_territory_id
      and r.to_territory_id = p_target_territory_id
    )
    or
    (
      r.from_territory_id = p_target_territory_id
      and r.to_territory_id = p_from_territory_id
    )
  limit 1;

  if v_route.id is null then
    return jsonb_build_object('ok', false, 'message', 'Por ahora solo puedes atacar territorios conectados directamente por una ruta.');
  end if;

  v_route_hours := coalesce(v_route.travel_hours, 24);
  v_travel_days := greatest(1, ceil(v_route_hours::numeric / 24)::integer);

  v_arrival_tick := v_current_tick + v_travel_days;

  v_arrival_date := public.add_days_to_world_date(
    v_current_year,
    v_current_day,
    v_travel_days
  );

  v_arrival_year := (v_arrival_date ->> 'year')::integer;
  v_arrival_day := (v_arrival_date ->> 'day')::integer;

  update public.territories
  set
    soldiers = coalesce(soldiers, 0) - v_soldiers_amount,
    mercenaries = coalesce(mercenaries, 0) - v_mercenaries_amount,
    updated_at = now()
  where id = v_from.id;

  insert into public.troop_movements (
    user_id,
    kingdom_id,
    movement_type,
    status,
    source_territory_id,
    target_territory_id,
    soldiers,
    mercenaries,
    route_hours,
    departure_day,
    arrival_day,
    departure_year,
    arrival_year,
    departure_tick,
    arrival_tick,
    is_automatic
  )
  values (
    v_user_id,
    v_kingdom_id,
    'ATTACK',
    'IN_TRANSIT',
    v_from.id,
    v_target.id,
    v_soldiers_amount,
    v_mercenaries_amount,
    v_route_hours,
    v_current_day,
    v_arrival_day,
    v_current_year,
    v_arrival_year,
    v_current_tick,
    v_arrival_tick,
    false
  );

  insert into public.player_actions (
    user_id,
    kingdom_id,
    type,
    game_day,
    source_territory_id,
    target_territory_id,
    soldiers
  )
  values (
    v_user_id,
    v_kingdom_id,
    'ATTACK',
    v_current_tick,
    v_from.id,
    v_target.id,
    v_total_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Orden de ataque emitida: ' ||
      v_soldiers_amount || ' soldados y ' ||
      v_mercenaries_amount || ' mercenarios han salido de ' ||
      v_from.name || ' hacia ' || v_target.name ||
      '. La batalla se resolverá el día ' || v_arrival_day || ' del año ' || v_arrival_year || '.',
    'from_territory', v_from.name,
    'target_territory', v_target.name,
    'soldiers', v_soldiers_amount,
    'mercenaries', v_mercenaries_amount,
    'total', v_total_amount,
    'arrival_day', v_arrival_day,
    'arrival_year', v_arrival_year,
    'arrival_tick', v_arrival_tick
  );
end;
$$;

grant execute on function public.attack_territory_mixed_atomic(uuid, uuid, integer, integer)
to authenticated;

select 'Separación de soldados y mercenarios preparada correctamente.' as result;
