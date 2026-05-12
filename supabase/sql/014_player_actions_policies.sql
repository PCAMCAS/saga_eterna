-- Saga Eterna - Políticas para acciones de jugador

alter table public.player_actions enable row level security;
alter table public.global_logs enable row level security;
alter table public.game_state enable row level security;

drop policy if exists "Users can read own player actions" on public.player_actions;
drop policy if exists "Users can insert own player actions" on public.player_actions;
drop policy if exists "Public read game state" on public.game_state;
drop policy if exists "Authenticated insert global logs" on public.global_logs;

create policy "Users can read own player actions"
on public.player_actions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own player actions"
on public.player_actions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Public read game state"
on public.game_state
for select
to anon, authenticated
using (true);

create policy "Authenticated insert global logs"
on public.global_logs
for insert
to authenticated
with check (true);

select 'Políticas de acciones creadas correctamente.' as result;
