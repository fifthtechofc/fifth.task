-- Se já aplicaste app_notifications.sql antigo, executa só este bloco para corrigir o href das notificações de comentário.

alter table public.app_notifications no force row level security;

create or replace function public.app_notify_on_card_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  board_uuid uuid;
  card_title text;
  assigned_to_val uuid;
  board_title_val text;
  author_label text;
  slug text;
  href text;
begin
  select bc.board_id, bc.title, bc.assigned_to, b.title
  into board_uuid, card_title, assigned_to_val, board_title_val
  from public.board_cards bc
  left join public.boards b on b.id = bc.board_id
  where bc.id = new.card_id;

  if board_uuid is null then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.display_name), ''), nullif(trim(p.email), ''), 'Alguém')
  into author_label
  from public.profiles p
  where p.id = new.author_id;

  slug := trim(both '-' from lower(regexp_replace(coalesce(board_title_val, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  if slug is null or slug = '' then
    slug := 'board';
  end if;

  href := '/boards/' || slug || '?id=' || board_uuid::text || '&card=' || new.card_id::text;

  insert into public.app_notifications (user_id, type, title, body, href, actor_id, board_id, card_id)
  select distinct ca.profile_id,
    'card_comment',
    'Novo comentário',
    author_label || ' em «' || left(coalesce(card_title, 'Tarefa'), 120) || '»',
    href,
    new.author_id,
    board_uuid,
    new.card_id
  from public.card_assignees ca
  where ca.card_id = new.card_id
    and ca.profile_id is distinct from new.author_id;

  if assigned_to_val is not null
     and assigned_to_val is distinct from new.author_id
     and not exists (
       select 1 from public.card_assignees z
       where z.card_id = new.card_id and z.profile_id = assigned_to_val
     ) then
    insert into public.app_notifications (user_id, type, title, body, href, actor_id, board_id, card_id)
    values (
      assigned_to_val,
      'card_comment',
      'Novo comentário',
      author_label || ' em «' || left(coalesce(card_title, 'Tarefa'), 120) || '»',
      href,
      new.author_id,
      board_uuid,
      new.card_id
    );
  end if;

  return new;
end;
$$;
