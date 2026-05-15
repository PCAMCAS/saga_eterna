-- Saga Eterna - Entrenamiento de soldados regulares
-- Los soldados regulares cuestan 5 oro.
-- Se entrenan en capitales con cuartel.
-- Aparecen al inicio del siguiente día.

create table if not exists public.soldier_training_orders (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,

  soldiers integer not null,
  cost_gold integer not null,

  status text not null default 'PENDING',

  ordered_day integer not null,
  ordered_year integer not null,
  ordered_tick integer not null,

  completes_day integer not null,
  completes_year integer not null,
  completes_tick integer not null,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint soldier_training_orders_soldiers_check check (soldiers > 0),
  constraint soldier_training_orders_cost_gold_check check (cost_gold >= 0),
  constraint soldier_training_orders_status_check check (status in ('PENDING', 'COMPLETED', 'CANCELLED'))
);

create index if not exists soldier_training_orders_kingdom_id_idx
on public.soldier_training_orders(kingdom_id);

create index if not exists soldier_training_orders_territory_id_idx
on public.soldier_training_orders(territory_id);

create index if not exists soldier_training_orders_status_idx
on public.soldier_training_orders(status);

create index if not exists soldier_training_orders_completes_tick_idx
on public.soldier_training_orders(completes_tick);

alter table public.soldier_training_orders enable row level security;

drop policy if exists "Users can read own soldier training orders" on public.soldier_training_orders;
drop policy if exists "Users can insert own soldier training orders" on public.soldier_training_orders;

create policy "Users can read own soldier training orders"
on public.soldier_training_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = soldier_training_orders.kingdom_id
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'castiwb@gmail.com'
);

create policy "Users can insert own soldier training orders"
on public.soldier_training_orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = soldier_training_orders.kingdom_id
  )
);

create or replace function public.barracks_training_capacity(p_level integer)
returns integer
language sql
immutable
as $$
  select case
    when p_level = 1 then 10
    when p_level = 2 then 25
    when p_level = 3 then 50
    else 0
  end;
$$;

create or replace function public.order_soldier_training(
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

  v_amount integer;
  v_capacity integer;
  v_cost integer;

  v_completion_date jsonb;
  v_completes_day integer;
  v_completes_year integer;
begin
  v_user_id := auth.uid();
  v_amount := greatest(coalesce(p_amount, 0), 0);

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes iniciar sesión para entrenar soldados.'
    );
  end if;

  if p_capital_id is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Debes seleccionar una capital.'
    );
  end if;

  if v_amount <= 0 then
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
      'message', 'Debes elegir un reino antes de entrenar soldados.'
    );
  end if;

  select current_day, current_year, current_tick
  into v_current_day, v_current_year, v_current_tick
  from public.game_state
  limit 1;

  select id, name, type, owner_kingdom_id, is_disputed
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
      'message', 'Los soldados regulares solo pueden entrenarse en capitales.'
    );
  end if;

  if v_capital.owner_kingdom_id <> v_kingdom_id then
    return jsonb_build_object(
      'ok', false,
      'message', 'Solo puedes entrenar soldados en tu propia capital.'
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

  v_capacity := public.barracks_training_capacity(coalesce(v_economy.barracks_level, 0));

  if v_capacity <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Necesitas construir un cuartel antes de entrenar soldados regulares.'
    );
  end if;

  if exists (
    select 1
    from public.soldier_training_orders
    where territory_id = v_capital.id
      and status = 'PENDING'
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', 'Ya hay una orden de entrenamiento pendiente en esta capital.'
    );
  end if;

  if v_amount > v_capacity then
    return jsonb_build_object(
      'ok', false,
      'message', 'El cuartel solo puede entrenar ' || v_capacity || ' soldados por día.'
    );
  end if;

  v_cost := v_amount * 5;

  if v_economy.gold < v_cost then
    return jsonb_build_object(
      'ok', false,
      'message', 'No hay oro suficiente en ' || v_capital.name || '. Necesitas ' || v_cost || ' oro.'
    );
  end if;

  update public.territory_economy
  set
    gold = gold - v_cost,
    updated_at = now()
  where territory_id = v_capital.id;

  v_completion_date := public.add_days_to_world_date(
    v_current_year,
    v_current_day,
    1
  );

  v_completes_year := (v_completion_date ->> 'year')::integer;
  v_completes_day := (v_completion_date ->> 'day')::integer;

  insert into public.soldier_training_orders (
    user_id,
    kingdom_id,
    territory_id,
    soldiers,
    cost_gold,
    ordered_day,
    ordered_year,
    ordered_tick,
    completes_day,
    completes_year,
    completes_tick
  )
  values (
    v_user_id,
    v_kingdom_id,
    v_capital.id,
    v_amount,
    v_cost,
    v_current_day,
    v_current_year,
    v_current_tick,
    v_completes_day,
    v_completes_year,
    v_current_tick + 1
  );

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
    'TRAIN_SOLDIERS',
    v_current_tick,
    v_capital.id,
    v_amount
  );

  return jsonb_build_object(
    'ok', true,
    'message',
      'Orden emitida: ' || v_amount || ' soldados regulares empezarán su entrenamiento en ' ||
      v_capital.name || '. Estarán disponibles el día ' || v_completes_day ||
      ' del año ' || v_completes_year || '.',
    'capital', v_capital.name,
    'soldiers', v_amount,
    'cost_gold', v_cost,
    'completes_day', v_completes_day,
    'completes_year', v_completes_year
  );
