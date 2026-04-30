alter table if exists public.board_cards
  add column if not exists due_date date null;

alter table if exists public.board_cards
  add column if not exists deadline_event_id uuid null references public.calendar_events(id) on delete set null;
