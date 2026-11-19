-- Reactions and replies in member discussions:
-- Bible study comments, Read together comments, prayer wall encouragements, and Help board replies.

-- ---------------------------------------------------------------------
-- Replies: a comment can answer another comment in the same discussion.
-- ---------------------------------------------------------------------
alter table public.lesson_comments add column if not exists parent_id uuid references public.lesson_comments (id) on delete cascade;
alter table public.reading_comments add column if not exists parent_id uuid references public.reading_comments (id) on delete cascade;
alter table public.member_prayer_comments add column if not exists parent_id uuid references public.member_prayer_comments (id) on delete cascade;
alter table public.help_replies add column if not exists parent_id uuid references public.help_replies (id) on delete cascade;

-- A reply must stay in the same discussion as the comment it answers.
-- Replies to replies attach to the original comment, so threads stay one level deep.
create or replace function public.guard_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare fk text := tg_argv[0]; parent record; same boolean;
begin
  if new.parent_id is null then return new; end if;
  execute format('select parent_id, %I as thread from public.%I where id = $1', fk, tg_table_name) into parent using new.parent_id;
  if parent is null then raise exception 'That comment was not found'; end if;
  execute format('select ($1).%I = $2', fk) into same using new, parent.thread;
  if not same then raise exception 'A reply has to stay in the same discussion'; end if;
  if parent.parent_id is not null then new.parent_id := parent.parent_id; end if;
  if new.parent_id = new.id then raise exception 'A comment cannot reply to itself'; end if;
  return new;
end $$;
revoke all on function public.guard_reply() from public, anon, authenticated;
create trigger lesson_comments_reply before insert or update of parent_id on public.lesson_comments for each row execute function public.guard_reply('lesson_id');
create trigger reading_comments_reply before insert or update of parent_id on public.reading_comments for each row execute function public.guard_reply('week_id');
create trigger member_prayer_comments_reply before insert or update of parent_id on public.member_prayer_comments for each row execute function public.guard_reply('prayer_id');
create trigger help_replies_reply before insert or update of parent_id on public.help_replies for each row execute function public.guard_reply('post_id');

-- ---------------------------------------------------------------------
-- Reactions: Amen, Love this, Thank you, Praying.
-- ---------------------------------------------------------------------
create table public.comment_reactions (
  item_table text not null check (item_table in ('lesson_comments', 'reading_comments', 'member_prayer_comments', 'help_replies')),
  item_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('amen', 'love', 'thanks', 'praying')),
  created_at timestamptz not null default now(),
  primary key (item_table, item_id, user_id, kind)
);
create index comment_reactions_item on public.comment_reactions (item_table, item_id);
alter table public.comment_reactions enable row level security;

-- Can the signed-in person see this comment? Runs with their own permissions,
-- so a hidden or private comment can't be reacted to by someone who can't see it.
create or replace function public.comment_visible(p_table text, p_id uuid) returns boolean
language plpgsql stable security invoker set search_path = public as $$
declare ok boolean;
begin
  if p_table not in ('lesson_comments', 'reading_comments', 'member_prayer_comments', 'help_replies') then return false; end if;
  execute format('select exists (select 1 from public.%I where id = $1)', p_table) into ok using p_id;
  return ok;
end $$;
revoke all on function public.comment_visible(text, uuid) from public, anon;
grant execute on function public.comment_visible(text, uuid) to authenticated;

create policy "reactions: members read" on public.comment_reactions for select to authenticated
  using (public.is_member() and public.comment_visible(item_table, item_id));
create policy "reactions: members react" on public.comment_reactions for insert to authenticated
  with check (public.is_member() and user_id = auth.uid() and public.comment_visible(item_table, item_id));
create policy "reactions: remove own" on public.comment_reactions for delete to authenticated
  using (user_id = auth.uid());

-- When a comment is deleted, its reactions go with it.
create or replace function public.drop_comment_reactions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.comment_reactions where item_table = tg_table_name and item_id = old.id;
  return old;
end $$;
revoke all on function public.drop_comment_reactions() from public, anon, authenticated;
create trigger lesson_comments_drop_reactions after delete on public.lesson_comments for each row execute function public.drop_comment_reactions();
create trigger reading_comments_drop_reactions after delete on public.reading_comments for each row execute function public.drop_comment_reactions();
create trigger member_prayer_comments_drop_reactions after delete on public.member_prayer_comments for each row execute function public.drop_comment_reactions();
create trigger help_replies_drop_reactions after delete on public.help_replies for each row execute function public.drop_comment_reactions();

-- ---------------------------------------------------------------------
-- "For you": who replied to or reacted to my comments lately.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists activity_seen_at timestamptz;
alter table public.email_prefs add column if not exists post_replies boolean not null default true;

create or replace function public.activity_for(p_user uuid, p_since timestamptz)
returns table (at timestamptz, actor uuid, what text, item_table text, comment_id uuid, my_text text, reply_text text, link text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select 'lesson_comments'::text t, c.id, c.body, '/portal/study/' || l.series_id || '/' || l.id link
      from public.lesson_comments c join public.study_lessons l on l.id = c.lesson_id where c.author = p_user and not c.hidden
    union all select 'reading_comments', c.id, c.body, '/portal/read' from public.reading_comments c where c.author = p_user and not c.hidden
    union all select 'member_prayer_comments', c.id, c.body, '/portal/pray' from public.member_prayer_comments c where c.author = p_user and not c.hidden
    union all select 'help_replies', c.id, c.body, '/portal/help' from public.help_replies c where c.author = p_user and not c.hidden
  ), replies as (
    select 'lesson_comments'::text t, r.parent_id, r.author, r.body, r.created_at from public.lesson_comments r where r.parent_id is not null and not r.hidden
    union all select 'reading_comments', r.parent_id, r.author, r.body, r.created_at from public.reading_comments r where r.parent_id is not null and not r.hidden
    union all select 'member_prayer_comments', r.parent_id, r.author, r.body, r.created_at from public.member_prayer_comments r where r.parent_id is not null and not r.hidden
    union all select 'help_replies', r.parent_id, r.author, r.body, r.created_at from public.help_replies r where r.parent_id is not null and not r.hidden
  )
  select x.created_at, x.user_id, x.kind, m.t, m.id, left(m.body, 140), null::text, m.link
    from public.comment_reactions x join mine m on m.t = x.item_table and m.id = x.item_id
    where x.user_id <> p_user and x.created_at > p_since
  union all
  select r.created_at, r.author, 'reply', m.t, m.id, left(m.body, 140), left(r.body, 280), m.link
    from replies r join mine m on m.t = r.t and m.id = r.parent_id
    where r.author <> p_user and r.created_at > p_since
  order by 1 desc
  limit 50
$$;
revoke all on function public.activity_for(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.activity_for(uuid, timestamptz) to service_role;

-- The signed-in member's own activity from the last 30 days.
create or replace function public.my_activity()
returns table (at timestamptz, actor uuid, what text, item_table text, comment_id uuid, my_text text, reply_text text, link text)
language sql stable security definer set search_path = public as $$
  select * from public.activity_for(auth.uid(), now() - interval '30 days') where public.is_member()
$$;
revoke all on function public.my_activity() from public, anon;
grant execute on function public.my_activity() to authenticated;
