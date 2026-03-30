-- Many-to-many: cards <-> profiles
-- Required for assigning multiple collaborators to a card.

create table if not exists public.card_assignees (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.board_cards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (card_id, profile_id)
);

alter table public.card_assignees enable row level security;

-- Basic policies (adjust to your rules):
-- Allow authenticated users to read/write assignees.

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'card_assignees' and policyname = 'card_assignees_select'
  ) then
    create policy card_assignees_select
      on public.card_assignees
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'card_assignees' and policyname = 'card_assignees_insert'
  ) then
    create policy card_assignees_insert
      on public.card_assignees
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'card_assignees' and policyname = 'card_assignees_delete'
  ) then
    create policy card_assignees_delete
      on public.card_assignees
      for delete
      to authenticated
      using (true);
  end if;
end $$;

