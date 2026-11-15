-- =====================================================================
-- Member Portal: Bible study library, Ask the Pastor, prayer wall,
-- directory, care calendar, help board, gatherings, reading plan.
-- Members see the member area only. Leaders, pastors, and admins are
-- members too. Admins approve everyone who requests access.
-- =====================================================================

-- New role: member
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'pastor', 'leader', 'member', 'applicant'));
alter table public.profiles add column if not exists conduct_accepted_at timestamptz;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'pastor', 'leader', 'member'), false)
$$;

-- Names of active members, for showing who posted. Members only.
create or replace function public.member_names()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name from public.profiles p
  where public.is_member() and p.active and p.role in ('admin', 'pastor', 'leader', 'member')
$$;

-- Hide-able content: admins and pastors can hide posts; authors still see their own.
create or replace function public.guard_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.hidden is distinct from old.hidden and not public.is_pastoral() then
    raise exception 'Only a pastor or admin can hide or show posts';
  end if;
  if new.hidden is distinct from old.hidden then
    perform public.log_action(case when new.hidden then 'post hidden' else 'post restored' end, tg_table_name, new.id::text, '{}');
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Requests to join
-- ---------------------------------------------------------------------
create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  email text not null default '' check (length(email) <= 200),
  phone text not null default '' check (length(phone) <= 40),
  message text not null default '' check (length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (length(email) > 0 or length(phone) > 0)
);
create or replace function public.guard_membership_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not public.is_admin() then
    new.status := 'pending'; new.decided_by := null; new.decided_at := null;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.decided_by := auth.uid(); new.decided_at := now();
    perform public.log_action('membership ' || new.status, 'membership', new.id::text, jsonb_build_object('name', new.full_name));
  end if;
  return new;
end $$;
create trigger membership_requests_guard before insert or update on public.membership_requests for each row execute function public.guard_membership_request();
alter table public.membership_requests enable row level security;
create policy "membership: anyone can request" on public.membership_requests for insert to anon, authenticated with check (status = 'pending');
create policy "membership: admins read" on public.membership_requests for select to authenticated using (public.is_admin());
create policy "membership: admins decide" on public.membership_requests for update to authenticated using (public.is_admin());
create policy "membership: admins delete" on public.membership_requests for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Bible study library
-- ---------------------------------------------------------------------
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  ministry text not null default '',
  website text not null default '',
  about text not null default '',
  sort_order int not null default 100
);
alter table public.teachers enable row level security;
create policy "teachers: members read" on public.teachers for select to authenticated using (public.is_member());
create policy "teachers: pastoral manage" on public.teachers for all to authenticated using (public.is_pastoral()) with check (public.is_pastoral());

create table public.study_series (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  teacher_id uuid references public.teachers (id) on delete set null,
  book text not null default '',
  style text not null default 'verse_by_verse' check (style in ('verse_by_verse', 'topical', 'doctrine', 'devotional', 'overview')),
  description text not null default '',
  overview text not null default '',
  source_url text not null default '',
  resources jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 100,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger series_touch before update on public.study_series for each row execute function public.touch_updated_at();
alter table public.study_series enable row level security;
create policy "series: members read published" on public.study_series for select to authenticated
  using ((status = 'published' and public.is_member()) or public.is_pastoral());
create policy "series: pastoral manage" on public.study_series for all to authenticated using (public.is_pastoral()) with check (public.is_pastoral());

create table public.study_lessons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.study_series (id) on delete cascade,
  position int not null default 1,
  title text not null check (length(title) between 1 and 200),
  scripture text not null default '',
  video_url text not null default '',
  embed_ok boolean not null default true,
  minutes int,
  summary text not null default '',
  observe jsonb not null default '[]',
  understand jsonb not null default '[]',
  apply jsonb not null default '[]',
  resources jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.study_lessons enable row level security;
create policy "lessons: members read with series" on public.study_lessons for select to authenticated
  using (exists (select 1 from public.study_series s where s.id = series_id));
create policy "lessons: pastoral manage" on public.study_lessons for all to authenticated using (public.is_pastoral()) with check (public.is_pastoral());

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.study_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "progress: own" on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member());

