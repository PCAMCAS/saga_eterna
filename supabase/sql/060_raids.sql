-- Saga Eterna - Asaltos
-- Los asaltos roban oro sin conquistar territorio.
-- No abren disputa.

alter table public.troop_movements
add column if not exists mercenaries integer not null default 0;

alter table public.troop_movements
drop constraint if exists troop_movements_movement_type_check;

alter table public.troop_movements
add constraint troop_movements_movement_type_check
check (movement_type in ('REINFORCE', 'ATTACK', 'MOVE', 'RAID'));

alter table public.player_actions
drop constraint if exists player_actions_type_check;

alter table public.player_actions
add constraint player_actions_type_check
check (
  type in (
    'SCOUT',
    'REINFORCE',
    'ATTACK',
    'MOVE',
    'BUILD',
    'BUY_MERCENARIES',
    'TRAIN_SOLDIERS',
    'RAID'
  )
);

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
    'DISPUTE',
    'BUILD',
    'ECONOMY',
    'RAID'
  )
);

create or replace function public.raid_territory_mixed_atomic(
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
    return jsonb_build_object('ok', false, 'message', 'Debes iniciar sesión para asaltar.');
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
    return jsonb_build_object('ok', false, 'message', 'Debes elegir un reino antes de asaltar.');
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

  select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
  into v_target
  from public.territories
  where id = p_target_territory_id
  for update;

  if v_from.id is null or v_target.id is null then
    return jsonb_build_object('ok', false, 'message', 'No se pudieron leer los territorios seleccionados.');
  end if;

  if v_from.type = 'STATION' or v_target.type = 'STATION' then
    return jsonb_build_object('ok', false, 'message', 'No puedes asaltar usando nodos de viaje.');
  end if;

  if v_from.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object('ok', false, 'message', 'Solo puedes asaltar desde territorios de tu propio reino.');
  end if;

  if v_target.owner_kingdom_id = v_kingdom_id then
    return jsonb_build_object('ok', false, 'message', 'No puedes asaltar un territorio aliado.');
  end if;

  if v_target.owner_kingdom_id is null then
    return jsonb_build_object('ok', false, 'message', 'Este territorio no pertenece a ningún reino.');
  end if;

  if coalesce(v_target.is_disputed, false) then
    return jsonb_build_object('ok', false, 'message', 'No puedes asaltar un territorio que ya está en disputa.');
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
    return jsonb_build_object('ok', false, 'message', 'Por ahora solo puedes asaltar territorios conectados directamente por una ruta.');
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
    'RAID',
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
    'RAID',
    v_current_tick,
    v_from.id,
    v_target.id,
    v_total_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Orden de asalto emitida: ' ||
      v_soldiers_amount || ' soldados y ' ||
      v_mercenaries_amount || ' mercenarios han salido de ' ||
      v_from.name || ' hacia ' || v_target.name ||
      '. Intentarán saquear el oro el día ' || v_arrival_day || ' del año ' || v_arrival_year || '.',
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

grant execute on function public.raid_territory_mixed_atomic(uuid, uuid, integer, integer)
to authenticated;


create or replace function public.process_arrived_raids(
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
  v_raid record;
  v_source record;
  v_target record;
  v_attacker_total integer;
  v_defender_total integer;
  v_remaining_force integer;
  v_surviving_soldiers integer;
  v_surviving_mercenaries integer;
  v_defender_surviving_soldiers integer;
  v_defender_surviving_mercenaries integer;
  v_stolen_gold integer;

  v_resolved integer := 0;
  v_successful integer := 0;
  v_failed integer := 0;
  v_total_stolen integer := 0;
begin
  for v_raid in
    select *
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'RAID'
      and arrival_tick <= p_tick
    order by arrival_tick asc, created_at asc
    for update
  loop
    select id, name, type, soldiers, mercenaries, owner_kingdom_id
    into v_source
    from public.territories
    where id = v_raid.source_territory_id
    for update;

    select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_raid.target_territory_id
    for update;

    insert into public.territory_economy (territory_id)
    values (v_raid.source_territory_id)
    on conflict (territory_id) do nothing;

    insert into public.territory_economy (territory_id)
    values (v_raid.target_territory_id)
    on conflict (territory_id) do nothing;

    if v_source.id is null
       or v_target.id is null
       or v_source.owner_kingdom_id <> v_raid.kingdom_id
       or v_target.owner_kingdom_id = v_raid.kingdom_id
       or coalesce(v_target.is_disputed, false)
    then
      update public.troop_movements
      set
        status = 'CANCELLED',
        resolved_at = now()
      where id = v_raid.id;

      v_resolved := v_resolved + 1;
      v_failed := v_failed + 1;
      continue;
    end if;

    v_attacker_total := coalesce(v_raid.soldiers, 0) + coalesce(v_raid.mercenaries, 0);
    v_defender_total := coalesce(v_target.soldiers, 0) + coalesce(v_target.mercenaries, 0);

    if v_attacker_total > v_defender_total then
      v_remaining_force := greatest(v_attacker_total - v_defender_total, 1);

      if v_attacker_total > 0 then
        v_surviving_soldiers :=
          floor(coalesce(v_raid.soldiers, 0)::numeric * v_remaining_force::numeric / v_attacker_total::numeric)::integer;
        v_surviving_mercenaries := greatest(v_remaining_force - v_surviving_soldiers, 0);
      else
        v_surviving_soldiers := 0;
        v_surviving_mercenaries := 0;
      end if;

      select coalesce(gold, 0)
      into v_stolen_gold
      from public.territory_economy
      where territory_id = v_target.id
      for update;

      update public.territory_economy
      set
        gold = 0,
        updated_at = now()
      where territory_id = v_target.id;

      update public.territory_economy
      set
        gold = gold + v_stolen_gold,
        updated_at = now()
      where territory_id = v_source.id;

      update public.territories
      set
        soldiers = 0,
        mercenaries = 0,
        updated_at = now()
      where id = v_target.id;

      update public.territories
      set
        soldiers = coalesce(soldiers, 0) + v_surviving_soldiers,
        mercenaries = coalesce(mercenaries, 0) + v_surviving_mercenaries,
        updated_at = now()
      where id = v_source.id;

      insert into public.global_logs (
        game_day,
        year,
        message,
        type,
        territory_id,
        actor_kingdom_id
      )
      values (
        p_day,
        p_year,
        'Un asalto ha saqueado ' || v_target.name || ' y ha robado ' || v_stolen_gold || ' oro.',
        'RAID',
        v_target.id,
        v_raid.kingdom_id
      );

      v_successful := v_successful + 1;
      v_total_stolen := v_total_stolen + v_stolen_gold;
    else
      v_remaining_force := greatest(v_defender_total - v_attacker_total, 1);

      if v_defender_total > 0 then
        v_defender_surviving_soldiers :=
          floor(coalesce(v_target.soldiers, 0)::numeric * v_remaining_force::numeric / v_defender_total::numeric)::integer;
        v_defender_surviving_mercenaries := greatest(v_remaining_force - v_defender_surviving_soldiers, 0);
      else
        v_defender_surviving_soldiers := 0;
        v_defender_surviving_mercenaries := 0;
      end if;

      update public.territories
      set
        soldiers = v_defender_surviving_soldiers,
        mercenaries = v_defender_surviving_mercenaries,
        updated_at = now()
      where id = v_target.id;

      insert into public.global_logs (
        game_day,
        year,
        message,
        type,
        territory_id,
        actor_kingdom_id
      )
      values (
        p_day,
        p_year,
        'Un asalto contra ' || v_target.name || ' ha sido rechazado por los defensores.',
        'RAID',
        v_target.id,
        v_raid.kingdom_id
      );

      v_failed := v_failed + 1;
    end if;

    update public.troop_movements
    set
      status = 'RESOLVED',
      resolved_at = now()
    where id = v_raid.id;

    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'resolved', v_resolved,
    'successful', v_successful,
    'failed', v_failed,
    'stolen_gold', v_total_stolen
  );
end;
$$;

grant execute on function public.process_arrived_raids(integer, integer, integer)
to authenticated;

select 'Asaltos preparados correctamente.' as result;
