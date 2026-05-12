-- Saga Eterna - Red de rutas v2
-- Sustituye las rutas directas largas por una red con nodos intermedios.

delete from public.routes;

-- Asegurar que las estaciones pueden no tener dueño

alter table public.territories
alter column owner_kingdom_id drop not null;

alter table public.territories
drop constraint if exists territories_owner_required_for_cities;

alter table public.territories
add constraint territories_owner_required_for_cities
check (
  type = 'STATION'
  or owner_kingdom_id is not null
);

-- Nodos terrestres estratégicos

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Paso de los Pirineos', 'STATION', 25, 56, 0, null),
  ('Costa de Aquitania', 'STATION', 23, 49, 0, null),
  ('Paso de los Alpes', 'STATION', 35, 52, 0, null),
  ('Llanura Lombarda', 'STATION', 37, 55, 0, null),
  ('Ruta del Danubio Occidental', 'STATION', 47, 56, 0, null),
  ('Ruta del Danubio Oriental', 'STATION', 54, 57, 0, null),
  ('Puerta de los Balcanes', 'STATION', 59, 63, 0, null),
  ('Anatolia Occidental', 'STATION', 63, 70, 0, null),
  ('Anatolia Oriental', 'STATION', 70, 68, 0, null),
  ('Ruta del Cáucaso', 'STATION', 76, 58, 0, null),
  ('Ruta de Persia', 'STATION', 82, 57, 0, null),
  ('Ruta de la Seda Occidental', 'STATION', 86, 50, 0, null),
  ('Ruta de la Seda Central', 'STATION', 89, 44, 0, null)
on conflict (name) do nothing;

-- Nodos marítimos

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

-- Función auxiliar

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

-- Hispania: rutas internas

select public.create_bidirectional_route('Cangas de Onís', 'Oviedo');
select public.create_bidirectional_route('Oviedo', 'León');
select public.create_bidirectional_route('León', 'Toledo');

select public.create_bidirectional_route('Burgos', 'Vivar');
select public.create_bidirectional_route('Burgos', 'Zaragoza');
select public.create_bidirectional_route('Vivar', 'Valencia');
select public.create_bidirectional_route('Valencia', 'Zaragoza');

select public.create_bidirectional_route('Córdoba', 'Sevilla');
select public.create_bidirectional_route('Córdoba', 'Málaga');
select public.create_bidirectional_route('Málaga', 'Granada');
select public.create_bidirectional_route('Sevilla', 'Granada');

-- Hispania: fronteras

select public.create_bidirectional_route('León', 'Burgos');
select public.create_bidirectional_route('Toledo', 'Córdoba');
select public.create_bidirectional_route('Toledo', 'Vivar');
select public.create_bidirectional_route('Granada', 'Valencia');

-- Hispania hacia Europa

select public.create_bidirectional_route('Burgos', 'Costa de Aquitania');
select public.create_bidirectional_route('Costa de Aquitania', 'París');
select public.create_bidirectional_route('Zaragoza', 'Paso de los Pirineos');
select public.create_bidirectional_route('Paso de los Pirineos', 'París');
select public.create_bidirectional_route('Paso de los Pirineos', 'Paso de los Alpes');
select public.create_bidirectional_route('Paso de los Alpes', 'Pavía');

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

-- Mar del Norte

select public.create_bidirectional_route('Kaupang', 'Mar del Norte Septentrional');
select public.create_bidirectional_route('Birka', 'Mar del Norte Septentrional');
select public.create_bidirectional_route('Hedeby', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Ribe', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Mar del Norte Septentrional', 'Mar del Norte Occidental');
select public.create_bidirectional_route('Mar del Norte Occidental', 'York');
select public.create_bidirectional_route('Mar del Norte Occidental', 'Londres');
select public.create_bidirectional_route('Mar del Norte Occidental', 'Canterbury');

-- Canal y costa atlántica

select public.create_bidirectional_route('Canterbury', 'Canal de la Mancha');
select public.create_bidirectional_route('Winchester', 'Canal de la Mancha');
select public.create_bidirectional_route('Canal de la Mancha', 'París');
select public.create_bidirectional_route('Canal de la Mancha', 'Golfo de Vizcaya');
select public.create_bidirectional_route('Golfo de Vizcaya', 'Costa de Aquitania');
select public.create_bidirectional_route('Golfo de Vizcaya', 'Burgos');

-- Imperio Carolingio

select public.create_bidirectional_route('Aquisgrán', 'París');
select public.create_bidirectional_route('Aquisgrán', 'Llanura Lombarda');
select public.create_bidirectional_route('París', 'Paso de los Alpes');
select public.create_bidirectional_route('Paso de los Alpes', 'Llanura Lombarda');
select public.create_bidirectional_route('Llanura Lombarda', 'Pavía');
select public.create_bidirectional_route('Pavía', 'Roma');

