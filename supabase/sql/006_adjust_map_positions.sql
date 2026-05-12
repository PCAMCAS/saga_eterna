-- Saga Eterna - Ajuste fino de posiciones sobre el mapa oficial
-- Coordenadas en porcentaje sobre la imagen completa del mapa.

-- Reino Visigodo
update public.territories set x = 5.5, y = 56.9 where name = 'Cangas de Onís';
update public.territories set x = 9.4, y = 59.2 where name = 'Oviedo';
update public.territories set x = 12.7, y = 65.8 where name = 'León';
update public.territories set x = 8.8, y = 67.8 where name = 'Toledo';

-- Reino de Castilla
update public.territories set x = 16.4, y = 61.1 where name = 'Burgos';
update public.territories set x = 11.0, y = 71.3 where name = 'Vivar';
update public.territories set x = 20.8, y = 72.0 where name = 'Valencia';
update public.territories set x = 24.2, y = 66.0 where name = 'Zaragoza';

-- Al-Ándalus
update public.territories set x = 12.2, y = 79.5 where name = 'Córdoba';
update public.territories set x = 5.5, y = 80.0 where name = 'Sevilla';
update public.territories set x = 11.1, y = 83.6 where name = 'Málaga';
update public.territories set x = 15.5, y = 84.8 where name = 'Granada';

-- Reinos Anglo-Sajones
update public.territories set x = 21.1, y = 38.3 where name = 'Winchester';
update public.territories set x = 23.6, y = 34.5 where name = 'Londres';
update public.territories set x = 23.7, y = 28.2 where name = 'York';
update public.territories set x = 25.2, y = 38.0 where name = 'Canterbury';

-- Dominios Vikingos
update public.territories set x = 35.7, y = 27.6 where name = 'Ribe';
update public.territories set x = 40.9, y = 26.6 where name = 'Hedeby';
update public.territories set x = 47.4, y = 15.3 where name = 'Birka';
update public.territories set x = 39.1, y = 15.7 where name = 'Kaupang';

-- Imperio Carolingio
update public.territories set x = 32.6, y = 39.7 where name = 'Aquisgrán';
update public.territories set x = 27.1, y = 46.3 where name = 'París';
update public.territories set x = 36.3, y = 56.3 where name = 'Pavía';
update public.territories set x = 41.3, y = 67.2 where name = 'Roma';

-- Valaquia
update public.territories set x = 58.7, y = 49.0 where name = 'Târgoviște';
update public.territories set x = 56.4, y = 52.7 where name = 'Curtea de Argeș';
update public.territories set x = 59.2, y = 53.2 where name = 'Bucarest';
update public.territories set x = 57.6, y = 56.5 where name = 'Giurgiu';

-- Estados Cruzados
update public.territories set x = 81.6, y = 86.5 where name = 'Jerusalén';
update public.territories set x = 82.1, y = 82.7 where name = 'Acre';
update public.territories set x = 82.4, y = 78.9 where name = 'Tiro';
update public.territories set x = 80.7, y = 90.7 where name = 'Ascalón';

-- Sultanato de Saladino
update public.territories set x = 65.7, y = 91.5 where name = 'El Cairo';
update public.territories set x = 73.2, y = 81.3 where name = 'Damasco';
update public.territories set x = 72.5, y = 69.3 where name = 'Alepo';
update public.territories set x = 75.8, y = 75.4 where name = 'Hama';

-- Horda Mongola
update public.territories set x = 93.0, y = 22.5 where name = 'Karakórum';
update public.territories set x = 92.3, y = 34.9 where name = 'Samarcanda';
update public.territories set x = 90.2, y = 41.4 where name = 'Bujará';
update public.territories set x = 91.9, y = 48.8 where name = 'Merv';

-- Nodos marítimos / viaje
update public.territories set x = 32.2, y = 30.7 where name = 'Mar del Norte Occidental';
update public.territories set x = 36.0, y = 22.8 where name = 'Mar del Norte Septentrional';
update public.territories set x = 27.7, y = 42.8 where name = 'Canal de la Mancha';
update public.territories set x = 23.2, y = 52.5 where name = 'Golfo de Vizcaya';

update public.territories set x = 25.7, y = 75.0 where name = 'Mar Balear';
update public.territories set x = 37.4, y = 71.5 where name = 'Mar Tirreno';
update public.territories set x = 48.0, y = 73.4 where name = 'Mar Jónico';
update public.territories set x = 58.3, y = 72.0 where name = 'Mar Egeo';

update public.territories set x = 70.0, y = 81.7 where name = 'Mediterráneo Oriental';
update public.territories set x = 78.2, y = 81.5 where name = 'Costa del Levante';

update public.territories set x = 65.6, y = 62.2 where name = 'Mar Negro Occidental';
update public.territories set x = 75.8, y = 58.7 where name = 'Mar Negro Oriental';

-- Nodos terrestres intermedios
update public.territories set x = 24.8, y = 56.8 where name = 'Paso de los Pirineos';
update public.territories set x = 23.0, y = 49.7 where name = 'Costa de Aquitania';
update public.territories set x = 35.7, y = 52.7 where name = 'Paso de los Alpes';
update public.territories set x = 38.6, y = 54.4 where name = 'Llanura Lombarda';

update public.territories set x = 49.5, y = 55.6 where name = 'Ruta del Danubio Occidental';
update public.territories set x = 54.8, y = 55.7 where name = 'Ruta del Danubio Oriental';
update public.territories set x = 60.3, y = 66.8 where name = 'Puerta de los Balcanes';

update public.territories set x = 62.8, y = 70.0 where name = 'Anatolia Occidental';
update public.territories set x = 69.2, y = 67.0 where name = 'Anatolia Oriental';

update public.territories set x = 77.6, y = 57.2 where name = 'Ruta del Cáucaso';
update public.territories set x = 82.8, y = 54.6 where name = 'Ruta de Persia';
update public.territories set x = 86.7, y = 48.5 where name = 'Ruta de la Seda Occidental';
update public.territories set x = 89.0, y = 42.8 where name = 'Ruta de la Seda Central';

select name, type, x, y
from public.territories
order by type, name;
