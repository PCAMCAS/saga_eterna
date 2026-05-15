-- Saga Eterna - Avance de día con fuerzas mixtas
-- soldiers = soldados regulares
-- mercenaries = mercenarios
-- fuerza total = soldiers + mercenaries

alter table public.territories
add column if not exists mercenaries integer not null default 0;

alter table public.troop_movements
add column if not exists mercenaries integer not null default 0;

alter table public.territory_dispute_attackers
add column if not exists mercenaries integer not null default 0;

alter table public.territory_disputes
add column if not exists attacker_mercenaries integer not null default 0;

alter table public.territory_disputes
add column if not exists defender_mercenaries_at_open integer not null default 0;


create or replace function public.advance_game_day()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_state_id uuid;

  v_old_day integer;
  v_old_year integer;
  v_old_tick integer;

  v_new_day integer;
  v_new_year integer;
  v_new_tick integer;
  v_next_date jsonb;

  v_movement record;
  v_target record;
  v_open_dispute record;

  v_resolved_reinforcements integer := 0;
  v_resolved_attacks integer := 0;
  v_opened_disputes integer := 0;
  v_siege_reinforcements integer := 0;

  v_target_id uuid;
  v_attacker record;
  v_winner_attacker record;

  v_defender_kingdom_id uuid;
  v_defender_soldiers integer;
  v_defender_mercenaries integer;
  v_defender_total integer;

  v_max_force integer;
  v_max_count integer;
  v_second_highest integer;

  v_winner_kingdom_id uuid;
  v_remaining_force integer;

  v_surviving_soldiers integer;
  v_surviving_mercenaries integer;

  v_attacker_count integer;
  v_is_pvp boolean;

  v_economy_result jsonb;
  v_raid_result jsonb;
