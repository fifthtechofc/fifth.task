-- Notificações in-app: quadro criado, tarefa criada, tarefa mudou de coluna.
-- Executar no SQL Editor depois de app_notifications.sql, notify_card_assignees_rpc.sql e board_members.sql.

-- auth.uid() por vezes vem nulo em funções SECURITY DEFINER; reforçamos com o claim JWT.
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

-- ---------------------------------------------------------------------------
-- Quadro criado → notifica o criador
-- ---------------------------------------------------------------------------
create or replace function public.notify_board_created_in_app(
  p_board_id uuid,
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
  creator uuid;
  actor_avatar text;
begin
  if actor_id is null then
    raise exception 'Não autenticado';
  end if;

  select b.title, b.created_by into board_title_val, creator
  from public.boards b
  where b.id = p_board_id;

  if creator is null then
    raise exception 'Quadro inválido';
  end if;

  if creator <> actor_id then
    raise exception 'Sem permissão';
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = creator) then
    return 0;
  end if;

  slug := nullif(trim(p_board_path_slug), '');
  if slug is null or slug = '' then
    slug := trim(both '-' from lower(regexp_replace(coalesce(board_title_val, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  end if;
  if slug is null or slug = '' then
    slug := 'board';
  end if;

  href := '/boards/' || slug || '?id=' || p_board_id::text;

  select nullif(trim(p.avatar_url), '') into actor_avatar
  from public.profiles p where p.id = actor_id limit 1;

  insert into public.app_notifications (
    user_id, type, title, body, href, actor_id, image_src, board_id, card_id
  )
  values (
    creator,
    'board_created',
    'Quadro criado',
    '«' || left(coalesce(board_title_val, 'Quadro'), 160) || '»',
    href,
    actor_id,
    actor_avatar,
    p_board_id,
    null
  );

  return 1;
end;
$$;

revoke all on function public.notify_board_created_in_app(uuid, text) from public;
grant execute on function public.notify_board_created_in_app(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Nova tarefa → notifica o criador (assignees já recebem notify_card_assignees_in_app)
-- ---------------------------------------------------------------------------
create or replace function public.notify_task_created_in_app(
  p_board_id uuid,
  p_card_id uuid,
  p_column_title text,
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
  card_title_val text;
  slug text;
  href text;
  creator uuid;
  actor_avatar text;
  col_title text;
begin
  if actor_id is null then
    raise exception 'Não autenticado';
  end if;

  select bc.title, bc.created_by
  into card_title_val, creator
  from public.board_cards bc
  where bc.id = p_card_id and bc.board_id = p_board_id;

  if creator is null then
    raise exception 'Tarefa inválida';
  end if;

  if creator <> actor_id then
    raise exception 'Sem permissão';
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = creator) then
    return 0;
  end if;

  select b.title into board_title_val from public.boards b where b.id = p_board_id limit 1;

  col_title := left(coalesce(nullif(trim(p_column_title), ''), 'Coluna'), 120);

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

  insert into public.app_notifications (
    user_id, type, title, body, href, actor_id, image_src, board_id, card_id
  )
  values (
    creator,
    'task_created',
    'Nova tarefa',
    '«' || left(coalesce(card_title_val, 'Tarefa'), 120) || '» na coluna «' || col_title || '» · ' || coalesce(board_title_val, 'Quadro'),
    href,
    actor_id,
    actor_avatar,
    p_board_id,
    p_card_id
  );

  return 1;
end;
$$;

revoke all on function public.notify_task_created_in_app(uuid, uuid, text, text) from public;
grant execute on function public.notify_task_created_in_app(uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tarefa mudou de coluna — núcleo (SQL estático, sem EXECUTE).
-- Inclui sempre quem move (p_actor) + criador/responsáveis do card + criador do quadro.
-- Chamado pelo trigger em board_cards e, opcionalmente, por notify_task_moved_in_app (RPC).
-- ---------------------------------------------------------------------------
create or replace function public.notify_task_column_moved_internal(
  p_actor uuid,
  p_board_id uuid,
  p_card_id uuid,
  p_to_column_title text,
  p_board_path_slug text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  board_title_val text;
  card_title_val text;
  slug text;
  href text;
  actor_avatar text;
  col_title text;
  n int := 0;
  body_text text;
begin
  if p_actor is null then
    return 0;
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = p_actor) then
    return 0;
  end if;

  if not exists (
    select 1 from public.board_cards bc
    where bc.id = p_card_id and bc.board_id = p_board_id
  ) then
    return 0;
  end if;

  begin
    perform set_config('row_security', 'off', true);
  exception
    when others then
      null;
  end;

  select bc.title into card_title_val
  from public.board_cards bc
  where bc.id = p_card_id
  limit 1;

  select b.title into board_title_val
  from public.boards b
  where b.id = p_board_id
  limit 1;

  col_title := left(coalesce(nullif(trim(p_to_column_title), ''), 'Coluna'), 120);

  slug := nullif(trim(p_board_path_slug), '');
  if slug is null or slug = '' then
    slug := trim(both '-' from lower(regexp_replace(coalesce(board_title_val, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  end if;
  if slug is null or slug = '' then
    slug := 'board';
  end if;

  href := '/boards/' || slug || '?id=' || p_board_id::text || '&card=' || p_card_id::text;

  select nullif(trim(p.avatar_url), '') into actor_avatar
  from public.profiles p
  where p.id = p_actor
  limit 1;

  body_text :=
    '«' || left(coalesce(card_title_val, 'Tarefa'), 120) || '» → «' || col_title || '» · '
    || coalesce(board_title_val, 'Quadro');

  insert into public.app_notifications (
    user_id, type, title, body, href, actor_id, image_src, board_id, card_id
  )
  select distinct on (r.uid)
    r.uid,
    'task_column_changed',
    'Tarefa mudou de coluna',
    body_text,
    href,
    p_actor,
    actor_avatar,
    p_board_id,
    p_card_id
  from (
    select p_actor as uid
    union
    select bc.created_by
    from public.board_cards bc
    where bc.id = p_card_id
      and bc.created_by is not null
      and bc.created_by is distinct from p_actor
    union
    select bc.assigned_to
    from public.board_cards bc
    where bc.id = p_card_id
      and bc.assigned_to is not null
      and bc.assigned_to is distinct from p_actor
    union
    select b.created_by
    from public.boards b
    where b.id = p_board_id
      and b.created_by is not null
      and b.created_by is distinct from p_actor
  ) r
  where exists (select 1 from public.profiles pr where pr.id = r.uid)
  order by r.uid;

  get diagnostics n = row_count;

  begin
    insert into public.app_notifications (
      user_id, type, title, body, href, actor_id, image_src, board_id, card_id
    )
    select distinct on (ca.profile_id)
      ca.profile_id,
      'task_column_changed',
      'Tarefa mudou de coluna',
      body_text,
      href,
      p_actor,
      actor_avatar,
      p_board_id,
      p_card_id
    from public.card_assignees ca
    where ca.card_id = p_card_id
      and ca.profile_id is distinct from p_actor
      and exists (select 1 from public.profiles pr where pr.id = ca.profile_id)
      and not exists (
        select 1 from public.app_notifications x
        where x.user_id = ca.profile_id
          and x.card_id = p_card_id
          and x.type = 'task_column_changed'
          and x.created_at > (now() - interval '2 seconds')
      )
    order by ca.profile_id;
  exception
    when undefined_table then
      null;
    when undefined_column then
      begin
        insert into public.app_notifications (
          user_id, type, title, body, href, actor_id, image_src, board_id, card_id
        )
        select distinct on (ca.user_id)
          ca.user_id,
          'task_column_changed',
          'Tarefa mudou de coluna',
          body_text,
          href,
          p_actor,
          actor_avatar,
          p_board_id,
          p_card_id
        from public.card_assignees ca
        where ca.card_id = p_card_id
          and ca.user_id is distinct from p_actor
          and exists (select 1 from public.profiles pr where pr.id = ca.user_id)
          and not exists (
            select 1 from public.app_notifications x
            where x.user_id = ca.user_id
              and x.card_id = p_card_id
              and x.type = 'task_column_changed'
              and x.created_at > (now() - interval '2 seconds')
          )
        order by ca.user_id;
      exception
        when undefined_table then
          null;
        when undefined_column then
          null;
      end;
  end;

  begin
    insert into public.app_notifications (
      user_id, type, title, body, href, actor_id, image_src, board_id, card_id
    )
    select distinct on (bm.profile_id)
      bm.profile_id,
      'task_column_changed',
      'Tarefa mudou de coluna',
      body_text,
      href,
      p_actor,
      actor_avatar,
      p_board_id,
      p_card_id
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.profile_id is distinct from p_actor
      and exists (select 1 from public.profiles pr where pr.id = bm.profile_id)
      and not exists (
        select 1 from public.app_notifications x
        where x.user_id = bm.profile_id
          and x.card_id = p_card_id
          and x.type = 'task_column_changed'
          and x.created_at > (now() - interval '2 seconds')
      )
    order by bm.profile_id;
  exception
    when undefined_table then
      null;
    when undefined_column then
      begin
        insert into public.app_notifications (
          user_id, type, title, body, href, actor_id, image_src, board_id, card_id
        )
        select distinct on (bm.user_id)
          bm.user_id,
          'task_column_changed',
          'Tarefa mudou de coluna',
          body_text,
          href,
          p_actor,
          actor_avatar,
          p_board_id,
          p_card_id
        from public.board_members bm
        where bm.board_id = p_board_id
          and bm.user_id is distinct from p_actor
          and exists (select 1 from public.profiles pr where pr.id = bm.user_id)
          and not exists (
            select 1 from public.app_notifications x
            where x.user_id = bm.user_id
              and x.card_id = p_card_id
              and x.type = 'task_column_changed'
              and x.created_at > (now() - interval '2 seconds')
          )
        order by bm.user_id;
      exception
        when undefined_table then
          null;
        when undefined_column then
          null;
      end;
  end;

  return n;
end;
$$;

revoke all on function public.notify_task_column_moved_internal(uuid, uuid, uuid, text, text) from public;

-- RPC (browser): mesmo efeito que o trigger; podes chamar só um dos dois. O trigger cobre sempre o UPDATE.
create or replace function public.notify_task_moved_in_app(
  p_board_id uuid,
  p_card_id uuid,
  p_to_column_title text,
  p_board_path_slug text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid := public.app_notifications_request_user_id();
begin
  if aid is null then
    raise exception 'Não autenticado';
  end if;
  return public.notify_task_column_moved_internal(
    aid,
    p_board_id,
    p_card_id,
    p_to_column_title,
    p_board_path_slug
  );
end;
$$;

revoke all on function public.notify_task_moved_in_app(uuid, uuid, text, text) from public;
grant execute on function public.notify_task_moved_in_app(uuid, uuid, text, text) to authenticated;

-- Trigger: dispara no UPDATE de column_id (mesma transação que o drag-and-drop do Supabase).
create or replace function public.trg_notify_board_card_column_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col_title text;
  mover uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.column_id is not distinct from old.column_id then
    return new;
  end if;

  select left(coalesce(nullif(trim(bc.title), ''), 'Coluna'), 120)
  into col_title
  from public.board_columns bc
  where bc.id = new.column_id
  limit 1;

  col_title := coalesce(col_title, 'Coluna');

  mover := public.app_notifications_request_user_id();
  if mover is null then
    select bc.created_by into mover from public.board_cards bc where bc.id = new.id limit 1;
  end if;

  perform public.notify_task_column_moved_internal(
    mover,
    new.board_id,
    new.id,
    col_title,
    null
  );

  return new;
end;
$$;

drop trigger if exists board_cards_column_change_app_notify on public.board_cards;
drop function if exists public.app_notify_on_board_card_column_change();

create trigger board_cards_column_change_app_notify
  after update of column_id on public.board_cards
  for each row
  when (old.column_id is distinct from new.column_id)
  execute procedure public.trg_notify_board_card_column_changed();
