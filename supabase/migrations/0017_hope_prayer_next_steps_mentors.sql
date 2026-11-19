-- Seven Days of Hope, website prayer requests with "we prayed for you",
-- "I said yes to Jesus" with next steps, Walk With Me mentors,
-- and pastor approval for new teaching content.

-- ---------------------------------------------------------------------
-- Pastor approval for teaching content. Nothing shows until approved.
-- ---------------------------------------------------------------------
create table public.content_approvals (
  key text primary key check (key in ('hope', 'questions', 'words', 'next_steps')),
  approved boolean not null default false,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz
);
insert into public.content_approvals (key) values ('hope'), ('questions'), ('words'), ('next_steps') on conflict do nothing;
alter table public.content_approvals enable row level security;
create policy "approvals: staff read" on public.content_approvals for select to authenticated using (public.is_staff());
create policy "approvals: pastors decide" on public.content_approvals for update to authenticated using (public.is_pastoral()) with check (public.is_pastoral());

create or replace function public.content_approved() returns table (key text, approved boolean)
language sql stable security definer set search_path = public as $$ select key, approved from public.content_approvals $$;
revoke all on function public.content_approved() from public;
grant execute on function public.content_approved() to anon, authenticated;
create or replace function public.is_approved(p_key text) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce((select approved from public.content_approvals where key = p_key), false) $$;
revoke all on function public.is_approved(text) from public;
grant execute on function public.is_approved(text) to anon, authenticated;

-- A simple brake on automated spam for public forms: at most 15 in 10 minutes per form.
create or replace function public.guard_public_flood() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null or not public.is_staff() then
    execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name) into n;
    if n >= 15 then raise exception 'Too many requests right now. Please try again in a few minutes.'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_public_flood() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Seven Days of Hope sign-ups
-- ---------------------------------------------------------------------
create table public.hope_signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '' check (length(first_name) <= 60),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  token uuid not null unique default gen_random_uuid(),   -- for the stop link in every email
  last_day int not null default 0 check (last_day between 0 and 7),
  last_sent_at timestamptz,
  stopped boolean not null default false,
  created_at timestamptz not null default now()
);
create trigger hope_signups_flood before insert on public.hope_signups for each row execute function public.guard_public_flood();
alter table public.hope_signups enable row level security;
create policy "hope: leaders read" on public.hope_signups for select to authenticated using (public.is_staff());
create policy "hope: pastors remove" on public.hope_signups for delete to authenticated using (public.is_pastoral());

