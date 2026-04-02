-- =============================================================================
-- calendar_events: leitura para toda a gente autenticada; escrita só com
-- created_by = auth.uid() (alinha com o que a app envia no insert).
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

drop policy if exists calendar_events_insert_own on public.calendar_events;
create policy calendar_events_insert_own
  on public.calendar_events
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists calendar_events_update_own on public.calendar_events;
create policy calendar_events_update_own
  on public.calendar_events
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists calendar_events_delete_own on public.calendar_events;
create policy calendar_events_delete_own
  on public.calendar_events
  for delete
  to authenticated
  using (created_by = auth.uid());