begin
  select id, current_day, current_year, current_tick
  into v_game_state_id, v_old_day, v_old_year, v_old_tick
  from public.game_state
  limit 1
  for update;

  if v_game_state_id is null or v_old_day is null or v_old_year is null or v_old_tick is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se pudo leer el estado del juego.'
    );
  end if;

  v_next_date := public.add_days_to_world_date(v_old_year, v_old_day, 1);
  v_new_year := (v_next_date ->> 'year')::integer;
  v_new_day := (v_next_date ->> 'day')::integer;
  v_new_tick := v_old_tick + 1;

  update public.game_state
  set
    current_day = v_new_day,
    current_year = v_new_year,
    current_tick = v_new_tick,
    last_advanced_real_date = (timezone('Europe/Madrid', now()))::date,
    updated_at = now()
  where id = v_game_state_id;

  -- 1. Economía diaria.
  v_economy_result := public.process_daily_economy(v_new_day, v_new_year, v_new_tick);

  -- 2. Resolver refuerzos llegados.
  for v_movement in
    select *
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'REINFORCE'
      and arrival_tick <= v_new_tick
    order by arrival_tick asc, created_at asc
    for update
  loop
    select *
    into v_open_dispute
    from public.territory_disputes
    where territory_id = v_movement.target_territory_id
      and status = 'OPEN'
    limit 1
    for update;

    -- Si el refuerzo va a un asedio propio como atacante, se suma al ejército atacante.
    if v_open_dispute.id is not null
       and exists (
         select 1
         from public.territory_dispute_attackers a
         where a.dispute_id = v_open_dispute.id
           and a.kingdom_id = v_movement.kingdom_id
       )
    then
      insert into public.territory_dispute_attackers (
        dispute_id,
        kingdom_id,
        soldiers,
        mercenaries
      )
      values (
        v_open_dispute.id,
        v_movement.kingdom_id,
        coalesce(v_movement.soldiers, 0),
        coalesce(v_movement.mercenaries, 0)
      )
      on conflict (dispute_id, kingdom_id)
      do update set
        soldiers = territory_dispute_attackers.soldiers + excluded.soldiers,
        mercenaries = territory_dispute_attackers.mercenaries + excluded.mercenaries,
        updated_at = now();

      update public.territory_disputes
      set
        attacker_soldiers = attacker_soldiers + coalesce(v_movement.soldiers, 0),
        attacker_mercenaries = attacker_mercenaries + coalesce(v_movement.mercenaries, 0)
      where id = v_open_dispute.id
        and attacker_kingdom_id = v_movement.kingdom_id;

      v_siege_reinforcements := v_siege_reinforcements + 1;
    else
      -- Refuerzo normal al territorio.
      update public.territories
      set
        soldiers = coalesce(soldiers, 0) + coalesce(v_movement.soldiers, 0),
        mercenaries = coalesce(mercenaries, 0) + coalesce(v_movement.mercenaries, 0),
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

  -- 3. Resolver ataques llegados agrupados por territorio.
  for v_target_id in
    select distinct target_territory_id
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_tick <= v_new_tick
  loop
    select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_target_id
    for update;

    if v_target.id is null then
      update public.troop_movements
      set
        status = 'CANCELLED',
        resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target_id;

      continue;
    end if;

    select *
    into v_open_dispute
    from public.territory_disputes
    where territory_id = v_target.id
      and status = 'OPEN'
    limit 1
    for update;

    -- Si ya hay disputa, los ataques que llegan se suman al asedio.
    if v_open_dispute.id is not null then
      for v_attacker in
        select
          kingdom_id,
          sum(coalesce(soldiers, 0))::integer as soldiers,
          sum(coalesce(mercenaries, 0))::integer as mercenaries
        from public.troop_movements
        where status = 'IN_TRANSIT'
          and movement_type = 'ATTACK'
          and arrival_tick <= v_new_tick
          and target_territory_id = v_target.id
        group by kingdom_id
      loop
        if v_attacker.kingdom_id = v_target.owner_kingdom_id then
          update public.territories
          set
            soldiers = coalesce(soldiers, 0) + coalesce(v_attacker.soldiers, 0),
            mercenaries = coalesce(mercenaries, 0) + coalesce(v_attacker.mercenaries, 0),
            updated_at = now()
          where id = v_target.id;
        else
          insert into public.territory_dispute_attackers (
            dispute_id,
            kingdom_id,
            soldiers,
            mercenaries
          )
          values (
            v_open_dispute.id,
            v_attacker.kingdom_id,
            coalesce(v_attacker.soldiers, 0),
            coalesce(v_attacker.mercenaries, 0)
          )
          on conflict (dispute_id, kingdom_id)
          do update set
            soldiers = territory_dispute_attackers.soldiers + excluded.soldiers,
            mercenaries = territory_dispute_attackers.mercenaries + excluded.mercenaries,
            updated_at = now();

          update public.territory_disputes
          set
            attacker_soldiers = attacker_soldiers + coalesce(v_attacker.soldiers, 0),
            attacker_mercenaries = attacker_mercenaries + coalesce(v_attacker.mercenaries, 0)
          where id = v_open_dispute.id
            and attacker_kingdom_id = v_attacker.kingdom_id;
        end if;
      end loop;

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id;

      get diagnostics v_attacker_count = row_count;
      v_resolved_attacks := v_resolved_attacks + v_attacker_count;

      continue;
    end if;

    -- Ataques del propio dueño se integran como refuerzos.
    update public.territories t
    set
      soldiers = coalesce(t.soldiers, 0) + incoming.soldiers,
      mercenaries = coalesce(t.mercenaries, 0) + incoming.mercenaries,
      updated_at = now()
    from (
      select
        kingdom_id,
        sum(coalesce(soldiers, 0))::integer as soldiers,
        sum(coalesce(mercenaries, 0))::integer as mercenaries
      from public.troop_movements
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id
        and kingdom_id = v_target.owner_kingdom_id
      group by kingdom_id
    ) incoming
    where t.id = v_target.id;

    update public.troop_movements
    set
      status = 'RESOLVED',
      resolved_at = now()
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_tick <= v_new_tick
      and target_territory_id = v_target.id
      and kingdom_id = v_target.owner_kingdom_id;

    get diagnostics v_attacker_count = row_count;
    v_resolved_attacks := v_resolved_attacks + v_attacker_count;

    -- Releer defensor tras posibles refuerzos.
    select id, name, type, soldiers, mercenaries, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_target_id
    for update;

    v_defender_kingdom_id := v_target.owner_kingdom_id;
    v_defender_soldiers := coalesce(v_target.soldiers, 0);
    v_defender_mercenaries := coalesce(v_target.mercenaries, 0);
    v_defender_total := v_defender_soldiers + v_defender_mercenaries;

    select count(*)
    into v_attacker_count
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_tick <= v_new_tick
      and target_territory_id = v_target.id
      and kingdom_id <> v_defender_kingdom_id;

    if v_attacker_count = 0 then
      continue;
    end if;

    -- Comparar defensor contra todos los atacantes.
    with sides as (
      select
        v_defender_kingdom_id as kingdom_id,
        v_defender_soldiers as soldiers,
        v_defender_mercenaries as mercenaries,
        v_defender_total as total_force,
        true as is_defender
      union all
      select
        kingdom_id,
        sum(coalesce(soldiers, 0))::integer as soldiers,
        sum(coalesce(mercenaries, 0))::integer as mercenaries,
        (
          sum(coalesce(soldiers, 0)) +
          sum(coalesce(mercenaries, 0))
        )::integer as total_force,
        false as is_defender
      from public.troop_movements
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id
        and kingdom_id <> v_defender_kingdom_id
      group by kingdom_id
    ),
    ranked as (
      select *,
        dense_rank() over (order by total_force desc) as rnk
      from sides
    )
    select
      max(total_force),
      count(*) filter (where rnk = 1),
      coalesce(max(total_force) filter (where rnk = 2), 0)
    into
      v_max_force,
      v_max_count,
      v_second_highest
    from ranked;

    -- Empate en primer puesto: defensor resiste.
    if v_max_count > 1 then
      v_remaining_force := greatest(v_defender_total - (
        select coalesce(max(total_force), 0)
        from (
          select
            kingdom_id,
            (
              sum(coalesce(soldiers, 0)) +
              sum(coalesce(mercenaries, 0))
            )::integer as total_force
          from public.troop_movements
          where status = 'IN_TRANSIT'
            and movement_type = 'ATTACK'
            and arrival_tick <= v_new_tick
            and target_territory_id = v_target.id
            and kingdom_id <> v_defender_kingdom_id
          group by kingdom_id
        ) enemy_forces
      ), 1);

      if v_defender_total > 0 then
        v_surviving_soldiers := floor(v_defender_soldiers::numeric * v_remaining_force::numeric / v_defender_total::numeric)::integer;
        v_surviving_mercenaries := greatest(v_remaining_force - v_surviving_soldiers, 0);
      else
        v_surviving_soldiers := v_remaining_force;
        v_surviving_mercenaries := 0;
      end if;

      update public.territories
      set
        soldiers = v_surviving_soldiers,
        mercenaries = v_surviving_mercenaries,
        is_disputed = false,
        updated_at = now()
      where id = v_target.id;

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id;

      get diagnostics v_attacker_count = row_count;
      v_resolved_attacks := v_resolved_attacks + v_attacker_count;

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
        v_new_year,
        'Varios ejércitos han chocado ante ' || v_target.name || '. La defensa ha resistido gracias al equilibrio de fuerzas.',
        'ATTACK',
        v_target.id,
        v_defender_kingdom_id
      );

      continue;
    end if;

    -- Defensor tiene la mayor fuerza: resiste.
    if v_defender_total = v_max_force then
      v_remaining_force := greatest(v_defender_total - v_second_highest, 1);

      if v_defender_total > 0 then
        v_surviving_soldiers := floor(v_defender_soldiers::numeric * v_remaining_force::numeric / v_defender_total::numeric)::integer;
        v_surviving_mercenaries := greatest(v_remaining_force - v_surviving_soldiers, 0);
      else
        v_surviving_soldiers := v_remaining_force;
        v_surviving_mercenaries := 0;
      end if;

      update public.territories
      set
        soldiers = v_surviving_soldiers,
        mercenaries = v_surviving_mercenaries,
        is_disputed = false,
        updated_at = now()
      where id = v_target.id;

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id;

      get diagnostics v_attacker_count = row_count;
      v_resolved_attacks := v_resolved_attacks + v_attacker_count;

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
        v_new_year,
        'Varios ejércitos han alcanzado ' || v_target.name || '. Los defensores han resistido.',
        'ATTACK',
        v_target.id,
        v_defender_kingdom_id
      );

      continue;
    end if;

    -- Gana un atacante.
    select
      kingdom_id,
      sum(coalesce(soldiers, 0))::integer as soldiers,
      sum(coalesce(mercenaries, 0))::integer as mercenaries,
      (
        sum(coalesce(soldiers, 0)) +
        sum(coalesce(mercenaries, 0))
      )::integer as total_force
    into v_winner_attacker
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_tick <= v_new_tick
      and target_territory_id = v_target.id
      and kingdom_id <> v_defender_kingdom_id
    group by kingdom_id
    order by
      (
        sum(coalesce(soldiers, 0)) +
        sum(coalesce(mercenaries, 0))
      ) desc
    limit 1;

    v_winner_kingdom_id := v_winner_attacker.kingdom_id;
    v_remaining_force := greatest(v_winner_attacker.total_force - v_second_highest, 1);

    if v_winner_attacker.total_force > 0 then
      v_surviving_soldiers := floor(v_winner_attacker.soldiers::numeric * v_remaining_force::numeric / v_winner_attacker.total_force::numeric)::integer;
      v_surviving_mercenaries := greatest(v_remaining_force - v_surviving_soldiers, 0);
    else
      v_surviving_soldiers := v_remaining_force;
      v_surviving_mercenaries := 0;
    end if;

    select exists (
      select 1 from public.profiles p1 where p1.kingdom_id = v_winner_kingdom_id
    )
    and exists (
      select 1 from public.profiles p2 where p2.kingdom_id = v_defender_kingdom_id
    )
    into v_is_pvp;

    if v_is_pvp then
      update public.territories
      set
        soldiers = 0,
        mercenaries = 0,
        is_disputed = true,
        updated_at = now()
      where id = v_target.id;

      insert into public.territory_disputes (
        territory_id,
        attacker_kingdom_id,
        defender_kingdom_id,
        status,
        attacker_soldiers,
        attacker_mercenaries,
        defender_soldiers_at_open,
        defender_mercenaries_at_open,
        opened_day
      )
      values (
        v_target.id,
        v_winner_kingdom_id,
        v_defender_kingdom_id,
        'OPEN',
        v_surviving_soldiers,
        v_surviving_mercenaries,
        v_defender_soldiers,
        v_defender_mercenaries,
        v_new_tick
      )
      returning *
      into v_open_dispute;

      for v_attacker in
        select
          kingdom_id,
          sum(coalesce(soldiers, 0))::integer as soldiers,
          sum(coalesce(mercenaries, 0))::integer as mercenaries
        from public.troop_movements
        where status = 'IN_TRANSIT'
          and movement_type = 'ATTACK'
          and arrival_tick <= v_new_tick
          and target_territory_id = v_target.id
          and kingdom_id <> v_defender_kingdom_id
        group by kingdom_id
      loop
        insert into public.territory_dispute_attackers (
          dispute_id,
          kingdom_id,
          soldiers,
          mercenaries
        )
        values (
          v_open_dispute.id,
          v_attacker.kingdom_id,
          case
            when v_attacker.kingdom_id = v_winner_kingdom_id
              then v_surviving_soldiers
            else coalesce(v_attacker.soldiers, 0)
          end,
          case
            when v_attacker.kingdom_id = v_winner_kingdom_id
              then v_surviving_mercenaries
            else coalesce(v_attacker.mercenaries, 0)
          end
        )
        on conflict (dispute_id, kingdom_id)
        do update set
          soldiers = excluded.soldiers,
          mercenaries = excluded.mercenaries,
          updated_at = now();
      end loop;

      update public.troop_movements
      set
        status = 'RESOLVED',
        resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_tick <= v_new_tick
        and target_territory_id = v_target.id;

      get diagnostics v_attacker_count = row_count;
      v_resolved_attacks := v_resolved_attacks + v_attacker_count;
      v_opened_disputes := v_opened_disputes + 1;

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
        v_new_year,
        'Los atacantes han superado las defensas de ' || v_target.name || ', pero el territorio queda en disputa hasta que se resuelva la batalla presencial.',
        'DISPUTE',
        v_target.id,
        v_winner_kingdom_id
      );

      continue;
    end if;

    -- Conquista automática: cambio de dueño, tropas a 0 y edificios destruidos.
    update public.territories
    set
      soldiers = 0,
      mercenaries = 0,
      owner_kingdom_id = v_winner_kingdom_id,
      is_disputed = false,
      updated_at = now()
    where id = v_target.id;

    update public.territory_economy
    set
      gold = 0,
      food = 0,
      gold_building_level = 0,
      food_building_level = 0,
      barracks_level = 0,
      updated_at = now()
    where territory_id = v_target.id;

    update public.troop_movements
    set
      status = 'RESOLVED',
      resolved_at = now()
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_tick <= v_new_tick
      and target_territory_id = v_target.id;

    get diagnostics v_attacker_count = row_count;
    v_resolved_attacks := v_resolved_attacks + v_attacker_count;

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
      v_new_year,
      'Varios ejércitos han combatido por ' || v_target.name || '. El ejército atacante más fuerte ha conquistado el territorio.',
      'CONQUEST',
      v_target.id,
      v_winner_kingdom_id
    );
  end loop;

  -- 4. Resolver asaltos llegados.
  v_raid_result := public.process_arrived_raids(v_new_day, v_new_year, v_new_tick);

  insert into public.global_logs (
    game_day,
    year,
    message,
    type
  )
  values (
    v_new_day,
    v_new_year,
    'Ha comenzado el día ' || v_new_day || ' del año ' || v_new_year || ' d.C. La economía diaria ha sido procesada.',
    'SYSTEM'
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Día avanzado al día ' || v_new_day || ' del año ' || v_new_year ||
      '. Economía diaria procesada.' ||
      '. Refuerzos resueltos: ' || v_resolved_reinforcements ||
      '. Refuerzos al asedio: ' || v_siege_reinforcements ||
      '. Ataques resueltos: ' || v_resolved_attacks ||
      '. Disputas abiertas: ' || v_opened_disputes || '.',
    'old_day', v_old_day,
    'old_year', v_old_year,
    'old_tick', v_old_tick,
    'new_day', v_new_day,
    'new_year', v_new_year,
    'new_tick', v_new_tick,
    'economy', v_economy_result,
    'raids', v_raid_result,
    'resolved_reinforcements', v_resolved_reinforcements,
    'siege_reinforcements', v_siege_reinforcements,
    'resolved_attacks', v_resolved_attacks,
    'opened_disputes', v_opened_disputes
  );