-- Sign up (or start over after finishing or stopping). Works for anyone, only once a pastor has approved it.
create or replace function public.start_hope(p_first text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_approved('hope') then raise exception 'Seven Days of Hope is not open yet'; end if;
  if e !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 200 then raise exception 'Please enter a valid email address'; end if;
  insert into public.hope_signups (first_name, email) values (left(trim(coalesce(p_first, '')), 60), e)
  on conflict (email) do update set first_name = excluded.first_name, last_day = 0, last_sent_at = null, stopped = false
    where hope_signups.stopped or hope_signups.last_day >= 7;
end $$;
revoke all on function public.start_hope(text, text) from public;
grant execute on function public.start_hope(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Prayer requests from the website, with a "we prayed for you" note
-- ---------------------------------------------------------------------
create table public.web_prayers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null default '' check (length(email) <= 200),
  request text not null check (length(trim(request)) between 2 and 4000),
  pastors_only boolean not null default false,
  wants_note boolean not null default true,      -- OK to email "we prayed for you"
  prayed_at timestamptz,
  prayed_by uuid references public.profiles (id) on delete set null,
  told_at timestamptz,                            -- when the "we prayed for you" email went out
  notified_at timestamptz,                        -- when leaders were emailed about it
  created_at timestamptz not null default now()
);
create trigger web_prayers_flood before insert on public.web_prayers for each row execute function public.guard_public_flood();
alter table public.web_prayers enable row level security;
create policy "web prayers: anyone can ask" on public.web_prayers for insert to anon, authenticated
  with check (prayed_at is null and prayed_by is null and told_at is null and notified_at is null);
create policy "web prayers: leaders read" on public.web_prayers for select to authenticated
  using (public.is_staff() and (not pastors_only or public.is_pastoral()));
create policy "web prayers: leaders mark prayed" on public.web_prayers for update to authenticated
  using (public.is_staff() and (not pastors_only or public.is_pastoral())) with check (public.is_staff());
create policy "web prayers: pastors remove" on public.web_prayers for delete to authenticated using (public.is_pastoral());

-- ---------------------------------------------------------------------
-- "I said yes to Jesus"
-- ---------------------------------------------------------------------
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null default '' check (length(email) <= 200),
  phone text not null default '' check (length(phone) <= 40),
  note text not null default '' check (length(note) <= 2000),
  welcomed_at timestamptz,
  baptism_at timestamptz,
  connected_at timestamptz,
  followup_by uuid references public.profiles (id) on delete set null,
  leader_notes text not null default '' check (length(leader_notes) <= 4000),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger decisions_flood before insert on public.decisions for each row execute function public.guard_public_flood();
alter table public.decisions enable row level security;
create policy "decisions: anyone can share" on public.decisions for insert to anon, authenticated
  with check (public.is_approved('next_steps') and welcomed_at is null and baptism_at is null and connected_at is null
              and followup_by is null and leader_notes = '' and notified_at is null);
create policy "decisions: leaders read" on public.decisions for select to authenticated using (public.is_staff());
create policy "decisions: leaders follow up" on public.decisions for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "decisions: pastors remove" on public.decisions for delete to authenticated using (public.is_pastoral());

alter table public.email_prefs
  add column if not exists web_prayers boolean not null default true,
  add column if not exists new_decisions boolean not null default true;

-- ---------------------------------------------------------------------
-- Walk With Me: mature members volunteer to mentor, newer believers ask for one
-- ---------------------------------------------------------------------
create table public.mentor_volunteers (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  note text not null default '' check (length(note) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.mentor_volunteers enable row level security;
create policy "mentors: own or leaders read" on public.mentor_volunteers for select to authenticated using (profile_id = auth.uid() or public.is_staff());
create policy "mentors: members volunteer" on public.mentor_volunteers for insert to authenticated with check (profile_id = auth.uid() and public.is_member());
create policy "mentors: own edit" on public.mentor_volunteers for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "mentors: own or pastors remove" on public.mentor_volunteers for delete to authenticated using (profile_id = auth.uid() or public.is_pastoral());

create table public.mentor_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  note text not null default '' check (length(note) <= 1000),
  status text not null default 'waiting' check (status in ('waiting', 'paired', 'closed')),
  mentor_id uuid references public.profiles (id) on delete set null,
  paired_by uuid references public.profiles (id) on delete set null,
  paired_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index mentor_requests_one_open on public.mentor_requests (member_id) where status <> 'closed';
alter table public.mentor_requests enable row level security;
create policy "mentor requests: own, mentor, or leaders read" on public.mentor_requests for select to authenticated
  using (member_id = auth.uid() or mentor_id = auth.uid() or public.is_staff());
create policy "mentor requests: members ask" on public.mentor_requests for insert to authenticated
  with check (member_id = auth.uid() and public.is_member() and status = 'waiting' and mentor_id is null and paired_by is null and paired_at is null);
create policy "mentor requests: own cancel or leaders pair" on public.mentor_requests for update to authenticated
  using (member_id = auth.uid() or public.is_staff())
  with check (public.is_staff() or (member_id = auth.uid() and status = 'closed'));

-- Mentors who aren't leaders can now see the discipleship path of the person they walk with.
drop policy if exists "disciple assignments: own or staff read" on public.disciple_assignments;
create policy "disciple assignments: own, mentor, or staff read" on public.disciple_assignments for select to authenticated
  using (member_id = auth.uid() or mentor_id = auth.uid() or public.is_staff());
create or replace function public.can_read_disciple(p_member uuid, p_course text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_member = auth.uid() or public.is_pastoral()
    or exists (select 1 from public.disciple_assignments a
               where a.member_id = p_member and a.course = p_course and a.mentor_id = auth.uid() and public.is_member())
$$;
