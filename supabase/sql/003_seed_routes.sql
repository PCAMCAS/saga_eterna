-- Saga Eterna - Rutas iniciales del mundo
-- Cada ruta representa un tramo de 24 horas reales.

delete from public.routes;

-- Función auxiliar para crear rutas bidireccionales
create or replace function public.create_bidirectional_route(
  from_name text,
  to_name text,
  hours integer default 24
)
returns void
language plpgsql
as $$
declare
  from_id uuid;
  to_id uuid;
begin
  select id into from_id from public.territories where name = from_name;
  select id into to_id from public.territories where name = to_name;

  if from_id is null then
    raise exception 'Territorio origen no encontrado: %', from_name;
  end if;

  if to_id is null then
    raise exception 'Territorio destino no encontrado: %', to_name;
  end if;

  insert into public.routes (from_territory_id, to_territory_id, travel_hours)
  values (from_id, to_id, hours)
  on conflict (from_territory_id, to_territory_id) do nothing;

  insert into public.routes (from_territory_id, to_territory_id, travel_hours)
  values (to_id, from_id, hours)
  on conflict (from_territory_id, to_territory_id) do nothing;
end;
$$;

-- Hispania: Reino Visigodo
select public.create_bidirectional_route('Cangas de Onís', 'Oviedo');
select public.create_bidirectional_route('Oviedo', 'León');
select public.create_bidirectional_route('León', 'Toledo');

-- Hispania: Castilla
select public.create_bidirectional_route('Burgos', 'Vivar');
select public.create_bidirectional_route('Burgos', 'Zaragoza');
select public.create_bidirectional_route('Vivar', 'Valencia');
select public.create_bidirectional_route('Valencia', 'Zaragoza');

-- Hispania: Al-Ándalus
select public.create_bidirectional_route('Córdoba', 'Sevilla');
select public.create_bidirectional_route('Córdoba', 'Málaga');
select public.create_bidirectional_route('Málaga', 'Granada');
select public.create_bidirectional_route('Sevilla', 'Granada');

-- Fronteras de Hispania
select public.create_bidirectional_route('León', 'Burgos');
select public.create_bidirectional_route('Toledo', 'Córdoba');
select public.create_bidirectional_route('Toledo', 'Vivar');
select public.create_bidirectional_route('Valencia', 'Granada');
select public.create_bidirectional_route('Zaragoza', 'Valencia');

-- Islas británicas
select public.create_bidirectional_route('Winchester', 'Londres');
select public.create_bidirectional_route('Londres', 'Canterbury');
select public.create_bidirectional_route('Londres', 'York');
select public.create_bidirectional_route('York', 'Canterbury');

-- Vikingos
select public.create_bidirectional_route('Hedeby', 'Ribe');
select public.create_bidirectional_route('Hedeby', 'Birka');
select public.create_bidirectional_route('Birka', 'Kaupang');
select public.create_bidirectional_route('Kaupang', 'Ribe');

-- Conexiones norte-occidente
select public.create_bidirectional_route('Ribe', 'York');
select public.create_bidirectional_route('Hedeby', 'Aquisgrán');
select public.create_bidirectional_route('Canterbury', 'París');
select public.create_bidirectional_route('Winchester', 'París');

-- Imperio Carolingio
select public.create_bidirectional_route('Aquisgrán', 'París');
select public.create_bidirectional_route('Aquisgrán', 'Pavía');
select public.create_bidirectional_route('París', 'Pavía');
select public.create_bidirectional_route('Pavía', 'Roma');

-- Conexiones Occidente-Hispania
select public.create_bidirectional_route('París', 'Burgos');
select public.create_bidirectional_route('Pavía', 'Zaragoza');
select public.create_bidirectional_route('Roma', 'Valencia');

-- Europa oriental / Valaquia
select public.create_bidirectional_route('Târgoviște', 'Curtea de Argeș');
select public.create_bidirectional_route('Târgoviște', 'Bucarest');
select public.create_bidirectional_route('Bucarest', 'Giurgiu');
select public.create_bidirectional_route('Curtea de Argeș', 'Giurgiu');

-- Conexiones Carolingio-Valaquia
select public.create_bidirectional_route('Roma', 'Giurgiu');
select public.create_bidirectional_route('Pavía', 'Târgoviște');

-- Levante: Estados Cruzados
select public.create_bidirectional_route('Jerusalén', 'Acre');
select public.create_bidirectional_route('Acre', 'Tiro');
select public.create_bidirectional_route('Jerusalén', 'Ascalón');
select public.create_bidirectional_route('Ascalón', 'Tiro');

-- Sultanato de Saladino
select public.create_bidirectional_route('El Cairo', 'Damasco');
select public.create_bidirectional_route('Damasco', 'Hama');
select public.create_bidirectional_route('Hama', 'Alepo');
select public.create_bidirectional_route('Damasco', 'Alepo');

-- Fronteras Levante
select public.create_bidirectional_route('Damasco', 'Jerusalén');
select public.create_bidirectional_route('Hama', 'Tiro');
select public.create_bidirectional_route('El Cairo', 'Ascalón');

-- Horda Mongola
select public.create_bidirectional_route('Karakórum', 'Samarcanda');
select public.create_bidirectional_route('Samarcanda', 'Bujará');
select public.create_bidirectional_route('Bujará', 'Merv');
select public.create_bidirectional_route('Samarcanda', 'Merv');

-- Conexiones Oriente
select public.create_bidirectional_route('Merv', 'Alepo');
select public.create_bidirectional_route('Bujará', 'Hama');
select public.create_bidirectional_route('Samarcanda', 'Târgoviște');

-- Registro global
insert into public.global_logs (game_day, year, message, type)
values
  (1, 792, 'Los caminos del mundo han sido trazados. Las tropas ya pueden marchar entre ciudades.', 'SYSTEM');

-- Comprobación
select
  r.id,
  a.name as origen,
  b.name as destino,
  r.travel_hours
from public.routes r
join public.territories a on a.id = r.from_territory_id
join public.territories b on b.id = r.to_territory_id
order by a.name, b.name;
