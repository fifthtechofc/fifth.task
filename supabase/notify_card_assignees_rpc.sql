-- Notificações in-app de atribuição: chamada pelo browser com supabase.rpc (JWT do utilizador).
-- Não depende de SUPABASE_SERVICE_ROLE_KEY na API Next (ao contrário do insert admin).
-- Executa no SQL Editor se já tiveres app_notifications.

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

create or replace function public.notify_card_assignees_in_app(
  p_board_id uuid,
  p_card_id uuid,
  p_task_title text,
  p_assigned_user_ids uuid[],
  p_board_path_slug text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := public.app_notifications_request_user_id();
  board_title_val text;
  slug text;
  href text;
  uid uuid;
  actor_avatar text;
  assignee_label text;
  n int := 0;
  ids uuid[];
begin
  begin
    perform set_config('row_security', 'off', true);
  exception
    when others then
      null;
  end;

  if actor_id is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.board_cards bc
    where bc.id = p_card_id and bc.board_id = p_board_id
  ) then
    raise exception 'Card ou board inválidos';
  end if;

  ids := coalesce(p_assigned_user_ids, array[]::uuid[]);

  select b.title into board_title_val from public.boards b where b.id = p_board_id limit 1;

  slug := nullif(trim(p_board_path_slug), '');
  if slug is null or slug = '' then
    slug := trim(both '-' from lower(regexp_replace(coalesce(board_title_val, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  end if;
  if slug is null or slug = '' then
    slug := 'board';
  end if;

  href := '/boards/' || slug || '?id=' || p_board_id::text || '&card=' || p_card_id::text;

  select nullif(trim(p.avatar_url), '') into actor_avatar
  from public.profiles p where p.id = actor_id limit 1;

  for uid in select distinct unnest(ids)
  loop
    if uid is null then
      continue;
    end if;
    if not exists (select 1 from public.profiles pr where pr.id = uid) then
      continue;
    end if;

    select coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(p.display_name), ''),
      nullif(trim(p.email), ''),
      'Utilizador'
    )
    into assignee_label
    from public.profiles p
    where p.id = uid
    limit 1;

    insert into public.app_notifications (
      user_id, type, title, body, href, actor_id, image_src, board_id, card_id
    )
    values (
      uid,
      'task_assigned',
      'Nova tarefa atribuída',
      '«' || left(coalesce(nullif(trim(p_task_title), ''), 'Tarefa'), 120) || '» · «'
        || left(coalesce(board_title_val, 'Quadro'), 160) || '» · «'
        || left(coalesce(assignee_label, 'Utilizador'), 120) || '»',
      href,
      actor_id,
      actor_avatar,
      p_board_id,
      p_card_id
    );
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.notify_card_assignees_in_app(uuid, uuid, text, uuid[], text) from public;
grant execute on function public.notify_card_assignees_in_app(uuid, uuid, text, uuid[], text) to authenticated;
