-- Saga Eterna - Distinguir movimientos manuales y automáticos

alter table public.troop_movements
add column if not exists is_automatic boolean not null default false;

create index if not exists troop_movements_is_automatic_idx
on public.troop_movements(is_automatic);

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'troop_movements'
order by ordinal_position;
