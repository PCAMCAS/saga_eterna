-- Saga Eterna - Corregir advance_game_day para usar WHERE
-- Supabase/PostgREST exige WHERE en UPDATE.

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
  v_resolved_count integer := 0;
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

    v_resolved_count := v_resolved_count + 1;
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
    'Ha comenzado el día ' || v_new_day || ' de la campaña.',
    'SYSTEM'
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'Día avanzado a ' || v_new_day || '. Refuerzos resueltos: ' || v_resolved_count || '.',
    'old_day', v_old_day,
    'new_day', v_new_day,
    'resolved_movements', v_resolved_count
  );
end;
$$;

grant execute on function public.advance_game_day()
to authenticated;

select 'RPC advance_game_day corregida con WHERE.' as result;
