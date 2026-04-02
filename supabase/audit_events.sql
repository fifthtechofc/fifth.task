-- Audit / activity log
-- Stores security-relevant events for later review.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid null,
  actor_email text null,
  action text not null,
  resource_type text null,
  resource_id text null,
  ip text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.audit_events enable row level security;

-- Allow authenticated users to read only their own events by default.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_select_own'
  ) then
    create policy audit_events_select_own
      on public.audit_events
      for select
      to authenticated
      using (actor_id = auth.uid());
  end if;
end $$;

-- Helper function: log an audit event with the current auth context.
-- Uses security definer so inserts are allowed even when RLS is strict.
create or replace function public.log_audit_event(
  p_action text,
  p_metadata jsonb default '{}'::jsonb,
  p_resource_type text default null,
  p_resource_id text default null,
  p_ip text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_email text;
begin
  v_actor_id := auth.uid();
  begin
    v_actor_email := auth.jwt() ->> 'email';
  exception when others then
    v_actor_email := null;
  end;

  insert into public.audit_events(
    actor_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    ip,
    user_agent,
    metadata
  ) values (
    v_actor_id,
    v_actor_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_ip,
    p_user_agent,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_audit_event(text, jsonb, text, text, text, text) from public;
grant execute on function public.log_audit_event(text, jsonb, text, text, text, text) to anon, authenticated;