end;
$$;

grant execute on function public.order_soldier_training(uuid, integer)
to authenticated;

create or replace function public.process_soldier_training(
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
  v_order record;
  v_completed_orders integer := 0;
  v_trained_soldiers integer := 0;
begin
  for v_order in
    select *
    from public.soldier_training_orders
    where status = 'PENDING'
      and completes_tick <= p_tick
    order by completes_tick asc, created_at asc
    for update
  loop
    update public.territories
    set
      soldiers = coalesce(soldiers, 0) + v_order.soldiers,
      updated_at = now()
    where id = v_order.territory_id;

    update public.soldier_training_orders
    set
      status = 'COMPLETED',
      completed_at = now()
    where id = v_order.id;

    insert into public.kingdom_private_logs (
      kingdom_id,
      user_id,
      game_day,
      year,
      type,
      message
    )
    values (
      v_order.kingdom_id,
      v_order.user_id,
      p_day,
      p_year,
      'TRAINING',
      v_order.soldiers || ' soldados regulares han terminado su entrenamiento y se han unido a la guarnición.'
    );

    v_completed_orders := v_completed_orders + 1;
    v_trained_soldiers := v_trained_soldiers + v_order.soldiers;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'completed_orders', v_completed_orders,
    'trained_soldiers', v_trained_soldiers
  );
end;
$$;

grant execute on function public.process_soldier_training(integer, integer, integer)
to authenticated;


-- Reemplazamos process_daily_economy para incluir entrenamiento antes de producción y mantenimiento.
create or replace function public.process_daily_economy(
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
  v_gold_generated integer := 0;
  v_food_generated integer := 0;
  v_completed_orders integer := 0;
  v_order record;
  v_training_result jsonb;
  v_upkeep_result jsonb;
begin
  insert into public.territory_economy (territory_id)
  select id
  from public.territories
  on conflict (territory_id) do nothing;

  -- Completar construcciones pendientes al inicio del nuevo día.
  for v_order in
    select *
    from public.building_orders
    where status = 'PENDING'
      and completes_tick <= p_tick
    order by completes_tick asc, created_at asc
    for update
  loop
    if v_order.building_type = 'GOLD' then
      update public.territory_economy
      set
        gold_building_level = greatest(gold_building_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    elsif v_order.building_type = 'FOOD' then
      update public.territory_economy
      set
        food_building_level = greatest(food_building_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    elsif v_order.building_type = 'BARRACKS' then
      update public.territory_economy
      set
        barracks_level = greatest(barracks_level, v_order.target_level),
        updated_at = now()
      where territory_id = v_order.territory_id;
    end if;

    update public.building_orders
    set
      status = 'COMPLETED',
      completed_at = now()
    where id = v_order.id;

    v_completed_orders := v_completed_orders + 1;
  end loop;

  -- Completar entrenamiento pendiente.
  v_training_result := public.process_soldier_training(p_day, p_year, p_tick);

  -- Producción diaria de oro y comida.
  with produced as (
    update public.territory_economy e
    set
      gold = e.gold +
        case
          when t.type = 'CAPITAL' then 100 + public.gold_income_for_level(e.gold_building_level)
          when t.type = 'CITY' then public.gold_income_for_level(e.gold_building_level)
          else 0
        end,
      food = e.food +
        case
          when t.type = 'CAPITAL' then public.food_income_for_level(e.food_building_level)
          else 0
        end,
      updated_at = now()
    from public.territories t
    where t.id = e.territory_id
      and t.owner_kingdom_id is not null
      and t.type in ('CAPITAL', 'CITY')
    returning
      case
        when t.type = 'CAPITAL' then 100 + public.gold_income_for_level(e.gold_building_level)
        when t.type = 'CITY' then public.gold_income_for_level(e.gold_building_level)
        else 0
      end as gold_gained,
      case
        when t.type = 'CAPITAL' then public.food_income_for_level(e.food_building_level)
        else 0
      end as food_gained
  )
  select
    coalesce(sum(gold_gained), 0),
    coalesce(sum(food_gained), 0)
  into
    v_gold_generated,
    v_food_generated
  from produced;

  -- Mantenimiento de mercenarios tras producir oro.
  v_upkeep_result := public.process_mercenary_upkeep(p_day, p_year, p_tick);

  return jsonb_build_object(
    'ok', true,
    'gold_generated', v_gold_generated,
    'food_generated', v_food_generated,
    'completed_orders', v_completed_orders,
    'soldier_training', v_training_result,
    'mercenary_upkeep', v_upkeep_result
  );
end;
$$;

grant execute on function public.process_daily_economy(integer, integer, integer)
to authenticated;

select 'Entrenamiento de soldados regulares activado correctamente.' as result;
