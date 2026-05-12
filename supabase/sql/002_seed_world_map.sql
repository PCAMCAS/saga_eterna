-- Saga Eterna - Mundo oficial v1
-- Reinos, líderes, capitales y ciudades iniciales

alter table public.kingdoms
add column if not exists leader text;

-- Limpiar datos de prueba y mundo anterior

delete from public.global_logs;
delete from public.player_actions;
delete from public.troop_movements;
delete from public.routes;

update public.profiles
set kingdom_id = null;

update public.kingdoms
set capital_territory_id = null;

delete from public.territories;
delete from public.kingdoms;

-- Reinos definitivos

insert into public.kingdoms (name, leader, description, color)
values
  (
    'Reino Visigodo',
    'Pelayo',
    'Antiguo poder cristiano de Hispania, nacido entre montañas y juramentos de reconquista.',
    '#c58a2a'
  ),
  (
    'Reino de Castilla',
    'El Cid',
    'Reino de frontera, acero y honor, forjado entre fortalezas, mesetas y campañas interminables.',
    '#d4a247'
  ),
  (
    'Al-Ándalus',
    'Almanzor',
    'Potencia andalusí de riqueza, ciencia y guerra, asentada entre ciudades brillantes y ejércitos disciplinados.',
    '#6f9f4a'
  ),
  (
    'Dominios Vikingos',
    'Ragnar Lodbrok',
    'Señores del norte, navegantes y saqueadores, dueños de rutas heladas y costas temidas.',
    '#6f8fa3'
  ),
  (
    'Reinos Anglo-Sajones',
    'Alfredo el Grande',
    'Reinos insulares de tradición, murallas y resistencia frente a invasores del mar.',
    '#d1ad3f'
  ),
  (
    'Imperio Carolingio',
    'Carlomagno',
    'Gran imperio occidental de coronas, obispos, caballería pesada y ambición continental.',
    '#8d78ad'
  ),
  (
    'Valaquia',
    'Vlad Tepes',
    'Señorío oriental de bosques, fortalezas y terror, defendido por montañas y leyendas oscuras.',
    '#b7885a'
  ),
  (
    'Estados Cruzados',
    'Balduino IV',
    'Reinos latinos de Oriente, sostenidos por fe, fortalezas y espadas en tierra sagrada.',
    '#d29a4a'
  ),
  (
    'Sultanato de Saladino',
    'Saladino',
    'Poder musulmán de Oriente, unido por disciplina, fe y grandes ciudades del desierto.',
    '#7f9b5a'
  ),
  (
    'Horda Mongola',
    'Gengis Kan',
    'Imperio de jinetes nómadas, velocidad implacable y conquista sin horizonte.',
    '#c28b55'
  );

