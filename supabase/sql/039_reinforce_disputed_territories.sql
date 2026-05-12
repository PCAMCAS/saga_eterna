-- Saga Eterna - Refuerzos a territorios en disputa
-- Permite que el atacante refuerce el asedio y el defensor refuerce la guarnición.

create or replace function public.reinforce_territory_atomic(
  p_from_territory_id uuid,
  p_target_territory_id uuid,
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

  v_from record;
  v_target record;
  v_route record;
  v_open_dispute record;

  v_route_hours integer;
  v_travel_days integer;
  v_arrival_day integer;
  v_new_from_soldiers integer;

  v_is_normal_reinforce boolean := false;
  v_is_siege_reinforce boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes iniciar sesión para reforzar territorios.'
    );
  end if;

  if p_from_territory_id is null or p_target_territory_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes seleccionar origen y destino del refuerzo.'
    );
  end if;

  if p_from_territory_id = p_target_territory_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'El origen y el destino no pueden ser el mismo territorio.'
    );
  end if;

  if p_amount is null or p_amount <= 0 then
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
      'message', 'Debes elegir un reino antes de realizar acciones.'
    );
  end if;

  select current_day, current_year
  into v_current_day, v_current_year
  from public.game_state
  limit 1;

  if v_current_day is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se pudo leer el estado actual del juego.'
    );
  end if;

  select id, name, type, soldiers, owner_kingdom_id, is_disputed
  into v_from
  from public.territories
  where id = p_from_territory_id
  for update;

  select id, name, type, soldiers, owner_kingdom_id, is_disputed
  into v_target
  from public.territories
  where id = p_target_territory_id
  for update;

  if v_from.id is null or v_target.id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se pudieron leer los territorios seleccionados.'
    );
  end if;

  if v_from.type = 'STATION' or v_target.type = 'STATION' then
    return jsonb_build_object(
      'ok', false,
      'message', 'No puedes reforzar usando nodos de viaje.'
    );
  end if;

  if v_from.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes enviar refuerzos desde territorios de tu propio reino.'
    );
  end if;

  select *
  into v_open_dispute
  from public.territory_disputes
  where territory_id = v_target.id
    and status = 'OPEN'
  limit 1
  for update;

  v_is_normal_reinforce :=
    v_target.owner_kingdom_id = v_kingdom_id;

  v_is_siege_reinforce :=
    v_open_dispute.id is not null
    and v_open_dispute.attacker_kingdom_id = v_kingdom_id;

  if not v_is_normal_reinforce and not v_is_siege_reinforce then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes reforzar territorios propios o asedios abiertos por tu reino.'
    );
  end if;

  if p_amount > coalesce(v_from.soldiers, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes soldados en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.soldiers, 0) || '.'
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Por ahora solo puedes reforzar territorios conectados directamente por una ruta.'
    );
  end if;

  v_route_hours := coalesce(v_route.travel_hours, 24);
  v_travel_days := greatest(1, ceil(v_route_hours::numeric / 24)::integer);
  v_arrival_day := v_current_day + v_travel_days;
  v_new_from_soldiers := coalesce(v_from.soldiers, 0) - p_amount;

  update public.territories
  set
    soldiers = v_new_from_soldiers,
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
    route_hours,
    departure_day,
    arrival_day,
    is_automatic
  )
  values (
    v_user_id,
    v_kingdom_id,
    'REINFORCE',
    'IN_TRANSIT',
    v_from.id,
    v_target.id,
    p_amount,
    v_route_hours,
    v_current_day,
    v_arrival_day,
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
    v_current_day,
    v_from.id,
    v_target.id,
    p_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      case
        when v_is_siege_reinforce then
          'Orden emitida: ' || p_amount || ' soldados han salido de ' || v_from.name || ' para reforzar el asedio de ' || v_target.name || '. Llegarán el día ' || v_arrival_day || '.'
        else
          'Orden emitida: ' || p_amount || ' soldados han salido de ' || v_from.name || ' hacia ' || v_target.name || '. Llegarán el día ' || v_arrival_day || '.'
      end,
    'from_territory', v_from.name,
    'target_territory', v_target.name,
    'amount', p_amount,
    'departure_day', v_current_day,
    'arrival_day', v_arrival_day,
    'route_hours', v_route_hours,
    'from_soldiers', v_new_from_soldiers
  );
end;
$$;

grant execute on function public.reinforce_territory_atomic(uuid, uuid, integer)
to authenticated;


create or replace function public.advance_game_day()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_state_id uuid;
  v_old_day integer;
  v_new_day integer;
  v_current_year integer;

  v_movement record;
  v_target record;
  v_source record;
  v_open_dispute record;

  v_capital record;
  v_city record;
  v_recruit_amount integer;
  v_auto_reinforcement_amount integer;
  v_total_recruited_soldiers integer := 0;
  v_auto_reinforcements_created integer := 0;

  v_resolved_reinforcements integer := 0;
  v_resolved_attacks integer := 0;
  v_opened_disputes integer := 0;
  v_siege_reinforcements integer := 0;

  v_defender_soldiers integer;
  v_remaining_soldiers integer;
  v_attackers_win boolean;
  v_is_pvp boolean;

  v_log_type text;
  v_public_message text;
