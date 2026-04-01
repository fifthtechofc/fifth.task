-- Many-to-many: boards <-> profiles
-- Required for assigning multiple collaborators to a project/board.

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (board_id, profile_id)
);

alter table public.board_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'board_members' and policyname = 'board_members_select'
  ) then
    create policy board_members_select
      on public.board_members
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'board_members' and policyname = 'board_members_insert'
  ) then
    create policy board_members_insert
      on public.board_members
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'board_members' and policyname = 'board_members_delete'
  ) then
    create policy board_members_delete
      on public.board_members
      for delete
      to authenticated
      using (true);
  end if;
end $$;