create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.study_lessons (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger lesson_comments_hidden before update on public.lesson_comments for each row execute function public.guard_hidden();
alter table public.lesson_comments enable row level security;
create policy "lesson comments: members read" on public.lesson_comments for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()) and exists (select 1 from public.study_lessons l where l.id = lesson_id));
create policy "lesson comments: members post" on public.lesson_comments for insert to authenticated with check (public.is_member() and author = auth.uid() and not hidden);
create policy "lesson comments: author or pastoral edit" on public.lesson_comments for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "lesson comments: author or pastoral delete" on public.lesson_comments for delete to authenticated using (author = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Ask the Pastor (private; pastor may share an anonymous FAQ version)
-- ---------------------------------------------------------------------
create table public.pastor_questions (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question text not null check (length(question) between 1 and 4000),
  answer text not null default '',
  answered_by uuid references public.profiles (id),
  answered_at timestamptz,
  share_as_faq boolean not null default false,
  faq_question text not null default '',
  faq_answer text not null default '',
  created_at timestamptz not null default now()
);
create or replace function public.guard_question() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pastoral() then
    if tg_op = 'INSERT' then
      new.answer := ''; new.answered_by := null; new.answered_at := null; new.share_as_faq := false; new.faq_question := ''; new.faq_answer := '';
    elsif new.answer is distinct from old.answer or new.share_as_faq is distinct from old.share_as_faq
       or new.faq_question is distinct from old.faq_question or new.faq_answer is distinct from old.faq_answer then
      raise exception 'Only a pastor can answer questions';
    end if;
  elsif tg_op = 'UPDATE' and new.answer is distinct from old.answer then
    new.answered_by := auth.uid(); new.answered_at := now();
  end if;
  return new;
end $$;
create trigger questions_guard before insert or update on public.pastor_questions for each row execute function public.guard_question();
alter table public.pastor_questions enable row level security;
create policy "questions: own or pastoral read" on public.pastor_questions for select to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "questions: members ask" on public.pastor_questions for insert to authenticated with check (public.is_member() and author = auth.uid());
create policy "questions: own unanswered or pastoral edit" on public.pastor_questions for update to authenticated
  using (public.is_pastoral() or (author = auth.uid() and answered_at is null));
create policy "questions: own or pastoral delete" on public.pastor_questions for delete to authenticated using (author = auth.uid() or public.is_pastoral());

-- Shared FAQ: only the anonymous wording, never who asked.
create or replace function public.pastor_faq()
returns table (id uuid, question text, answer text, answered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select q.id, q.faq_question, q.faq_answer, q.answered_at from public.pastor_questions q
  where public.is_member() and q.share_as_faq and length(q.faq_question) > 0 and length(q.faq_answer) > 0
  order by q.answered_at desc
$$;

-- ---------------------------------------------------------------------
-- Member prayer wall
-- ---------------------------------------------------------------------
create table public.member_prayers (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  body text not null default '' check (length(body) <= 4000),
  pastors_only boolean not null default false,
  answered boolean not null default false,
  answered_note text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger member_prayers_hidden before update on public.member_prayers for each row execute function public.guard_hidden();
alter table public.member_prayers enable row level security;
create policy "member prayers: read" on public.member_prayers for select to authenticated
  using (public.is_member() and (author = auth.uid() or public.is_pastoral() or (not pastors_only and not hidden)));
create policy "member prayers: post" on public.member_prayers for insert to authenticated with check (public.is_member() and author = auth.uid() and not hidden);
create policy "member prayers: author or pastoral edit" on public.member_prayers for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "member prayers: author or pastoral delete" on public.member_prayers for delete to authenticated using (author = auth.uid() or public.is_pastoral());

create table public.member_praying (
  prayer_id uuid not null references public.member_prayers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);
alter table public.member_praying enable row level security;
create policy "member praying: read" on public.member_praying for select to authenticated using (public.is_member());
create policy "member praying: own" on public.member_praying for insert to authenticated
  with check (public.is_member() and user_id = auth.uid() and exists (select 1 from public.member_prayers p where p.id = prayer_id));
create policy "member praying: remove own" on public.member_praying for delete to authenticated using (user_id = auth.uid());

create table public.member_prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.member_prayers (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger member_prayer_comments_hidden before update on public.member_prayer_comments for each row execute function public.guard_hidden();
alter table public.member_prayer_comments enable row level security;
create policy "member prayer comments: read" on public.member_prayer_comments for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()) and exists (select 1 from public.member_prayers p where p.id = prayer_id));
create policy "member prayer comments: post" on public.member_prayer_comments for insert to authenticated
  with check (public.is_member() and author = auth.uid() and not hidden and exists (select 1 from public.member_prayers p where p.id = prayer_id));
create policy "member prayer comments: edit" on public.member_prayer_comments for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "member prayer comments: delete" on public.member_prayer_comments for delete to authenticated using (author = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Directory and celebrations (members choose what to share)
-- ---------------------------------------------------------------------
create table public.member_directory (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  listed boolean not null default false,
  household text not null default '' check (length(household) <= 200),
  about text not null default '' check (length(about) <= 600),
  show_phone boolean not null default false,
  show_email boolean not null default false,
  photo_path text,
  birthday_month int check (birthday_month between 1 and 12),
  birthday_day int check (birthday_day between 1 and 31),
  anniversary_month int check (anniversary_month between 1 and 12),
  anniversary_day int check (anniversary_day between 1 and 31),
  share_celebrations boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger directory_touch before update on public.member_directory for each row execute function public.touch_updated_at();
alter table public.member_directory enable row level security;
create policy "directory: own or admin" on public.member_directory for all to authenticated
  using (profile_id = auth.uid() or public.is_admin()) with check ((profile_id = auth.uid() and public.is_member()) or public.is_admin());

-- What other members see: only what each person chose to share.
create or replace function public.directory_list()
returns table (id uuid, full_name text, household text, about text, phone text, email text, photo_path text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, d.household, d.about,
    case when d.show_phone then p.phone else '' end,
    case when d.show_email and p.email not like '%@login.hpcchurch.church' then p.email else '' end,
    d.photo_path
  from public.member_directory d join public.profiles p on p.id = d.profile_id
  where public.is_member() and d.listed and p.active and p.role in ('admin', 'pastor', 'leader', 'member')
  order by p.full_name
$$;

create or replace function public.celebrations()
returns table (id uuid, full_name text, kind text, month int, day int)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, 'birthday', d.birthday_month, d.birthday_day
  from public.member_directory d join public.profiles p on p.id = d.profile_id
  where public.is_member() and d.share_celebrations and p.active and d.birthday_month is not null and d.birthday_day is not null
  union all
  select p.id, p.full_name, 'anniversary', d.anniversary_month, d.anniversary_day
  from public.member_directory d join public.profiles p on p.id = d.profile_id
  where public.is_member() and d.share_celebrations and p.active and d.anniversary_month is not null and d.anniversary_day is not null
$$;

-- Directory photos live in the public team-photos bucket under members/<id>/
create policy "member photos: members upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'team-photos' and public.is_member() and (storage.foldername(name))[1] = 'members' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "member photos: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'team-photos' and (storage.foldername(name))[1] = 'members' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- Care calendar (meal train)
-- ---------------------------------------------------------------------
create table public.care_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  details text not null default '' check (length(details) <= 3000),
  drop_off text not null default '' check (length(drop_off) <= 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.care_pages enable row level security;
create policy "care: members read" on public.care_pages for select to authenticated using (public.is_member());
create policy "care: staff create" on public.care_pages for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "care: creator or pastoral edit" on public.care_pages for update to authenticated using (created_by = auth.uid() or public.is_pastoral());
create policy "care: pastoral delete" on public.care_pages for delete to authenticated using (created_by = auth.uid() or public.is_pastoral());

create table public.care_slots (
  id uuid primary key default gen_random_uuid(),
  care_id uuid not null references public.care_pages (id) on delete cascade,
  slot_date date not null,
  label text not null default 'Meal' check (length(label) <= 80),
  taken_by uuid references public.profiles (id) on delete set null,
  note text not null default '' check (length(note) <= 300)
);
create or replace function public.guard_care_slot() returns trigger
language plpgsql security definer set search_path = public as $$
declare manager boolean := public.is_pastoral() or exists (select 1 from public.care_pages c where c.id = new.care_id and c.created_by = auth.uid());
begin
  if tg_op = 'UPDATE' and not manager then
    if new.slot_date is distinct from old.slot_date or new.label is distinct from old.label or new.care_id is distinct from old.care_id then
      raise exception 'Only the organizer can change the schedule';
    end if;
    -- Members may claim an open slot for themselves, or give up their own.
    if not ((old.taken_by is null and new.taken_by = auth.uid()) or (old.taken_by = auth.uid() and new.taken_by is null) or (old.taken_by = auth.uid() and new.taken_by = auth.uid())) then
      raise exception 'That spot is already taken';
    end if;
  end if;
  return new;
end $$;
create trigger care_slots_guard before update on public.care_slots for each row execute function public.guard_care_slot();
alter table public.care_slots enable row level security;
create policy "care slots: members read" on public.care_slots for select to authenticated using (public.is_member());
create policy "care slots: organizer adds" on public.care_slots for insert to authenticated
  with check (public.is_pastoral() or exists (select 1 from public.care_pages c where c.id = care_id and c.created_by = auth.uid()));
create policy "care slots: members claim" on public.care_slots for update to authenticated using (public.is_member());
create policy "care slots: organizer deletes" on public.care_slots for delete to authenticated
  using (public.is_pastoral() or exists (select 1 from public.care_pages c where c.id = care_id and c.created_by = auth.uid()));

-- ---------------------------------------------------------------------
-- Help board (needs and offers)
-- ---------------------------------------------------------------------
create table public.help_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('need', 'offer')),
  title text not null check (length(title) between 1 and 200),
  body text not null default '' check (length(body) <= 2000),
  status text not null default 'open' check (status in ('open', 'done')),
  hidden boolean not null default false,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create trigger help_posts_hidden before update on public.help_posts for each row execute function public.guard_hidden();
alter table public.help_posts enable row level security;
create policy "help: members read" on public.help_posts for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()));
create policy "help: members post" on public.help_posts for insert to authenticated with check (public.is_member() and author = auth.uid() and not hidden);
create policy "help: author or pastoral edit" on public.help_posts for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "help: author or pastoral delete" on public.help_posts for delete to authenticated using (author = auth.uid() or public.is_pastoral());

create table public.help_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.help_posts (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger help_replies_hidden before update on public.help_replies for each row execute function public.guard_hidden();
alter table public.help_replies enable row level security;
create policy "help replies: read" on public.help_replies for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()) and exists (select 1 from public.help_posts h where h.id = post_id));
create policy "help replies: post" on public.help_replies for insert to authenticated
  with check (public.is_member() and author = auth.uid() and not hidden and exists (select 1 from public.help_posts h where h.id = post_id));
create policy "help replies: edit" on public.help_replies for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "help replies: delete" on public.help_replies for delete to authenticated using (author = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Gatherings and RSVPs
-- ---------------------------------------------------------------------
create table public.gatherings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  starts_at timestamptz not null,
  location text not null default '' check (length(location) <= 300),
  details text not null default '' check (length(details) <= 3000),
  bring text not null default '' check (length(bring) <= 500),
  capacity int check (capacity > 0),
  hidden boolean not null default false,
  host uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create trigger gatherings_hidden before update on public.gatherings for each row execute function public.guard_hidden();
alter table public.gatherings enable row level security;
create policy "gatherings: members read" on public.gatherings for select to authenticated
  using (public.is_member() and (not hidden or host = auth.uid() or public.is_pastoral()));
create policy "gatherings: members host" on public.gatherings for insert to authenticated with check (public.is_member() and host = auth.uid() and not hidden);
create policy "gatherings: host or pastoral edit" on public.gatherings for update to authenticated using (host = auth.uid() or public.is_pastoral());
create policy "gatherings: host or pastoral delete" on public.gatherings for delete to authenticated using (host = auth.uid() or public.is_pastoral());

create table public.gathering_rsvps (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answer text not null default 'yes' check (answer in ('yes', 'maybe', 'no')),
  guests int not null default 0 check (guests between 0 and 20),
  primary key (gathering_id, user_id)
);
alter table public.gathering_rsvps enable row level security;
create policy "rsvps: members read" on public.gathering_rsvps for select to authenticated using (public.is_member());
create policy "rsvps: own" on public.gathering_rsvps for insert to authenticated
  with check (public.is_member() and user_id = auth.uid() and exists (select 1 from public.gatherings g where g.id = gathering_id));
create policy "rsvps: own update" on public.gathering_rsvps for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rsvps: own delete" on public.gathering_rsvps for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Weekly reading plan
-- ---------------------------------------------------------------------
create table public.reading_weeks (
  id uuid primary key default gen_random_uuid(),
  week_of date not null unique,
  passage text not null check (length(passage) between 1 and 120),
  note text not null default '' check (length(note) <= 2000),
  question text not null default '' check (length(question) <= 500),
  created_by uuid default auth.uid() references public.profiles (id)
);
alter table public.reading_weeks enable row level security;
create policy "reading: members read" on public.reading_weeks for select to authenticated using (public.is_member());
create policy "reading: staff manage" on public.reading_weeks for all to authenticated using (public.is_staff()) with check (public.is_staff());

create table public.reading_comments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.reading_weeks (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 3000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger reading_comments_hidden before update on public.reading_comments for each row execute function public.guard_hidden();
alter table public.reading_comments enable row level security;
create policy "reading comments: read" on public.reading_comments for select to authenticated
  using (public.is_member() and (not hidden or author = auth.uid() or public.is_pastoral()));
create policy "reading comments: post" on public.reading_comments for insert to authenticated with check (public.is_member() and author = auth.uid() and not hidden);
create policy "reading comments: edit" on public.reading_comments for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "reading comments: delete" on public.reading_comments for delete to authenticated using (author = auth.uid() or public.is_pastoral());

create table public.reading_done (
  week_id uuid not null references public.reading_weeks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (week_id, user_id)
);
alter table public.reading_done enable row level security;
create policy "reading done: members read" on public.reading_done for select to authenticated using (public.is_member());
create policy "reading done: own" on public.reading_done for insert to authenticated with check (public.is_member() and user_id = auth.uid());
create policy "reading done: own delete" on public.reading_done for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Reports (members flag a post for a pastor to review)
-- ---------------------------------------------------------------------
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  item_table text not null check (item_table in ('lesson_comments', 'member_prayers', 'member_prayer_comments', 'help_posts', 'help_replies', 'gatherings', 'reading_comments')),
  item_id uuid not null,
  reason text not null default '' check (length(reason) <= 500),
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.content_reports enable row level security;
create policy "reports: members file" on public.content_reports for insert to authenticated with check (public.is_member() and reporter = auth.uid());
create policy "reports: pastoral read" on public.content_reports for select to authenticated using (public.is_pastoral() or reporter = auth.uid());
create policy "reports: pastoral resolve" on public.content_reports for update to authenticated using (public.is_pastoral());

create index on public.study_series (status, sort_order);
create index on public.study_lessons (series_id, position);
create index on public.lesson_comments (lesson_id, created_at);
create index on public.member_prayers (created_at desc);
create index on public.gatherings (starts_at);
create index on public.help_posts (status, created_at desc);
