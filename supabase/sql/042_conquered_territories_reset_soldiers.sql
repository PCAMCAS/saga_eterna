-- Saga Eterna - Territorios conquistados quedan con 0 soldados
-- Si un territorio cambia de dueño por conquista, no conserva tropas sobrantes.

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

  select id, name, soldiers, owner_kingdom_id
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
    soldiers = case
      when v_is_conquest then 0
      else coalesce(soldiers, 0)
    end,
    is_disputed = false,
    updated_at = now()
  where id = v_territory.id;

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


-- Parche sobre advance_game_day:
-- sustituye la conquista automática para que el territorio conquistado quede a 0.
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

  v_target_id uuid;
  v_attacker record;
  v_winner_attacker record;

  v_defender_kingdom_id uuid;
  v_defender_soldiers integer;
  v_max_soldiers integer;
  v_max_count integer;
  v_second_highest integer;
  v_winner_kingdom_id uuid;
  v_remaining_soldiers integer;
  v_attacker_count integer;
  v_is_pvp boolean;
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
  set current_day = v_new_day,
      updated_at = now()
  where id = v_game_state_id;

  -- 1. Reclutamiento aleatorio en capitales.
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
    set soldiers = coalesce(soldiers, 0) + v_recruit_amount,
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
      set soldiers = coalesce(soldiers, 0) - v_auto_reinforcement_amount,
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
        soldiers
      )
      values (
        v_open_dispute.id,
        v_movement.kingdom_id,
        v_movement.soldiers
      )
      on conflict (dispute_id, kingdom_id)
      do update set
        soldiers = territory_dispute_attackers.soldiers + excluded.soldiers,
        updated_at = now();

      update public.territory_disputes
      set attacker_soldiers = attacker_soldiers + v_movement.soldiers
      where id = v_open_dispute.id
        and attacker_kingdom_id = v_movement.kingdom_id;

      v_siege_reinforcements := v_siege_reinforcements + 1;
    else
      update public.territories
      set soldiers = coalesce(soldiers, 0) + v_movement.soldiers,
          updated_at = now()
      where id = v_movement.target_territory_id;
    end if;

    update public.troop_movements
    set status = 'RESOLVED',
        resolved_at = now()
    where id = v_movement.id;

    v_resolved_reinforcements := v_resolved_reinforcements + 1;
  end loop;

  -- 4. Resolver ataques llegados agrupados por territorio.
  for v_target_id in
    select distinct target_territory_id
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
  loop
    select id, name, type, soldiers, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_target_id
    for update;

    if v_target.id is null then
      update public.troop_movements
      set status = 'CANCELLED',
          resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
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

    -- Si ya hay disputa, los ataques se añaden como fuerzas de asedio.
    if v_open_dispute.id is not null then
      for v_attacker in
        select kingdom_id, sum(soldiers)::integer as soldiers
        from public.troop_movements
        where status = 'IN_TRANSIT'
          and movement_type = 'ATTACK'
          and arrival_day <= v_new_day
          and target_territory_id = v_target.id
        group by kingdom_id
      loop
        if v_attacker.kingdom_id = v_target.owner_kingdom_id then
          update public.territories
          set soldiers = coalesce(soldiers, 0) + v_attacker.soldiers,
              updated_at = now()
          where id = v_target.id;
        else
          insert into public.territory_dispute_attackers (
            dispute_id,
            kingdom_id,
            soldiers
          )
          values (
            v_open_dispute.id,
            v_attacker.kingdom_id,
            v_attacker.soldiers
          )
          on conflict (dispute_id, kingdom_id)
          do update set
            soldiers = territory_dispute_attackers.soldiers + excluded.soldiers,
            updated_at = now();

          update public.territory_disputes
          set attacker_soldiers = attacker_soldiers + v_attacker.soldiers
          where id = v_open_dispute.id
            and attacker_kingdom_id = v_attacker.kingdom_id;
        end if;
      end loop;

      update public.troop_movements
      set status = 'RESOLVED',
          resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
        and target_territory_id = v_target.id;

      get diagnostics v_attacker_count = row_count;
      v_resolved_attacks := v_resolved_attacks + v_attacker_count;

      continue;
    end if;

    -- Ataques del propio dueño se integran como refuerzo.
    update public.territories t
    set soldiers = coalesce(t.soldiers, 0) + incoming.soldiers,
        updated_at = now()
    from (
      select kingdom_id, sum(soldiers)::integer as soldiers
      from public.troop_movements
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
        and target_territory_id = v_target.id
        and kingdom_id = v_target.owner_kingdom_id
      group by kingdom_id
    ) incoming
    where t.id = v_target.id;

    update public.troop_movements
    set status = 'RESOLVED',
        resolved_at = now()
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
      and target_territory_id = v_target.id
      and kingdom_id = v_target.owner_kingdom_id;

    get diagnostics v_attacker_count = row_count;
    v_resolved_attacks := v_resolved_attacks + v_attacker_count;

    select id, name, type, soldiers, owner_kingdom_id, is_disputed
    into v_target
    from public.territories
    where id = v_target_id
    for update;

    v_defender_kingdom_id := v_target.owner_kingdom_id;
    v_defender_soldiers := coalesce(v_target.soldiers, 0);

    select count(*)
    into v_attacker_count
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
      and target_territory_id = v_target.id
      and kingdom_id <> v_defender_kingdom_id;

    if v_attacker_count = 0 then
      continue;
    end if;

    with sides as (
      select v_defender_kingdom_id as kingdom_id, v_defender_soldiers as soldiers, true as is_defender
      union all
      select kingdom_id, sum(soldiers)::integer as soldiers, false as is_defender
      from public.troop_movements
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
        and target_territory_id = v_target.id
        and kingdom_id <> v_defender_kingdom_id
      group by kingdom_id
    ),
    ranked as (
      select *,
        dense_rank() over (order by soldiers desc) as rnk
      from sides
    )
    select
      max(soldiers),
      count(*) filter (where rnk = 1),
      coalesce(max(soldiers) filter (where rnk = 2), 0)
    into
      v_max_soldiers,
      v_max_count,
      v_second_highest
    from ranked;

    -- Empate arriba: defensor resiste.
    if v_max_count > 1 then
      v_remaining_soldiers := greatest(v_defender_soldiers - (
        select coalesce(max(sum_soldiers), 0)
        from (
          select kingdom_id, sum(soldiers)::integer as sum_soldiers
          from public.troop_movements
          where status = 'IN_TRANSIT'
            and movement_type = 'ATTACK'
            and arrival_day <= v_new_day
            and target_territory_id = v_target.id
            and kingdom_id <> v_defender_kingdom_id
          group by kingdom_id
        ) enemy_forces
      ), 1);

      update public.territories
      set soldiers = v_remaining_soldiers,
          is_disputed = false,
          updated_at = now()
      where id = v_target.id;

      update public.troop_movements
      set status = 'RESOLVED',
          resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
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
        v_current_year,
        'Varios ejércitos han chocado ante ' || v_target.name || '. La defensa ha resistido gracias al equilibrio de fuerzas.',
        'ATTACK',
        v_target.id,
        v_defender_kingdom_id
      );

      continue;
    end if;

    -- Defensor gana.
    if v_defender_soldiers = v_max_soldiers then
      v_remaining_soldiers := greatest(v_defender_soldiers - v_second_highest, 1);

      update public.territories
      set soldiers = v_remaining_soldiers,
          is_disputed = false,
          updated_at = now()
      where id = v_target.id;

      update public.troop_movements
      set status = 'RESOLVED',
          resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
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
        v_current_year,
        'Varios ejércitos han alcanzado ' || v_target.name || '. Los defensores han resistido.',
        'ATTACK',
        v_target.id,
        v_defender_kingdom_id
      );

      continue;
    end if;

    -- Gana un atacante.
    select kingdom_id, sum(soldiers)::integer as soldiers
    into v_winner_attacker
    from public.troop_movements
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
      and target_territory_id = v_target.id
      and kingdom_id <> v_defender_kingdom_id
    group by kingdom_id
    order by sum(soldiers) desc
    limit 1;

    v_winner_kingdom_id := v_winner_attacker.kingdom_id;
    v_remaining_soldiers := greatest(v_winner_attacker.soldiers - v_second_highest, 1);

    select exists (
      select 1 from public.profiles p1 where p1.kingdom_id = v_winner_kingdom_id
    )
    and exists (
      select 1 from public.profiles p2 where p2.kingdom_id = v_defender_kingdom_id
    )
    into v_is_pvp;

    if v_is_pvp then
      update public.territories
      set soldiers = 0,
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
        v_winner_kingdom_id,
        v_defender_kingdom_id,
        'OPEN',
        v_remaining_soldiers,
        v_defender_soldiers,
        v_new_day
      )
      returning *
      into v_open_dispute;

      for v_attacker in
        select kingdom_id, sum(soldiers)::integer as soldiers
        from public.troop_movements
        where status = 'IN_TRANSIT'
          and movement_type = 'ATTACK'
          and arrival_day <= v_new_day
          and target_territory_id = v_target.id
          and kingdom_id <> v_defender_kingdom_id
        group by kingdom_id
      loop
        insert into public.territory_dispute_attackers (
          dispute_id,
          kingdom_id,
          soldiers
        )
        values (
          v_open_dispute.id,
          v_attacker.kingdom_id,
          case
            when v_attacker.kingdom_id = v_winner_kingdom_id
              then v_remaining_soldiers
            else v_attacker.soldiers
          end
        )
        on conflict (dispute_id, kingdom_id)
        do update set
          soldiers = excluded.soldiers,
          updated_at = now();
      end loop;

      update public.troop_movements
      set status = 'RESOLVED',
          resolved_at = now()
      where status = 'IN_TRANSIT'
        and movement_type = 'ATTACK'
        and arrival_day <= v_new_day
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
        v_current_year,
        'Los atacantes han superado las defensas de ' || v_target.name || ', pero el territorio queda en disputa hasta que se resuelva la batalla presencial.',
        'DISPUTE',
        v_target.id,
        v_winner_kingdom_id
      );

      continue;
    end if;

    -- Conquista automática: cambio de dueño, pero soldados a 0.
    update public.territories
    set soldiers = 0,
        owner_kingdom_id = v_winner_kingdom_id,
        is_disputed = false,
        updated_at = now()
    where id = v_target.id;

    update public.troop_movements
    set status = 'RESOLVED',
        resolved_at = now()
    where status = 'IN_TRANSIT'
      and movement_type = 'ATTACK'
      and arrival_day <= v_new_day
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
      v_current_year,
      'Varios ejércitos han combatido por ' || v_target.name || '. El ejército atacante más fuerte ha conquistado el territorio.',
      'CONQUEST',
      v_target.id,
      v_winner_kingdom_id
    );
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

select 'Conquistas actualizadas: territorios conquistados quedan a 0 soldados.' as result;
