-- Saga Eterna - Un jugador por reino
-- Permite muchos perfiles sin reino, pero solo un perfil por kingdom_id.

create unique index if not exists profiles_unique_kingdom_id
on public.profiles(kingdom_id)
where kingdom_id is not null;

select
  p.kingdom_id,
  k.name as kingdom,
  count(*) as players
from public.profiles p
left join public.kingdoms k on k.id = p.kingdom_id
where p.kingdom_id is not null
group by p.kingdom_id, k.name
order by k.name;
