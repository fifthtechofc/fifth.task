-- Corrige add_user_to_default_workspace quando o workspace_id estava hardcoded e já não existe
-- em public.workspaces (erro: workspace_members_workspace_id_fkey).
--
-- Executar no Supabase: SQL Editor → colar e executar.

create or replace function public.add_user_to_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  ws_id := null;

  -- Preferir workspace com slug 'default' (se a coluna existir)
  begin
    select w.id
    into ws_id
    from public.workspaces w
    where lower(trim(w.slug)) = 'default'
    limit 1;
  exception
    when undefined_column then
      ws_id := null;
  end;

  -- Senão: primeiro registo (por created_at se existir)
  if ws_id is null then
    begin
      select w.id
      into ws_id
      from public.workspaces w
      order by w.created_at asc nulls last, w.id asc
      limit 1;
    exception
      when undefined_column then
        select w.id
        into ws_id
        from public.workspaces w
        order by w.id asc
        limit 1;
    end;
  end if;

  if ws_id is null then
    return new;
  end if;

  -- Inserir membership sem abortar o INSERT em profiles
  begin
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'member');
  exception
    when undefined_column then
      begin
        insert into public.workspace_members (workspace_id, profile_id, role)
        values (ws_id, new.id, 'member');
      exception
        when others then
          null;
      end;
    when foreign_key_violation then
      null;
    when unique_violation then
      null;
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_add_user_to_default_workspace on public.profiles;

create trigger trg_add_user_to_default_workspace
  after insert on public.profiles
  for each row
  execute procedure public.add_user_to_default_workspace();
