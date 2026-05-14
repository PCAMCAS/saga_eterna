-- Saga Eterna - Mercenarios inmediatos
-- Los mercenarios se compran en capitales propias usando oro almacenado en esa capital.
-- Coste normal: 10 oro.
-- Capital en disputa: 20 oro.
-- Aparecen inmediatamente en la capital.

alter table public.territories
add column if not exists mercenaries integer not null default 0;

alter table public.territories
drop constraint if exists territories_mercenaries_check;

alter table public.territories
add constraint territories_mercenaries_check
check (mercenaries >= 0);

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

  update public.territories
  set
    soldiers = coalesce(soldiers, 0) + p_amount,
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

select 'Mercenarios inmediatos activados correctamente.' as result;
