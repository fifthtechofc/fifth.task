-- =============================================================================
-- RLS: workspaces + workspace_members para a app (JWT = role authenticated).
-- O editor Supabase com role "postgres" ignora RLS — vês dados no painel mas a
-- app recebe 0 linhas se não houver políticas para "authenticated".
--
-- Executar no Supabase: SQL Editor → colar tudo → Run.
-- =============================================================================

grant usage on schema public to authenticated;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'workspaces') then
    execute 'grant select on table public.workspaces to authenticated';
    execute 'alter table public.workspaces enable row level security';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'workspace_members') then
    execute 'grant select on table public.workspace_members to authenticated';
    execute 'alter table public.workspace_members enable row level security';
  end if;
end $$;

-- Criador do workspace vê a própria linha em workspaces.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'workspaces_select_if_creator'
  ) then
    create policy workspaces_select_if_creator
      on public.workspaces
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

-- Membro (user_id) vê o workspace correspondente — necessário se created_by ≠ teu user.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'workspace_id'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'user_id'
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'workspaces_select_via_membership_user_id'
  ) then
    create policy workspaces_select_via_membership_user_id
      on public.workspaces
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = workspaces.id
            and wm.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Membro (profile_id = auth.uid()) vê o workspace.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'workspace_id'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'profile_id'
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'workspaces_select_via_membership_profile_id'
  ) then
    create policy workspaces_select_via_membership_profile_id
      on public.workspaces
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = workspaces.id
            and wm.profile_id = auth.uid()
        )
      );
  end if;
end $$;

-- Ler as próprias linhas em workspace_members (user_id).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'user_id'
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_members'
      and policyname = 'workspace_members_select_if_member_user_id'
  ) then
    create policy workspace_members_select_if_member_user_id
      on public.workspace_members
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Ler as próprias linhas em workspace_members (profile_id).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'profile_id'
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_members'
      and policyname = 'workspace_members_select_if_member_profile_id'
  ) then
    create policy workspace_members_select_if_member_profile_id
      on public.workspace_members
      for select
      to authenticated
      using (profile_id = auth.uid());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Se AINDA vazio: o teu user não é created_by nem tem linha em workspace_members.
-- Corrige dados, ou (apenas dev / um tenant) descomenta e executa:
--
-- drop policy if exists workspaces_select_dev_all on public.workspaces;
-- create policy workspaces_select_dev_all
--   on public.workspaces for select to authenticated using (true);
--
-- drop policy if exists workspace_members_select_dev_all on public.workspace_members;
-- create policy workspace_members_select_dev_all
--   on public.workspace_members for select to authenticated using (true);
-- -----------------------------------------------------------------------------
