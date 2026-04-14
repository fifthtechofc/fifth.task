-- Participantes de eventos do calendario + notificacoes in-app para atribuicao.
-- Execute no SQL Editor depois de app_notifications.sql.

create table if not exists public.calendar_event_assignees (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists calendar_event_assignees_profile_idx
  on public.calendar_event_assignees (profile_id, created_at desc);

alter table public.calendar_event_assignees enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_event_assignees'
      and policyname = 'calendar_event_assignees_select_authenticated'
  ) then
    create policy calendar_event_assignees_select_authenticated
      on public.calendar_event_assignees
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_event_assignees'
      and policyname = 'calendar_event_assignees_insert_authenticated'
  ) then
    create policy calendar_event_assignees_insert_authenticated
      on public.calendar_event_assignees
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_event_assignees'
      and policyname = 'calendar_event_assignees_delete_authenticated'
  ) then
    create policy calendar_event_assignees_delete_authenticated
      on public.calendar_event_assignees
      for delete
      to authenticated
      using (true);
  end if;
end $$;

grant select, insert, delete on table public.calendar_event_assignees to authenticated;

create or replace function public.app_notifications_request_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u uuid;
  sub text;
begin
  u := auth.uid();
  if u is not null then
    return u;
  end if;
  begin
    u := (nullif(trim(coalesce(auth.jwt() ->> 'sub', '')), ''))::uuid;
    if u is not null then
      return u;
    end if;
  exception
    when others then
      u := null;
  end;
  sub := nullif(trim(coalesce(current_setting('request.jwt.claim.sub', true), '')), '');
  if sub is null or sub = '' then
    return null;
  end if;
  begin
    return sub::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

revoke all on function public.app_notifications_request_user_id() from public;
grant execute on function public.app_notifications_request_user_id() to authenticated;

create or replace function public.notify_calendar_event_assignees_in_app(
  p_event_id uuid,
  p_event_title text,
  p_workspace_label text,
  p_assigned_user_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := public.app_notifications_request_user_id();
  actor_avatar text;
  uid uuid;
  n int := 0;
  href text := '/calendar?eventId=' || p_event_id::text;
begin
  if actor_id is null then
    raise exception 'Nao autenticado';
  end if;

  select nullif(trim(p.avatar_url), '') into actor_avatar
  from public.profiles p where p.id = actor_id limit 1;

  for uid in select distinct unnest(coalesce(p_assigned_user_ids, array[]::uuid[]))
  loop
    if uid is null or uid = actor_id then
      continue;
    end if;

    if not exists (select 1 from public.profiles pr where pr.id = uid) then
      continue;
    end if;

    insert into public.app_notifications (
      user_id, type, title, body, href, actor_id, image_src
    )
    values (
      uid,
      'calendar_event_assigned',
      'Novo evento atribuido',
      '«' || left(coalesce(nullif(trim(p_event_title), ''), 'Evento'), 140) || '» · '
        || left(coalesce(nullif(trim(p_workspace_label), ''), 'Workspace'), 120),
      href,
      actor_id,
      actor_avatar
    );

    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.notify_calendar_event_assignees_in_app(uuid, text, text, uuid[]) from public;
grant execute on function public.notify_calendar_event_assignees_in_app(uuid, text, text, uuid[]) to authenticated;
