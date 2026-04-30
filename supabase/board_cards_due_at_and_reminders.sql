alter table if exists public.board_cards
  add column if not exists due_at timestamptz null;

alter table if exists public.board_cards
  add column if not exists due_timezone text null;

create index if not exists board_cards_due_at_idx
  on public.board_cards (due_at)
  where due_at is not null;

create table if not exists public.task_deadline_email_reminders (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.board_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null,
  due_at timestamptz not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (card_id, user_id, reminder_type, due_at)
);

create index if not exists task_deadline_email_reminders_lookup_idx
  on public.task_deadline_email_reminders (card_id, user_id, reminder_type, due_at);
