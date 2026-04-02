-- Comments for Kanban cards (tasks)
-- Requires: `board_cards` table and `profiles` table.

create table if not exists public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.board_cards(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create index if not exists card_comments_card_id_created_at_idx
  on public.card_comments (card_id, created_at desc);

alter table public.card_comments enable row level security;

-- Read: any authenticated user can read comments (board-level security can be tightened later).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'card_comments'
      and policyname = 'card_comments_read'
  ) then
    create policy card_comments_read
      on public.card_comments
      for select
      to authenticated
      using (true);
  end if;
end $$;

-- Insert: only authenticated user, only as themselves.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'card_comments'
      and policyname = 'card_comments_insert'
  ) then
    create policy card_comments_insert
      on public.card_comments
      for insert
      to authenticated
      with check (auth.uid() = author_id);
  end if;
end $$;

-- Delete: author can delete own comments.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'card_comments'
      and policyname = 'card_comments_delete_own'
  ) then
    create policy card_comments_delete_own
      on public.card_comments
      for delete
      to authenticated
      using (auth.uid() = author_id);
  end if;
end $$;

