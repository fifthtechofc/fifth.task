-- In-app notifications (per user). Inserts for other users use the service role (API) or triggers.
-- Recipients read/update only their own rows.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'generic',
  title text not null,
  body text,
  href text,
  image_src text,
  actor_id uuid references public.profiles(id) on delete set null,
  board_id uuid references public.boards(id) on delete set null,
  card_id uuid references public.board_cards(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications (user_id, created_at desc);

create index if not exists app_notifications_user_unread_idx
  on public.app_notifications (user_id)
  where read_at is null;

alter table public.app_notifications enable row level security;

-- Com FORCE ROW LEVEL SECURITY, até o dono da tabela obedeceria às policies e os RPCs
-- SECURITY DEFINER deixariam de conseguir inserir linhas para outros utilizadores.
alter table public.app_notifications no force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_notifications' and policyname = 'app_notifications_select_own'
  ) then
    create policy app_notifications_select_own
      on public.app_notifications
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_notifications' and policyname = 'app_notifications_update_own'
  ) then
    create policy app_notifications_update_own
      on public.app_notifications
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- Optional: client-created rows for the signed-in user only (ex.: confirmação de ação).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_notifications' and policyname = 'app_notifications_insert_own'
  ) then
    create policy app_notifications_insert_own
      on public.app_notifications
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

-- Inserir linhas para outros utilizadores (user_id = destinatário) quando o JWT é o ator (RPC/trigger).
-- Coluna de perfil em board_members / card_assignees: profile_id ou user_id (detetado automaticamente).
do $$
declare
  bm_col text;
  ca_col text;
  assignee_or text;
  sql text;
begin
  select case
    when exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'board_members' and c.column_name = 'profile_id'
    ) then 'profile_id'
    when exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'board_members' and c.column_name = 'user_id'
    ) then 'user_id'
    else null
  end into bm_col;

  select case
    when exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'card_assignees' and c.column_name = 'profile_id'
    ) then 'profile_id'
    when exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'card_assignees' and c.column_name = 'user_id'
    ) then 'user_id'
    else null
  end into ca_col;

  if bm_col is null then
    raise exception 'public.board_members não tem coluna profile_id nem user_id';
  end if;

  if ca_col is not null then
    assignee_or := format(
      $c$
            or (
              card_id is not null
              and exists (
                select 1 from public.card_assignees ca
                where ca.card_id = card_id and ca.%1$I = (select auth.uid())
              )
            )
      $c$,
      ca_col
    );
  else
    assignee_or := '';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_notifications'
      and policyname = 'app_notifications_insert_as_actor'
  ) then
    drop policy app_notifications_insert_as_actor on public.app_notifications;
  end if;

  sql := format(
    $p$
    create policy app_notifications_insert_as_actor
      on public.app_notifications
      for insert
      to authenticated
      with check (
        user_id = (select auth.uid())
        or (
          (select auth.uid()) is not null
          and actor_id = (select auth.uid())
          and board_id is not null
          and (
            exists (
              select 1 from public.boards b
              where b.id = board_id and b.created_by = (select auth.uid())
            )
            or exists (
              select 1 from public.board_members bm
              where bm.board_id = board_id and bm.%1$I = (select auth.uid())
            )
            or (
              card_id is not null
              and exists (
                select 1 from public.board_cards bc
                where bc.id = card_id
                  and bc.board_id = board_id
                  and bc.created_by = (select auth.uid())
              )
            )
            %2$s
          )
          and (
            card_id is null
            or exists (
              select 1 from public.board_cards bc
              where bc.id = card_id and bc.board_id = board_id
            )
          )
        )
      )
    $p$,
    bm_col,
    assignee_or
  );

  execute sql;
end $$;

-- Realtime: enable in Dashboard > Database > Replication, or run (may error if already added):
-- alter publication supabase_realtime add table public.app_notifications;

-- After INSERT on a card comment, notify assignees (and legacy assigned_to) except the author.
-- href usa /boards/{slug}?id= como na app Next (slug aproximado a partir do título do board).
create or replace function public.app_notify_on_card_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  board_uuid uuid;
  card_title text;
  assigned_to_val uuid;
  board_title_val text;
  author_label text;
  slug text;
  href text;
begin
  select bc.board_id, bc.title, bc.assigned_to, b.title
  into board_uuid, card_title, assigned_to_val, board_title_val
  from public.board_cards bc
  left join public.boards b on b.id = bc.board_id
  where bc.id = new.card_id;

  if board_uuid is null then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.display_name), ''), nullif(trim(p.email), ''), 'Alguém')
  into author_label
  from public.profiles p
  where p.id = new.author_id;

  slug := trim(both '-' from lower(regexp_replace(coalesce(board_title_val, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  if slug is null or slug = '' then
    slug := 'board';
  end if;

  href := '/boards/' || slug || '?id=' || board_uuid::text || '&card=' || new.card_id::text;

  insert into public.app_notifications (user_id, type, title, body, href, actor_id, board_id, card_id)
  select distinct ca.profile_id,
    'card_comment',
    'Novo comentário',
    author_label || ' em «' || left(coalesce(card_title, 'Tarefa'), 120) || '»',
    href,
    new.author_id,
    board_uuid,
    new.card_id
  from public.card_assignees ca
  where ca.card_id = new.card_id
    and ca.profile_id is distinct from new.author_id;

  if assigned_to_val is not null
     and assigned_to_val is distinct from new.author_id
     and not exists (
       select 1 from public.card_assignees z
       where z.card_id = new.card_id and z.profile_id = assigned_to_val
     ) then
    insert into public.app_notifications (user_id, type, title, body, href, actor_id, board_id, card_id)
    values (
      assigned_to_val,
      'card_comment',
      'Novo comentário',
      author_label || ' em «' || left(coalesce(card_title, 'Tarefa'), 120) || '»',
      href,
      new.author_id,
      board_uuid,
      new.card_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists card_comments_app_notify on public.card_comments;

create trigger card_comments_app_notify
  after insert on public.card_comments
  for each row
  execute procedure public.app_notify_on_card_comment();

-- RPCs extra: notify_card_assignees_rpc.sql, kanban_activity_notifications_rpc.sql
