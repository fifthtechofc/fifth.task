-- =============================================================================
-- calendar_events: RLS permissivo para authenticated (equipa interna / um tenant).
-- Corrige: "new row violates row-level security policy for table calendar_events"
-- Executar no Supabase: SQL Editor → Run.
-- =============================================================================

alter table if exists public.calendar_events enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.calendar_events to authenticated;

drop policy if exists calendar_events_select_authenticated on public.calendar_events;
create policy calendar_events_select_authenticated
  on public.calendar_events
  for select
  to authenticated
  using (true);

drop policy if exists calendar_events_insert_authenticated on public.calendar_events;
create policy calendar_events_insert_authenticated
  on public.calendar_events
  for insert
  to authenticated
  with check (true);

drop policy if exists calendar_events_update_authenticated on public.calendar_events;
create policy calendar_events_update_authenticated
  on public.calendar_events
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists calendar_events_delete_authenticated on public.calendar_events;
create policy calendar_events_delete_authenticated
  on public.calendar_events
  for delete
  to authenticated
  using (true);
