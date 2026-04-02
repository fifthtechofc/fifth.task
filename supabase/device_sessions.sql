-- Device sessions (application-level session limiting)
-- Enforces a maximum number of active devices per user.

create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz null,
  unique (user_id, device_id)
);

alter table public.device_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'device_sessions' and policyname = 'device_sessions_select_own'
  ) then
    create policy device_sessions_select_own
      on public.device_sessions
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'device_sessions' and policyname = 'device_sessions_update_own'
  ) then
    create policy device_sessions_update_own
      on public.device_sessions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- Register / refresh device session and revoke old devices beyond max_sessions.
create or replace function public.register_device_session(
  p_device_id text,
  p_max_sessions int default 3
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_device_id is null or length(trim(p_device_id)) < 10 then
    raise exception 'invalid_device_id';
  end if;

  insert into public.device_sessions(user_id, device_id, last_seen_at)
  values (v_user_id, trim(p_device_id), now())
  on conflict (user_id, device_id)
  do update set last_seen_at = now(), revoked_at = null;

  -- Revoke oldest active sessions beyond limit.
  with active as (
    select id
    from public.device_sessions
    where user_id = v_user_id and revoked_at is null
    order by last_seen_at desc
  ),
  to_revoke as (
    select id
    from active
    offset greatest(p_max_sessions, 0)
  )
  update public.device_sessions ds
    set revoked_at = now()
  from to_revoke r
  where ds.id = r.id;
end;
$$;

revoke all on function public.register_device_session(text, int) from public;
grant execute on function public.register_device_session(text, int) to authenticated;

create or replace function public.is_device_session_active(p_device_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.device_sessions
    where user_id = auth.uid()
      and device_id = trim(p_device_id)
      and revoked_at is null
  );
$$;

revoke all on function public.is_device_session_active(text) from public;
grant execute on function public.is_device_session_active(text) to authenticated;

