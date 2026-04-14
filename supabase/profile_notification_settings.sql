alter table public.profiles
  add column if not exists notify_daily_summary boolean not null default true;

alter table public.profiles
  add column if not exists notify_deadline_alerts boolean not null default true;

alter table public.profiles
  add column if not exists notify_team_updates boolean not null default false;
