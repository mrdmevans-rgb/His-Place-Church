-- Visitors (from Plan Your Visit) with a follow-up list for leaders,
-- and praise reports where members share what God has done.

-- ---------------------------------------------------------------------
-- Visitors
-- ---------------------------------------------------------------------
create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text not null default '' check (length(email) <= 200),
  phone text not null default '' check (length(phone) <= 40),
  visit_date date,                                   -- null means "not sure yet"
  adults int not null default 1 check (adults between 1 and 20),
  kids text not null default '' check (length(kids) <= 200),
  notes text not null default '' check (length(notes) <= 1000),
  source text not null default 'website' check (source in ('website', 'leader')),
  status text not null default 'new' check (status in ('new', 'came', 'no_show', 'connected', 'closed')),
  welcomed_at timestamptz,
  thanked_at timestamptz,
  lunch_at timestamptz,
  followup_by uuid references public.profiles (id) on delete set null,
  leader_notes text not null default '' check (length(leader_notes) <= 4000),
  notified_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint visitors_contact check (email <> '' or phone <> '')
);
alter table public.visitors enable row level security;

-- Anyone can tell us they're coming, but only as a brand new visit. They can't read anything back.
create policy "visitors: anyone can say they're coming" on public.visitors for insert to anon, authenticated
  with check (source = 'website' and status = 'new' and welcomed_at is null and thanked_at is null and lunch_at is null
              and followup_by is null and leader_notes = '' and notified_at is null
              and (visit_date is null or visit_date between current_date - 1 and current_date + 60));
create policy "visitors: leaders add" on public.visitors for insert to authenticated with check (public.is_staff());
create policy "visitors: leaders read" on public.visitors for select to authenticated using (public.is_staff());
create policy "visitors: leaders follow up" on public.visitors for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "visitors: pastors remove" on public.visitors for delete to authenticated using (public.is_pastoral());

-- A simple brake on automated spam: at most 15 website sign-ups in 10 minutes.
create or replace function public.guard_visitor_flood() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'website' and (select count(*) from public.visitors where source = 'website' and created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'Too many requests right now. Please try again in a few minutes.';
  end if;
  return new;
end $$;
revoke all on function public.guard_visitor_flood() from public, anon, authenticated;
create trigger visitors_flood before insert on public.visitors for each row execute function public.guard_visitor_flood();

-- Pastors get an email about new visitors. On unless turned off.
alter table public.email_prefs add column if not exists new_visitors boolean not null default true;

-- ---------------------------------------------------------------------
-- Praise reports
-- ---------------------------------------------------------------------
create table public.praise_reports (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  body text not null default '' check (length(body) <= 4000),
  prayer_id uuid references public.member_prayers (id) on delete set null,
  ok_to_share boolean not null default false,        -- OK to read aloud on Sunday
  shared_on date,                                    -- set by a pastor after it's shared
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger praise_reports_hidden before update on public.praise_reports for each row execute function public.guard_hidden();
create or replace function public.guard_praise_shared() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.shared_on is distinct from old.shared_on and not public.is_pastoral() then
    raise exception 'Only a pastor can mark a praise report as shared';
  end if;
  return new;
end $$;
revoke all on function public.guard_praise_shared() from public, anon, authenticated;
create trigger praise_reports_shared before update on public.praise_reports for each row execute function public.guard_praise_shared();
alter table public.praise_reports enable row level security;
create policy "praise: members read" on public.praise_reports for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()));
create policy "praise: members share" on public.praise_reports for insert to authenticated
  with check (public.is_member() and author = auth.uid() and not hidden and shared_on is null
              and (prayer_id is null or exists (select 1 from public.member_prayers p where p.id = prayer_id and p.author = auth.uid())));
create policy "praise: author or pastoral edit" on public.praise_reports for update to authenticated
  using (author = auth.uid() or public.is_pastoral()) with check (author = auth.uid() or public.is_pastoral());
create policy "praise: author or pastoral delete" on public.praise_reports for delete to authenticated
  using (author = auth.uid() or public.is_pastoral());

create table public.praise_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.praise_reports (id) on delete cascade,
  parent_id uuid references public.praise_comments (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger praise_comments_hidden before update on public.praise_comments for each row execute function public.guard_hidden();
create trigger praise_comments_reply before insert or update of parent_id on public.praise_comments for each row execute function public.guard_reply('report_id');
alter table public.praise_comments enable row level security;
create policy "praise comments: read" on public.praise_comments for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral())
         and exists (select 1 from public.praise_reports r where r.id = report_id));
create policy "praise comments: post" on public.praise_comments for insert to authenticated
  with check (public.is_member() and author = auth.uid() and not hidden and exists (select 1 from public.praise_reports r where r.id = report_id));
create policy "praise comments: edit" on public.praise_comments for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "praise comments: delete" on public.praise_comments for delete to authenticated using (author = auth.uid() or public.is_pastoral());

-- Reactions, reports, and "For you" now cover praise reports and their comments too.
alter table public.comment_reactions drop constraint comment_reactions_item_table_check;
alter table public.comment_reactions add constraint comment_reactions_item_table_check
  check (item_table in ('lesson_comments', 'reading_comments', 'member_prayer_comments', 'help_replies', 'praise_reports', 'praise_comments'));
alter table public.content_reports drop constraint content_reports_item_table_check;
alter table public.content_reports add constraint content_reports_item_table_check
  check (item_table in ('lesson_comments', 'member_prayers', 'member_prayer_comments', 'help_posts', 'help_replies', 'gatherings', 'reading_comments', 'praise_reports', 'praise_comments'));
create trigger praise_reports_drop_reactions after delete on public.praise_reports for each row execute function public.drop_comment_reactions();
create trigger praise_comments_drop_reactions after delete on public.praise_comments for each row execute function public.drop_comment_reactions();

create or replace function public.comment_visible(p_table text, p_id uuid) returns boolean
language plpgsql stable security invoker set search_path = public as $$
declare ok boolean;
begin
  if p_table not in ('lesson_comments', 'reading_comments', 'member_prayer_comments', 'help_replies', 'praise_reports', 'praise_comments') then return false; end if;
  execute format('select exists (select 1 from public.%I where id = $1)', p_table) into ok using p_id;
  return ok;
end $$;

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
  order by 1 desc
  limit 50
$$;
revoke all on function public.activity_for(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.activity_for(uuid, timestamptz) to service_role;
