-- Cria um workspace por defeito (nome "Principal") se public.workspaces estiver vazio.
-- Tabela: workspaces (id, name, created_by uuid, created_at timestamptz).
--
-- Se o SELECT continuar sem linhas depois de correr isto, vê a secção MANUAL no fim.
--
-- Diagnóstico (opcional):
--   select count(*) as perfis from public.profiles;
--   select id, email, created_at from auth.users order by created_at desc limit 5;

-- 1) Preferir o primeiro perfil (created_by costuma referenciar profiles ou auth.users com o mesmo id)
insert into public.workspaces (name, created_by, created_at)
select 'Principal', p.id, now()
from public.profiles p
where not exists (select 1 from public.workspaces w)
order by p.id asc
limit 1;

-- 2) Se ainda vazio: tenta o primeiro utilizador em Auth (só funciona se created_by FK for para auth.users)
do $$
begin
  insert into public.workspaces (name, created_by, created_at)
  select 'Principal', u.id, now()
  from auth.users u
  where not exists (select 1 from public.workspaces w)
    and u.deleted_at is null
  order by u.created_at asc nulls last
  limit 1;
exception
  when foreign_key_violation then
    raise notice 'created_by referencia public.profiles — garante pelo menos um perfil ou usa o insert MANUAL no fim deste ficheiro.';
end $$;

-- Confirma:
-- select id, name, created_by, created_at from public.workspaces;

-- ========== MANUAL (se os inserts acima não criaram linha) ==========
-- 1) Supabase → Authentication → Users → copia o UUID do utilizador.
-- 2) Cola aqui e executa SÓ este bloco (uma vez):
--
-- insert into public.workspaces (name, created_by, created_at)
-- values ('Principal', 'COLE-AQUI-O-UUID'::uuid, now());
