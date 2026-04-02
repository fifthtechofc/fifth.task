-- Tabela public.profiles + função para o signup (service role) criar/atualizar perfil sem depender do PostgREST upsert.
-- Executar no Supabase SQL Editor (projeto novo ou já existente).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  name text,
  job_title text,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;

-- Defaults para linhas antigas / colunas adicionadas tarde
alter table public.profiles
  alter column created_at set default now();
alter table public.profiles
  alter column updated_at set default now();

-- Chamada pela API com SUPABASE_SERVICE_ROLE_KEY (bypass RLS; corre como dono da função).
create or replace function public.signup_ensure_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_job_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_local text;
begin
  v_local := regexp_replace(split_part(coalesce(p_email, ''), '@', 1), '[^a-zA-Z0-9_]', '_', 'g');
  if v_local is null or v_local = '' then
    v_local := 'user';
  end if;
  v_username := left(v_local || '_' || replace(left(p_user_id::text, 8), '-', ''), 64);

  insert into public.profiles as p (
    id,
    email,
    full_name,
    name,
    job_title,
    display_name,
    username,
    updated_at
  )
  values (
    p_user_id,
    nullif(trim(p_email), ''),
    nullif(trim(p_full_name), ''),
    nullif(trim(p_full_name), ''),
    nullif(trim(p_job_title), ''),
    nullif(trim(p_full_name), ''),
    v_username,
    now()
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, p.email),
    full_name = coalesce(excluded.full_name, p.full_name),
    name = coalesce(excluded.name, p.name),
    job_title = coalesce(excluded.job_title, p.job_title),
    display_name = coalesce(excluded.display_name, p.display_name),
    username = case
      when p.username is null or trim(p.username) = '' then excluded.username
      else p.username
    end,
    updated_at = now();
end;
$$;

revoke all on function public.signup_ensure_profile(uuid, text, text, text) from public;
grant execute on function public.signup_ensure_profile(uuid, text, text, text) to service_role;

alter table public.profiles enable row level security;

-- Políticas para utilizadores autenticados (service_role ignora RLS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_authenticated'
  ) then
    create policy profiles_select_authenticated
      on public.profiles
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;
end $$;