-- Mediterráneo occidental

select public.create_bidirectional_route('Valencia', 'Mar Balear');
select public.create_bidirectional_route('Mar Balear', 'Mar Tirreno');
select public.create_bidirectional_route('Mar Tirreno', 'Roma');
select public.create_bidirectional_route('Mar Tirreno', 'Pavía');

-- Mediterráneo central y oriental

select public.create_bidirectional_route('Mar Tirreno', 'Mar Jónico');
select public.create_bidirectional_route('Mar Jónico', 'Mar Egeo');
select public.create_bidirectional_route('Mar Egeo', 'Mediterráneo Oriental');
select public.create_bidirectional_route('Mediterráneo Oriental', 'Costa del Levante');

-- Valaquia y Danubio

select public.create_bidirectional_route('Târgoviște', 'Curtea de Argeș');
select public.create_bidirectional_route('Târgoviște', 'Bucarest');
select public.create_bidirectional_route('Bucarest', 'Giurgiu');
select public.create_bidirectional_route('Curtea de Argeș', 'Giurgiu');

select public.create_bidirectional_route('Llanura Lombarda', 'Ruta del Danubio Occidental');
select public.create_bidirectional_route('Ruta del Danubio Occidental', 'Ruta del Danubio Oriental');
select public.create_bidirectional_route('Ruta del Danubio Oriental', 'Târgoviște');
select public.create_bidirectional_route('Ruta del Danubio Oriental', 'Giurgiu');

-- Balcanes y Mar Negro

select public.create_bidirectional_route('Giurgiu', 'Puerta de los Balcanes');
select public.create_bidirectional_route('Puerta de los Balcanes', 'Mar Negro Occidental');
select public.create_bidirectional_route('Bucarest', 'Mar Negro Occidental');
select public.create_bidirectional_route('Mar Negro Occidental', 'Mar Negro Oriental');
select public.create_bidirectional_route('Mar Negro Oriental', 'Anatolia Oriental');

-- Anatolia y Levante

select public.create_bidirectional_route('Mar Egeo', 'Anatolia Occidental');
select public.create_bidirectional_route('Anatolia Occidental', 'Anatolia Oriental');
select public.create_bidirectional_route('Anatolia Oriental', 'Alepo');
select public.create_bidirectional_route('Anatolia Oriental', 'Hama');

select public.create_bidirectional_route('Alepo', 'Hama');
select public.create_bidirectional_route('Hama', 'Damasco');
select public.create_bidirectional_route('Damasco', 'El Cairo');
select public.create_bidirectional_route('Damasco', 'Jerusalén');

-- Cruzados

select public.create_bidirectional_route('Jerusalén', 'Acre');
select public.create_bidirectional_route('Acre', 'Tiro');
select public.create_bidirectional_route('Jerusalén', 'Ascalón');
select public.create_bidirectional_route('Ascalón', 'Tiro');

-- Costa levantina

select public.create_bidirectional_route('Costa del Levante', 'Acre');
select public.create_bidirectional_route('Costa del Levante', 'Tiro');
select public.create_bidirectional_route('Costa del Levante', 'Damasco');
select public.create_bidirectional_route('Mediterráneo Oriental', 'Ascalón');
select public.create_bidirectional_route('El Cairo', 'Mediterráneo Oriental');

-- Oriente y Horda Mongola

select public.create_bidirectional_route('Anatolia Oriental', 'Ruta del Cáucaso');
select public.create_bidirectional_route('Ruta del Cáucaso', 'Ruta de Persia');
select public.create_bidirectional_route('Ruta de Persia', 'Merv');
select public.create_bidirectional_route('Merv', 'Bujará');
select public.create_bidirectional_route('Bujará', 'Samarcanda');
select public.create_bidirectional_route('Samarcanda', 'Karakórum');

select public.create_bidirectional_route('Ruta de Persia', 'Ruta de la Seda Occidental');
select public.create_bidirectional_route('Ruta de la Seda Occidental', 'Ruta de la Seda Central');
select public.create_bidirectional_route('Ruta de la Seda Central', 'Samarcanda');
select public.create_bidirectional_route('Ruta de la Seda Central', 'Bujará');

-- Registro global

insert into public.global_logs (game_day, year, message, type)
values
  (1, 792, 'Los caminos del mundo han sido reorganizados mediante rutas terrestres, marítimas y estaciones intermedias.', 'SYSTEM');

-- Comprobación

select
  a.name as origen,
  b.name as destino,
  r.travel_hours
from public.routes r
join public.territories a on a.id = r.from_territory_id
join public.territories b on b.id = r.to_territory_id
order by a.name, b.name;