end;
$$;

grant execute on function public.advance_game_day()
to authenticated;


-- Resolver disputa: si hay conquista, también destruye edificios y deja soldados/mercenarios en 0.
create or replace function public.resolve_territory_dispute(
  p_dispute_id uuid,
  p_winner_kingdom_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text;
  v_current_day integer;
  v_current_year integer;
  v_dispute record;
  v_territory record;
  v_winner record;
  v_message text;
  v_winner_is_valid boolean;
  v_is_conquest boolean;
begin
  v_admin_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_admin_email <> 'castiwb@gmail.com' then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo un administrador puede resolver disputas.'
    );
  end if;

  if p_dispute_id is null or p_winner_kingdom_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes seleccionar una disputa y un ganador.'
    );
  end if;

  select current_day, current_year
  into v_current_day, v_current_year
  from public.game_state
  limit 1;

  select *
  into v_dispute
  from public.territory_disputes
  where id = p_dispute_id
    and status = 'OPEN'
  for update;

  if v_dispute.id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se encontró una disputa abierta.'
    );
  end if;

  select exists (
    select 1
    from public.territory_dispute_attackers a
    where a.dispute_id = v_dispute.id
      and a.kingdom_id = p_winner_kingdom_id
  )
  or p_winner_kingdom_id = v_dispute.defender_kingdom_id
  into v_winner_is_valid;

  if not v_winner_is_valid then
    return jsonb_build_object(
      'ok', false,
      'message', 'El ganador debe ser el defensor o uno de los atacantes de la disputa.'
    );
  end if;

  select id, name, owner_kingdom_id
  into v_territory
  from public.territories
  where id = v_dispute.territory_id
  for update;

  select id, name
  into v_winner
  from public.kingdoms
  where id = p_winner_kingdom_id;

  if v_territory.id is null or v_winner.id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'No se pudo leer el territorio o el reino ganador.'
    );
  end if;

  v_is_conquest := v_territory.owner_kingdom_id <> p_winner_kingdom_id;

  update public.territories
  set
    owner_kingdom_id = p_winner_kingdom_id,
    soldiers = case when v_is_conquest then 0 else soldiers end,
    mercenaries = case when v_is_conquest then 0 else mercenaries end,
    is_disputed = false,
    updated_at = now()
  where id = v_territory.id;

  if v_is_conquest then
    update public.territory_economy
    set
      gold = 0,
      food = 0,
      gold_building_level = 0,
      food_building_level = 0,
      barracks_level = 0,
      updated_at = now()
    where territory_id = v_territory.id;
  end if;

  update public.territory_disputes
  set
    status = 'RESOLVED',
    resolved_day = v_current_day,
    winner_kingdom_id = p_winner_kingdom_id,
    resolved_at = now()
  where id = v_dispute.id;

  v_message :=
    'La disputa por ' ||
    v_territory.name ||
    ' ha sido resuelta. ' ||
    v_winner.name ||
    ' controla el territorio.';

  insert into public.global_logs (
    game_day,
    year,
    message,
    type,
    territory_id,
    actor_kingdom_id
  )
  values (
    v_current_day,
    v_current_year,
    v_message,
    case when v_is_conquest then 'CONQUEST' else 'ATTACK' end,
    v_territory.id,
    p_winner_kingdom_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', v_message,
    'territory', v_territory.name,
    'winner', v_winner.name,
    'conquest', v_is_conquest
  );
end;
$$;

grant execute on function public.resolve_territory_dispute(uuid, uuid)
to authenticated;

select 'Avance de día adaptado a soldados regulares y mercenarios.' as result;
