-- Compatibiliza calendar_event_assignees com o frontend atual,
-- que usa a coluna user_id.
-- Seguro para ambientes onde a tabela antiga foi criada com profile_id.

alter table if exists public.calendar_event_assignees
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.calendar_event_assignees
set user_id = profile_id
where user_id is null
  and profile_id is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calendar_event_assignees'
      and column_name = 'profile_id'
  ) then
    begin
      alter table public.calendar_event_assignees
        drop constraint if exists calendar_event_assignees_pkey;
    exception
      when undefined_object then
        null;
    end;

    begin
      alter table public.calendar_event_assignees
        add constraint calendar_event_assignees_pkey primary key (event_id, user_id);
    exception
      when duplicate_table then
        null;
      when duplicate_object then
        null;
    end;
  end if;
end $$;

create index if not exists calendar_event_assignees_user_idx
  on public.calendar_event_assignees (user_id, created_at desc);
