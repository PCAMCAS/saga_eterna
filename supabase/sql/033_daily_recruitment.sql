-- Saga Eterna - Reclutamiento diario desde capitales
-- Al avanzar el día:
-- 1. Cada capital genera aleatoriamente entre 100 y 200 soldados.
-- 2. Las ciudades no generan tropas propias.
-- 3. Cada capital envía 5 soldados a cada ciudad de su reino como refuerzo en tránsito.
-- 4. Los refuerzos automáticos llegan al día siguiente.

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

  v_capital record;
  v_city record;
  v_recruit_amount integer;
  v_auto_reinforcement_amount integer;
  v_total_recruited_soldiers integer := 0;
  v_auto_reinforcements_created integer := 0;

  v_resolved_reinforcements integer := 0;
  v_resolved_attacks integer := 0;

  v_defender_soldiers integer;
  v_remaining_soldiers integer;
  v_attackers_win boolean;

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

  -- 2. Refuerzos automáticos desde cada capital a sus ciudades.
  -- Cada capital intenta enviar 5 soldados a cada ciudad propia.
  -- Estos soldados salen inmediatamente de la capital y llegan al día siguiente.
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
        arrival_day
      )
      values (
        -- Movimiento automático del sistema: lo asociamos al primer jugador del reino si existe.
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
        v_new_day + 1
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
    update public.territories
    set
      soldiers = coalesce(soldiers, 0) + v_movement.soldiers,
      updated_at = now()
    where id = v_movement.target_territory_id;

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
    select id, name, type, soldiers, owner_kingdom_id
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

    -- Si al llegar el objetivo ya pertenece al atacante, se integra como refuerzo.
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

    update public.territories
    set
      soldiers = v_remaining_soldiers,
      owner_kingdom_id = case
        when v_attackers_win then v_movement.kingdom_id
        else v_target.owner_kingdom_id
      end,
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
      '. Ataques resueltos: ' || v_resolved_attacks || '.',
    'old_day', v_old_day,
    'new_day', v_new_day,
    'capital_recruits', v_total_recruited_soldiers,
    'auto_reinforcements_created', v_auto_reinforcements_created,
    'resolved_reinforcements', v_resolved_reinforcements,
    'resolved_attacks', v_resolved_attacks
  );
end;
$$;

grant execute on function public.advance_game_day()
to authenticated;

select 'Reclutamiento diario de capitales actualizado correctamente.' as result;
