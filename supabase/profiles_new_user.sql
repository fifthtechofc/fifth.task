-- Corrige "Database error creating new user" quando o trigger em auth.users falha ao criar public.profiles.
-- O signup da app (app/api/auth/signup) envia user_metadata: full_name, job_title — este handler usa esses campos.
--
-- Aplicar no Supabase: SQL Editor → colar e executar (ou incluir numa migration).
-- Depois, teste um novo cadastro.
--
-- PLANO B (se o signup continuar com 400): o trigger pode falhar por schema antigo.
-- 1) Desative o trigger — POST /api/auth/signup faz upsert em public.profiles após criar o user.
--    drop trigger if exists on_auth_user_created on auth.users;
-- 2) Opcional: drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  v_full text;
  v_job text;
  v_username text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  v_full := nullif(trim(coalesce(meta->>'full_name', meta->>'name', '')), '');
  v_full := coalesce(
    v_full,
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Usuário'
  );
  v_job := nullif(trim(coalesce(meta->>'job_title', '')), '');

  -- Se a coluna username existir e for NOT NULL sem default, precisamos de um valor.
  -- Gera um handle estável a partir do e-mail + sufixo curto do id (evita colisão simples).
  v_username := nullif(trim(coalesce(meta->>'username', '')), '');
  if v_username is null then
    if new.email is not null then
      v_username := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g');
      if v_username is null or v_username = '' then
        v_username := 'user';
      end if;
      v_username := left(v_username || '_' || replace(left(new.id::text, 8), '-', ''), 64);
    else
      v_username := 'user_' || replace(left(new.id::text, 8), '-', '');
    end if;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    job_title,
    display_name,
    username
  )
  values (
    new.id,
    new.email,
    v_full,
    v_job,
    v_full,
    v_username
  )
  on conflict (id) do nothing;

  return new;
exception
  when undefined_column then
    -- Schema sem username, job_title, display_name, etc.: mantém só o vínculo com auth.
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

-- Recria o trigger (nome costuma ser on_auth_user_created no template Supabase).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
