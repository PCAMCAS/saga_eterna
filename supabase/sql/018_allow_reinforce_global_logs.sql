-- Saga Eterna - Permitir logs de refuerzo

alter table public.global_logs
drop constraint if exists global_logs_type_check;

alter table public.global_logs
add constraint global_logs_type_check
check (
  type in (
    'SYSTEM',
    'SCOUT',
    'REINFORCE',
    'ATTACK',
    'MOVE',
    'CONQUEST'
  )
);

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.global_logs'::regclass
  and conname = 'global_logs_type_check';
