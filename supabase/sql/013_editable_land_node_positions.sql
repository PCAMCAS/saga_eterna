-- Saga Eterna - Coordenadas editables de nodos terrestres
-- Modifica x / y a mano y ejecuta este SQL en Supabase.
-- Coordenadas en porcentaje sobre la imagen completa del mapa.

-- NORTE / CENTRO DE EUROPA
-- Conecta Dominios Vikingos con Imperio Carolingio.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Llanura Sajona', 'STATION', 36.3, 34.2, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 36.3, y = 34.2, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Llanura Sajona';


-- HISPANIA / FRANCIA
-- Paso occidental desde Burgos hacia Francia.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Paso de Roncesvalles', 'STATION', 22.4, 52.5, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 22.4, y = 52.5, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Paso de Roncesvalles';

-- Paso oriental desde Zaragoza hacia Francia.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Paso de los Pirineos', 'STATION', 24.4, 56.8, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 24.4, y = 56.8, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Paso de los Pirineos';


-- FRANCIA / ITALIA
-- Paso terrestre hacia Italia.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Paso de los Alpes', 'STATION', 35.4, 52.8, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 35.4, y = 52.8, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Paso de los Alpes';


-- ITALIA / EUROPA ORIENTAL
-- Ruta terrestre entre Italia y Valaquia.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Viena', 'STATION', 47.8, 49.8, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 47.8, y = 49.8, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Viena';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Paso del Danubio', 'STATION', 53.7, 55.4, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 53.7, y = 55.4, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Paso del Danubio';


-- VALAQUIA / ANATOLIA
-- Ruta terrestre hacia Oriente.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Constantinopla', 'STATION', 61.2, 67.3, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 61.2, y = 67.3, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Constantinopla';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Anatolia', 'STATION', 67.0, 69.0, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 67.0, y = 69.0, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Anatolia';


-- EGIPTO / LEVANTE
-- Ruta terrestre desde El Cairo hacia Jerusalén y Damasco.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Sinaí', 'STATION', 70.2, 88.0, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 71, y = 92, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Sinaí';


-- LEVANTE / ORIENTE
-- Ruta terrestre desde Alepo hacia Merv.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Mesopotamia', 'STATION', 78.2, 69.0, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 82.4, y = 62, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Mesopotamia';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Persia', 'STATION', 84.0, 89, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 94, y = 80, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Persia';


-- ESTEPA PÓNTICA
-- Ruta terrestre alternativa entre Bujará y Bucarest.
insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Estepa Póntica Oriental', 'STATION', 78.2, 48.2, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 78.2, y = 42, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Estepa Póntica Oriental';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
values
  ('Estepa Póntica Occidental', 'STATION', 67.4, 51.5, 0, null)
on conflict (name) do nothing;

update public.territories
set x = 67.4, y = 50, type = 'STATION', soldiers = 0, owner_kingdom_id = null
where name = 'Estepa Póntica Occidental';


-- Comprobación visual
select name, type, x, y
from public.territories
where name in (
  'Llanura Sajona',
  'Paso de Roncesvalles',
  'Paso de los Pirineos',
  'Paso de los Alpes',
  'Viena',
  'Paso del Danubio',
  'Constantinopla',
  'Anatolia',
  'Sinaí',
  'Mesopotamia',
  'Persia',
  'Estepa Póntica Oriental',
  'Estepa Póntica Occidental'
)
order by name;