-- Ciudades
-- x/y son coordenadas aproximadas en porcentaje sobre el mapa visual.

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Cangas de Onís', 'CAPITAL', 8, 57, 0, id
from public.kingdoms
where name = 'Reino Visigodo';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Oviedo', 'CITY', 9, 60, 0, id
from public.kingdoms
where name = 'Reino Visigodo';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'León', 'CITY', 11, 65, 0, id
from public.kingdoms
where name = 'Reino Visigodo';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Toledo', 'CITY', 10, 69, 0, id
from public.kingdoms
where name = 'Reino Visigodo';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Burgos', 'CAPITAL', 16, 61, 0, id
from public.kingdoms
where name = 'Reino de Castilla';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Vivar', 'CITY', 11, 73, 0, id
from public.kingdoms
where name = 'Reino de Castilla';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Valencia', 'CITY', 20, 74, 0, id
from public.kingdoms
where name = 'Reino de Castilla';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Zaragoza', 'CITY', 23, 66, 0, id
from public.kingdoms
where name = 'Reino de Castilla';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Córdoba', 'CAPITAL', 10, 79, 0, id
from public.kingdoms
where name = 'Al-Ándalus';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Sevilla', 'CITY', 5, 80, 0, id
from public.kingdoms
where name = 'Al-Ándalus';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Málaga', 'CITY', 11, 84, 0, id
from public.kingdoms
where name = 'Al-Ándalus';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Granada', 'CITY', 15, 85, 0, id
from public.kingdoms
where name = 'Al-Ándalus';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Hedeby', 'CAPITAL', 40, 29, 0, id
from public.kingdoms
where name = 'Dominios Vikingos';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Ribe', 'CITY', 35, 28, 0, id
from public.kingdoms
where name = 'Dominios Vikingos';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Birka', 'CITY', 47, 16, 0, id
from public.kingdoms
where name = 'Dominios Vikingos';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Kaupang', 'CITY', 38, 17, 0, id
from public.kingdoms
where name = 'Dominios Vikingos';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Winchester', 'CAPITAL', 20, 40, 0, id
from public.kingdoms
where name = 'Reinos Anglo-Sajones';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Londres', 'CITY', 24, 35, 0, id
from public.kingdoms
where name = 'Reinos Anglo-Sajones';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'York', 'CITY', 23, 29, 0, id
from public.kingdoms
where name = 'Reinos Anglo-Sajones';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Canterbury', 'CITY', 25, 39, 0, id
from public.kingdoms
where name = 'Reinos Anglo-Sajones';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Aquisgrán', 'CAPITAL', 32, 40, 0, id
from public.kingdoms
where name = 'Imperio Carolingio';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'París', 'CITY', 27, 47, 0, id
from public.kingdoms
where name = 'Imperio Carolingio';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Pavía', 'CITY', 36, 57, 0, id
from public.kingdoms
where name = 'Imperio Carolingio';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Roma', 'CITY', 41, 67, 0, id
from public.kingdoms
where name = 'Imperio Carolingio';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Târgoviște', 'CAPITAL', 58, 51, 0, id
from public.kingdoms
where name = 'Valaquia';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Curtea de Argeș', 'CITY', 56, 53, 0, id
from public.kingdoms
where name = 'Valaquia';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Bucarest', 'CITY', 59, 55, 0, id
from public.kingdoms
where name = 'Valaquia';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Giurgiu', 'CITY', 57, 58, 0, id
from public.kingdoms
where name = 'Valaquia';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Jerusalén', 'CAPITAL', 81, 87, 0, id
from public.kingdoms
where name = 'Estados Cruzados';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Acre', 'CITY', 82, 84, 0, id
from public.kingdoms
where name = 'Estados Cruzados';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Tiro', 'CITY', 82, 79, 0, id
from public.kingdoms
where name = 'Estados Cruzados';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Ascalón', 'CITY', 80, 91, 0, id
from public.kingdoms
where name = 'Estados Cruzados';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'El Cairo', 'CAPITAL', 65, 91, 0, id
from public.kingdoms
where name = 'Sultanato de Saladino';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Damasco', 'CITY', 73, 81, 0, id
from public.kingdoms
where name = 'Sultanato de Saladino';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Alepo', 'CITY', 72, 69, 0, id
from public.kingdoms
where name = 'Sultanato de Saladino';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Hama', 'CITY', 75, 73, 0, id
from public.kingdoms
where name = 'Sultanato de Saladino';


insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Karakórum', 'CAPITAL', 93, 22, 0, id
from public.kingdoms
where name = 'Horda Mongola';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Samarcanda', 'CITY', 92, 36, 0, id
from public.kingdoms
where name = 'Horda Mongola';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Bujará', 'CITY', 90, 43, 0, id
from public.kingdoms
where name = 'Horda Mongola';

insert into public.territories (name, type, x, y, soldiers, owner_kingdom_id)
select 'Merv', 'CITY', 92, 51, 0, id
from public.kingdoms
where name = 'Horda Mongola';

-- Marcar capitales

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Reino Visigodo'
and t.name = 'Cangas de Onís';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Reino de Castilla'
and t.name = 'Burgos';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Al-Ándalus'
and t.name = 'Córdoba';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Dominios Vikingos'
and t.name = 'Hedeby';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Reinos Anglo-Sajones'
and t.name = 'Winchester';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Imperio Carolingio'
and t.name = 'Aquisgrán';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Valaquia'
and t.name = 'Târgoviște';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Estados Cruzados'
and t.name = 'Jerusalén';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Sultanato de Saladino'
and t.name = 'El Cairo';

update public.kingdoms k
set capital_territory_id = t.id
from public.territories t
where k.name = 'Horda Mongola'
and t.name = 'Karakórum';

-- Registro inicial

insert into public.global_logs (game_day, year, message, type)
values
  (1, 792, 'El mundo de Saga Eterna ha sido trazado. Diez potencias se preparan para la guerra.', 'SYSTEM');

-- Comprobación rápida

select name, leader from public.kingdoms order by name;
select name, type, soldiers from public.territories order by name;
