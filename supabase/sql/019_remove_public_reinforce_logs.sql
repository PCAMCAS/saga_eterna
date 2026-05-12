-- Saga Eterna - Eliminar registros públicos de refuerzos
-- Los movimientos de tropas deben ser privados.

delete from public.global_logs
where type = 'REINFORCE';

select id, game_day, year, type, message
from public.global_logs
order by created_at desc;
