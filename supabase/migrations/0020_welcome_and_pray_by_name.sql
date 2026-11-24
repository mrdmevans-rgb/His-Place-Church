-- Two ways to draw people closer in the member portal:
--   1. Welcome new members: everyone sees who just joined and can send a short welcome.
--   2. Pray for one person today: members who opt in are shown, one a day, to others to pray
--      for by name. When someone taps "I prayed," the person sees who prayed for them.

alter table public.profiles add column if not exists pray_listed boolean not null default false;

-- Checks the rules below need. Members can't read other people's profiles directly,
-- so these look it up on their behalf and answer only yes or no.
create or replace function public.is_active_member(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = p_id and p.active and p.role in ('admin', 'pastor', 'leader', 'member'))
$$;
create or replace function public.is_pray_listed(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = p_id and p.active and p.pray_listed)
$$;
revoke all on function public.is_active_member(uuid), public.is_pray_listed(uuid) from public, anon;
grant execute on function public.is_active_member(uuid), public.is_pray_listed(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 1. Welcomes
-- ---------------------------------------------------------------------
create table if not exists public.member_welcomes (
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '' check (length(message) <= 500),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists member_welcomes_to on public.member_welcomes (to_id);
alter table public.member_welcomes enable row level security;
create policy "welcomes: see mine" on public.member_welcomes for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy "welcomes: send" on public.member_welcomes for insert to authenticated
  with check (public.is_member() and from_id = auth.uid()
    and public.is_active_member(to_id));

-- Members who joined in the last 21 days (not me, not leaders), and whether I've welcomed them yet.
-- Throwaway test accounts never show here.
create or replace function public.new_members()
returns table (id uuid, full_name text, joined_at timestamptz, welcomed boolean, welcome_count int)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.created_at,
    exists (select 1 from public.member_welcomes w where w.to_id = p.id and w.from_id = auth.uid()),
    (select count(*)::int from public.member_welcomes w where w.to_id = p.id)
  from public.profiles p
  where public.is_member() and p.id <> auth.uid() and p.active
    and p.role = 'member'
    and p.created_at > now() - interval '21 days'
    and p.email not like '%@example.com'
  order by p.created_at desc
$$;
revoke all on function public.new_members() from public, anon;
grant execute on function public.new_members() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Pray for one person today
-- ---------------------------------------------------------------------
create table if not exists public.member_prayed_name (
  by_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  for_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default (now() at time zone 'America/New_York')::date,
  created_at timestamptz not null default now(),
  primary key (by_id, for_id, day),
  check (by_id <> for_id)
);
create index if not exists member_prayed_name_for on public.member_prayed_name (for_id);
alter table public.member_prayed_name enable row level security;
create policy "prayed by name: see mine" on public.member_prayed_name for select to authenticated
  using (by_id = auth.uid() or for_id = auth.uid());
create policy "prayed by name: add" on public.member_prayed_name for insert to authenticated
  with check (public.is_member() and by_id = auth.uid()
    and public.is_pray_listed(for_id));
create policy "prayed by name: take back" on public.member_prayed_name for delete to authenticated
  using (by_id = auth.uid());

-- Today's person for me to pray for: one of the members who opted in, not me.
-- Each member gets a different person each day, and it stays the same all day.
create or replace function public.prayer_pick()
returns table (id uuid, full_name text, prayed boolean, listed_count int)
language sql stable security definer set search_path = public as $$
  with today as (select (now() at time zone 'America/New_York')::date d),
  pool as (
    select p.id, p.full_name from public.profiles p
    where p.pray_listed and p.active and p.id <> auth.uid()
      and p.role in ('admin', 'pastor', 'leader', 'member') and p.email not like '%@example.com'
  )
  select x.id, x.full_name,
    exists (select 1 from public.member_prayed_name n, today where n.by_id = auth.uid() and n.for_id = x.id and n.day = today.d),
    (select count(*)::int from pool)
  from pool x, today
  where public.is_member()
  order by md5(x.id::text || auth.uid()::text || today.d::text)
  limit 1
$$;
revoke all on function public.prayer_pick() from public, anon;
grant execute on function public.prayer_pick() to authenticated;

-- ---------------------------------------------------------------------
-- "For you" and the reply emails now also show welcomes and prayers by name.
-- ---------------------------------------------------------------------
create or replace function public.activity_for(p_user uuid, p_since timestamptz)
returns table (at timestamptz, actor uuid, what text, item_table text, comment_id uuid, my_text text, reply_text text, link text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select 'lesson_comments'::text t, c.id, c.body, '/portal/study/' || l.series_id || '/' || l.id link
      from public.lesson_comments c join public.study_lessons l on l.id = c.lesson_id where c.author = p_user and not c.hidden
    union all select 'reading_comments', c.id, c.body, '/portal/read' from public.reading_comments c where c.author = p_user and not c.hidden
    union all select 'member_prayer_comments', c.id, c.body, '/portal/pray' from public.member_prayer_comments c where c.author = p_user and not c.hidden
    union all select 'help_replies', c.id, c.body, '/portal/help' from public.help_replies c where c.author = p_user and not c.hidden
    union all select 'praise_comments', c.id, c.body, '/portal/praise' from public.praise_comments c where c.author = p_user and not c.hidden
    union all select 'praise_reports', r.id, r.title, '/portal/praise' from public.praise_reports r where r.author = p_user and not r.hidden
  ), replies as (
    select 'lesson_comments'::text t, r.parent_id, r.author, r.body, r.created_at from public.lesson_comments r where r.parent_id is not null and not r.hidden
    union all select 'reading_comments', r.parent_id, r.author, r.body, r.created_at from public.reading_comments r where r.parent_id is not null and not r.hidden
    union all select 'member_prayer_comments', r.parent_id, r.author, r.body, r.created_at from public.member_prayer_comments r where r.parent_id is not null and not r.hidden
    union all select 'help_replies', r.parent_id, r.author, r.body, r.created_at from public.help_replies r where r.parent_id is not null and not r.hidden
    union all select 'praise_comments', r.parent_id, r.author, r.body, r.created_at from public.praise_comments r where r.parent_id is not null and not r.hidden
    -- A comment on my praise report counts as a reply to it.
    union all select 'praise_reports', r.report_id, r.author, r.body, r.created_at from public.praise_comments r where r.parent_id is null and not r.hidden
  )
  select x.created_at, x.user_id, x.kind, m.t, m.id, left(m.body, 140), null::text, m.link
    from public.comment_reactions x join mine m on m.t = x.item_table and m.id = x.item_id
    where x.user_id <> p_user and x.created_at > p_since
  union all
  select r.created_at, r.author, 'reply', m.t, m.id, left(m.body, 140), left(r.body, 280), m.link
    from replies r join mine m on m.t = r.t and m.id = r.parent_id
    where r.author <> p_user and r.created_at > p_since
  union all
  select w.created_at, w.from_id, 'welcome', 'member_welcomes', null::uuid, '', nullif(left(w.message, 280), ''), '/portal/directory'
    from public.member_welcomes w where w.to_id = p_user and w.created_at > p_since
  union all
  select n.created_at, n.by_id, 'prayed_name', 'member_prayed_name', null::uuid, '', null::text, '/portal/home'
    from public.member_prayed_name n where n.for_id = p_user and n.created_at > p_since
  order by 1 desc
  limit 50
$$;
revoke all on function public.activity_for(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.activity_for(uuid, timestamptz) to service_role;
