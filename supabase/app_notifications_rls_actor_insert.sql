-- Corrige notificações para OUTROS utilizadores (atribuição, comentário, mover coluna, etc.).
-- board_members / card_assignees podem usar profile_id OU user_id — detetado em runtime.
-- Executar no SQL Editor do Supabase (uma vez; idempotente).

alter table public.app_notifications no force row level security;

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

  drop policy if exists app_notifications_insert_as_actor on public.app_notifications;

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
