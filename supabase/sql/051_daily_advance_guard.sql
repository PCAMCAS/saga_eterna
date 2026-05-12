-- Saga Eterna - Control de avance automático diario

alter table public.game_state
add column if not exists last_advanced_real_date date;

select
  current_year,
  current_day,
  current_tick,
  last_advanced_real_date
from public.game_state
limit 1;