begin
  select id, current_day, current_year
  into v_game_state_id, v_old_day, v_current_year
  from public.game_state
  limit 1
  for update;

  if v_game_state_id is null or v_old_day is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se pudo leer el estado del juego.'
    );
  end if;

  v_new_day := v_old_day + 1;

  update public.game_state
  set
    current_day = v_new_day,
    updated_at = now()
  where id = v_game_state_id;

  -- 1. Reclutamiento aleatorio en capitales: +100 a +200.
  for v_capital in
    select id, name, soldiers, owner_kingdom_id
    from public.territories
    where type = 'CAPITAL'
      and owner_kingdom_id is not null
    order by name
    for update
  loop
    v_recruit_amount := 100 + floor(random() * 101)::integer;

    update public.territories
    set
      soldiers = coalesce(soldiers, 0) + v_recruit_amount,
      updated_at = now()
    where id = v_capital.id;

    v_total_recruited_soldiers := v_total_recruited_soldiers + v_recruit_amount;
  end loop;

  -- 2. Logística automática capital -> ciudades.
  for v_capital in
    select id, name, soldiers, owner_kingdom_id
    from public.territories
    where type = 'CAPITAL'
      and owner_kingdom_id is not null
    order by name
    for update
  loop
    for v_city in
      select id, name
      from public.territories
      where type = 'CITY'
        and owner_kingdom_id = v_capital.owner_kingdom_id
      order by name
    loop
      select soldiers
      into v_capital.soldiers
      from public.territories
      where id = v_capital.id
      for update;

      if coalesce(v_capital.soldiers, 0) <= 0 then
        exit;
      end if;

      v_auto_reinforcement_amount := least(5, coalesce(v_capital.soldiers, 0));

      update public.territories
      set
        soldiers = coalesce(soldiers, 0) - v_auto_reinforcement_amount,
        updated_at = now()
      where id = v_capital.id;

      insert into public.troop_movements (
        user_id,
        kingdom_id,
        movement_type,
        status,
        source_territory_id,
        target_territory_id,
        soldiers,
        route_hours,
        departure_day,
        arrival_day,
        is_automatic
      )
      values (
        coalesce(
          (
            select id
            from public.profiles
            where kingdom_id = v_capital.owner_kingdom_id
            order by created_at asc nulls last
            limit 1
          ),
          auth.uid()
        ),
        v_capital.owner_kingdom_id,
        'REINFORCE',
        'IN_TRANSIT',
        v_capital.id,
        v_city.id,
        v_auto_reinforcement_amount,
        24,
        v_new_day,
        v_new_day + 1,
        true
      );

      v_auto_reinforcements_created := v_auto_reinforcements_created + 1;
    end loop;
  end loop;

  -- 3. Resolver refuerzos llegados.
  for v_movement in
    select *
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'REINFORCE'
      and arrival_day <= v_new_day
    order by arrival_day asc, created_at asc
    for update
  loop
    select *
    into v_open_dispute
    from public.territory_disputes
    where territory_id = v_movement.target_territory_id
      and status = 'OPEN'
    limit 1
    for update;

    if v_open_dispute.id is not null
       and v_open_dispute.attacker_kingdom_id = v_movement.kingdom_id then
      update public.territory_disputes
      set attacker_soldiers = attacker_soldiers + v_movement.soldiers
      where id = v_open_dispute.id;

      v_siege_reinforcements := v_siege_reinforcements + 1;
    else
      update public.territories
      set
        soldiers = coalesce(soldiers, 0) + v_movement.soldiers,
        updated_at = now()
      where id = v_movement.target_territory_id;
    end if;

    update public.troop_movements
    set
      status = 'RESOLVED',
      resolved_at = now()
    where id = v_movement.id;

    v_resolved_reinforcements := v_resolved_reinforcements + 1;
  end loop;

  -- 4. Resolver ataques llegados.
  for v_movement in
    select *
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
    order by arrival_day asc, created_at asc
    for update
  loop
    select id, name, type, soldiers, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_movement.target_territory_id
    for update;

    select id, name
    into v_source
    from public.territories
    where id = v_movement.source_territory_id;

    if v_target.id is null then
      update public.troop_movements
      set
        status = 'CANCELLED',
        resolved_at = now()
      where id = v_movement.id;

      continue;
    end if;

    select *
    into v_open_dispute
    from public.territory_disputes
    where territory_id = v_target.id
      and status = 'OPEN'
    limit 1
    for update;

    if v_open_dispute.id is not null then
      if v_open_dispute.attacker_kingdom_id = v_movement.kingdom_id then
        update public.territory_disputes
        set attacker_soldiers = attacker_soldiers + v_movement.soldiers
        where id = v_open_dispute.id;

        update public.troop_movements
        set
          status = 'RESOLVED',
          resolved_at = now()
        where id = v_movement.id;

        v_resolved_attacks := v_resolved_attacks + 1;
        continue;
      end if;
    end if;

    if v_target.owner_kingdom_id = v_movement.kingdom_id then
      update public.territories
      set
        soldiers = coalesce(soldiers, 0) + v_movement.soldiers,
        updated_at = now()
      where id = v_target.id;

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where id = v_movement.id;

      v_resolved_attacks := v_resolved_attacks + 1;
      continue;
    end if;

    v_defender_soldiers := coalesce(v_target.soldiers, 0);
    v_attackers_win := v_movement.soldiers > v_defender_soldiers;
    v_remaining_soldiers := abs(v_movement.soldiers - v_defender_soldiers);

    select exists (
      select 1 from public.profiles p1 where p1.kingdom_id = v_movement.kingdom_id
    )
    and exists (
      select 1 from public.profiles p2 where p2.kingdom_id = v_target.owner_kingdom_id
    )
    into v_is_pvp;

    if v_attackers_win and v_is_pvp then
      update public.territories
      set
        soldiers = 0,
        is_disputed = true,
        updated_at = now()
      where id = v_target.id;

      insert into public.territory_disputes (
        territory_id,
        attacker_kingdom_id,
        defender_kingdom_id,
        status,
        attacker_soldiers,
        defender_soldiers_at_open,
        opened_day
      )
      values (
        v_target.id,
        v_movement.kingdom_id,
        v_target.owner_kingdom_id,
        'OPEN',
        v_remaining_soldiers,
        v_defender_soldiers,
        v_new_day
      );

      v_public_message :=
        coalesce(v_source.name, 'Un ejército') ||
        ' ha roto las defensas de ' ||
        v_target.name ||
        ', pero el territorio queda en disputa hasta que se resuelva la batalla presencial.';

      insert into public.global_logs (
        game_day,
        year,
        message,
        type,
        territory_id,
        actor_kingdom_id
      )
      values (
        v_new_day,
        v_current_year,
        v_public_message,
        'DISPUTE',
        v_target.id,
        v_movement.kingdom_id
      );

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where id = v_movement.id;

      v_opened_disputes := v_opened_disputes + 1;
      v_resolved_attacks := v_resolved_attacks + 1;

      continue;
    end if;

    update public.territories
    set
      soldiers = v_remaining_soldiers,
      owner_kingdom_id = case
        when v_attackers_win then v_movement.kingdom_id
        else v_target.owner_kingdom_id
      end,
      is_disputed = false,
      updated_at = now()
    where id = v_target.id;

    update public.troop_movements
    set
      status = 'RESOLVED',
      resolved_at = now()
    where id = v_movement.id;

    if v_attackers_win then
      v_log_type := 'CONQUEST';
      v_public_message :=
        coalesce(v_source.name, 'Un ejército') ||
        ' ha alcanzado ' ||
        v_target.name ||
        '. Tras la batalla, ' ||
        v_target.name ||
        ' ha sido conquistada.';
    else
      v_log_type := 'ATTACK';
      v_public_message :=
        coalesce(v_source.name, 'Un ejército') ||
        ' ha alcanzado ' ||
        v_target.name ||
        '. Los defensores han resistido.';
    end if;

    insert into public.global_logs (
      game_day,
      year,
      message,
      type,
      territory_id,
      actor_kingdom_id
    )
    values (
      v_new_day,
      v_current_year,
      v_public_message,
      v_log_type,
      v_target.id,
      v_movement.kingdom_id
    );

    v_resolved_attacks := v_resolved_attacks + 1;
  end loop;

  insert into public.global_logs (
    game_day,
    year,
    message,
    type
  )
  values (
    v_new_day,
    v_current_year,
    'Ha comenzado el día ' || v_new_day || ' de la campaña. Las capitales han reunido nuevas levas y despachado refuerzos.',
    'SYSTEM'
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Día avanzado a ' || v_new_day ||
      '. Levas de capitales: ' || v_total_recruited_soldiers ||
      '. Refuerzos automáticos enviados: ' || v_auto_reinforcements_created ||
      '. Refuerzos resueltos: ' || v_resolved_reinforcements ||
      '. Refuerzos al asedio: ' || v_siege_reinforcements ||
      '. Ataques resueltos: ' || v_resolved_attacks ||
      '. Disputas abiertas: ' || v_opened_disputes || '.',
    'old_day', v_old_day,
    'new_day', v_new_day,
    'capital_recruits', v_total_recruited_soldiers,
    'auto_reinforcements_created', v_auto_reinforcements_created,
    'resolved_reinforcements', v_resolved_reinforcements,
    'siege_reinforcements', v_siege_reinforcements,
    'resolved_attacks', v_resolved_attacks,
    'opened_disputes', v_opened_disputes
  );
end;
$$;

grant execute on function public.advance_game_day()
to authenticated;

select 'Refuerzos a disputas activados correctamente.' as result;
