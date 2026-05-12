-- Saga Eterna - Refuerzo atómico
-- Todo el refuerzo ocurre dentro de una única función SQL.
-- Si algo falla, PostgreSQL revierte toda la operación.

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
  v_route_exists boolean;

  v_new_from_soldiers integer;
  v_new_target_soldiers integer;
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

  select id, name, type, soldiers, owner_kingdom_id
  into v_from
  from public.territories
  where id = p_from_territory_id
  for update;

  select id, name, type, soldiers, owner_kingdom_id
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

  if v_from.owner_kingdom_id <> v_kingdom_id or v_target.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes reforzar entre territorios de tu propio reino.'
    );
  end if;

  if p_amount > coalesce(v_from.soldiers, 0) then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay suficientes soldados en ' || v_from.name || '. Disponibles: ' || coalesce(v_from.soldiers, 0) || '.'
    );
  end if;

  select exists (
    select 1
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
  )
  into v_route_exists;

  if not v_route_exists then
    return jsonb_build_object(
      'ok', false,
      'message', 'Por ahora solo puedes reforzar territorios aliados conectados directamente por una ruta.'
    );
  end if;

  v_new_from_soldiers := coalesce(v_from.soldiers, 0) - p_amount;
  v_new_target_soldiers := coalesce(v_target.soldiers, 0) + p_amount;

  update public.territories
  set
    soldiers = v_new_from_soldiers,
    updated_at = now()
  where id = v_from.id;

  update public.territories
  set
    soldiers = v_new_target_soldiers,
    updated_at = now()
  where id = v_target.id;

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
    'message', 'Refuerzo enviado: ' || p_amount || ' soldados desde ' || v_from.name || ' hacia ' || v_target.name || '.',
    'from_territory', v_from.name,
    'target_territory', v_target.name,
    'amount', p_amount,
    'from_soldiers', v_new_from_soldiers,
    'target_soldiers', v_new_target_soldiers
  );
end;
$$;

grant execute on function public.reinforce_territory_atomic(uuid, uuid, integer)
to authenticated;

select 'RPC reinforce_territory_atomic creada correctamente.' as result;
