-- =============================================================================
-- RLS permissivo: qualquer utilizador com sessão (authenticated) lê todos os
-- workspaces e todas as linhas de workspace_members.
--
-- Usa APENAS em ambiente interno / um único tenant de confiança.
-- Executar no Supabase: SQL Editor → Run.
-- =============================================================================

alter table if exists public.workspaces enable row level security;

drop policy if exists workspaces_select_all_authenticated on public.workspaces;
create policy workspaces_select_all_authenticated
  on public.workspaces
  for select
  to authenticated
  using (true);

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'workspace_members') then
    execute 'alter table public.workspace_members enable row level security';
    execute 'drop policy if exists workspace_members_select_all_authenticated on public.workspace_members';
    execute $p$
      create policy workspace_members_select_all_authenticated
        on public.workspace_members
        for select
        to authenticated
        using (true)
    $p$;
  end if;
end $$;

grant usage on schema public to authenticated;
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'workspaces') then
    execute 'grant select on table public.workspaces to authenticated';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'workspace_members') then
    execute 'grant select on table public.workspace_members to authenticated';
  end if;
end $$;
