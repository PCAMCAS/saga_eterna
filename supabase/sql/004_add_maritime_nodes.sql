-- Saga Eterna - Nodos marítimos y rutas navales
-- Los nodos STATION no son conquistables y no pertenecen a ningún reino.

alter table public.territories
alter column owner_kingdom_id drop not null;

-- Permitir que solo las estaciones puedan no tener dueño.
alter table public.territories
drop constraint if exists territories_owner_required_for_cities;

alter table public.territories
add constraint territories_owner_required_for_cities
check (
  type = 'STATION'
  or owner_kingdom_id is not null
);

-- Crear nodos marítimos / estaciones neutrales.
-- x/y aproximadas sobre el mapa.

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Mar del Norte Occidental', 'STATION', 30, 33, 0, null),
  ('Mar del Norte Septentrional', 'STATION', 33, 22, 0, null),
  ('Canal de la Mancha', 'STATION', 26, 43, 0, null),
  ('Golfo de Vizcaya', 'STATION', 21, 51, 0, null),
  ('Mar Balear', 'STATION', 25, 76, 0, null),
  ('Mar Tirreno', 'STATION', 38, 72, 0, null),
  ('Mar Jónico', 'STATION', 48, 74, 0, null),
  ('Mar Egeo', 'STATION', 58, 72, 0, null),
  ('Mediterráneo Oriental', 'STATION', 69, 80, 0, null),
  ('Costa del Levante', 'STATION', 77, 82, 0, null),
  ('Mar Negro Occidental', 'STATION', 64, 62, 0, null),
  ('Mar Negro Oriental', 'STATION', 72, 59, 0, null)
on conflict (name) do nothing;

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

-- Rutas marítimas del norte
select public.create_bidirectional_route('Kaupang', 'Mar del Norte Septentrional');
select public.create_bidirectional_route('Birka', 'Mar del Norte Septentrional');
select public.create_bidirectional_route('Hedeby', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Ribe', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Mar del Norte Septentrional', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Mar del Norte Occidental', 'York');
select public.create_bidirectional_route('Mar del Norte Occidental', 'Londres');
select public.create_bidirectional_route('Mar del Norte Occidental', 'Canterbury');

-- Canal y Atlántico cercano
select public.create_bidirectional_route('Canterbury', 'Canal de la Mancha');
select public.create_bidirectional_route('Winchester', 'Canal de la Mancha');
select public.create_bidirectional_route('Canal de la Mancha', 'París');
select public.create_bidirectional_route('Canal de la Mancha', 'Golfo de Vizcaya');
select public.create_bidirectional_route('Golfo de Vizcaya', 'Burgos');

-- Mediterráneo occidental
select public.create_bidirectional_route('Valencia', 'Mar Balear');
select public.create_bidirectional_route('Zaragoza', 'Mar Balear');
select public.create_bidirectional_route('Mar Balear', 'Mar Tirreno');
select public.create_bidirectional_route('Mar Tirreno', 'Roma');
select public.create_bidirectional_route('Mar Tirreno', 'Pavía');

-- Mediterráneo central y oriental
select public.create_bidirectional_route('Mar Tirreno', 'Mar Jónico');
select public.create_bidirectional_route('Mar Jónico', 'Mar Egeo');
select public.create_bidirectional_route('Mar Egeo', 'Mediterráneo Oriental');
select public.create_bidirectional_route('Mediterráneo Oriental', 'Costa del Levante');
select public.create_bidirectional_route('Costa del Levante', 'Acre');
select public.create_bidirectional_route('Costa del Levante', 'Tiro');
select public.create_bidirectional_route('Costa del Levante', 'Damasco');

-- Ruta Egipto-Levante por mar
select public.create_bidirectional_route('El Cairo', 'Mediterráneo Oriental');
select public.create_bidirectional_route('Mediterráneo Oriental', 'Ascalón');

-- Mar Negro
select public.create_bidirectional_route('Giurgiu', 'Mar Negro Occidental');
select public.create_bidirectional_route('Bucarest', 'Mar Negro Occidental');
select public.create_bidirectional_route('Mar Negro Occidental', 'Mar Negro Oriental');
select public.create_bidirectional_route('Mar Negro Oriental', 'Alepo');
select public.create_bidirectional_route('Mar Negro Oriental', 'Hama');
select public.create_bidirectional_route('Mar Negro Oriental', 'Merv');

-- Registro global
insert into public.global_logs (game_day, year, message, type)
values
  (1, 792, 'Se han abierto rutas marítimas. Las flotas podrán cruzar mares mediante nodos de viaje.', 'SYSTEM');

-- Comprobación de nodos marítimos
select name, type, x, y, owner_kingdom_id
from public.territories
where type = 'STATION'
order by name;
