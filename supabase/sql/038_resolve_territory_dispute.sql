-- Saga Eterna - Resolver disputa de territorio
-- Solo admin puede resolver el ganador.

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

  if p_winner_kingdom_id not in (
    v_dispute.attacker_kingdom_id,
    v_dispute.defender_kingdom_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'El ganador debe ser atacante o defensor.'
    );
  end if;

  select id, name, soldiers
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

  update public.territories
  set
    owner_kingdom_id = p_winner_kingdom_id,
    soldiers = case
      when p_winner_kingdom_id = v_dispute.attacker_kingdom_id
        then greatest(v_dispute.attacker_soldiers, 1)
      else
        greatest(coalesce(soldiers, 0), 1)
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
    'CONQUEST',
    v_territory.id,
    p_winner_kingdom_id
  );

  return jsonb_build_object(
    'ok', true,
    'message', v_message,
    'territory', v_territory.name,
    'winner', v_winner.name
  );
end;
$$;

grant execute on function public.resolve_territory_dispute(uuid, uuid)
to authenticated;

select 'RPC resolve_territory_dispute creada correctamente.' as result;
