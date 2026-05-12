-- Saga Eterna - Restringir movimientos visibles por facción
-- Un jugador solo puede ver movimientos de su propio reino.

alter table public.troop_movements enable row level security;

drop policy if exists "Users can read own troop movements" on public.troop_movements;
drop policy if exists "Users can insert own troop movements" on public.troop_movements;
drop policy if exists "Users can update own troop movements" on public.troop_movements;
drop policy if exists "Users can read kingdom troop movements" on public.troop_movements;
drop policy if exists "Users can insert own kingdom troop movements" on public.troop_movements;
drop policy if exists "Users can update own kingdom troop movements" on public.troop_movements;

create policy "Users can read kingdom troop movements"
on public.troop_movements
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
);

create policy "Users can insert own kingdom troop movements"
on public.troop_movements
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
);

create policy "Users can update own kingdom troop movements"
on public.troop_movements
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.kingdom_id = troop_movements.kingdom_id
  )
);

select
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'troop_movements'
order by policyname;
