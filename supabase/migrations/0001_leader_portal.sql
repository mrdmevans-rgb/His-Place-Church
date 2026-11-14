-- =====================================================================
-- His Place Leader Portal: database and security rules
--
-- Roles
--   admin      everything, invites people, final approval of documents
--   pastor     everything leaders can, plus private pastoral items
--   leader     team member (worship, sound, media, children, safety, outreach)
--   applicant  can only submit and view their own carry application
--
-- Every table uses row level security. If a rule below does not allow
-- something, the database refuses it, no matter what the website sends.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'applicant' check (role in ('admin', 'pastor', 'leader', 'applicant')),
  teams text[] not null default '{}' check (teams <@ array['worship', 'sound', 'media', 'children', 'safety', 'outreach']::text[]),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- New sign-in accounts get an inactive applicant profile. An admin (through
-- the invite tool) sets the real role and turns the account on.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper checks used by the rules below.
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'pastor', 'leader'), false)
$$;

create or replace function public.is_pastoral() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'pastor'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.on_team(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select t = any(teams) from public.profiles where id = auth.uid() and active and role in ('admin', 'pastor', 'leader')), false)
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Only admins may change role, teams, active, or email.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.teams is distinct from old.teams
       or new.active is distinct from old.active or new.email is distinct from old.email then
      raise exception 'Only an admin can change roles, teams, or account status';
    end if;
  end if;
  if auth.uid() is not null and old.id = auth.uid() and old.role = 'admin'
     and (new.role <> 'admin' or not new.active) then
    raise exception 'Admins cannot remove their own admin access';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

alter table public.profiles enable row level security;
create policy "profiles: read self or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles: update self or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Activity log (admins only). Written automatically by triggers.
-- ---------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'
);
alter table public.audit_log enable row level security;
create policy "audit: admins read" on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.log_action(p_action text, p_entity text, p_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_id, coalesce(p_details, '{}'))
$$;

create or replace function public.audit_profiles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.role is distinct from old.role or new.teams is distinct from old.teams or new.active is distinct from old.active) then
    perform public.log_action('account changed', 'profile', new.id::text,
      jsonb_build_object('email', new.email, 'role', new.role, 'teams', new.teams, 'active', new.active,
                         'old_role', old.role, 'old_active', old.active));
  end if;
  return new;
end $$;
create trigger profiles_audit after update on public.profiles for each row execute function public.audit_profiles();

-- ---------------------------------------------------------------------
-- Requests: supplies, flyers and marketing, conferences and events
-- ---------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('supplies', 'marketing', 'event')),
  title text not null check (length(title) between 1 and 200),
  details text not null default '',
  needed_by date,
  link text not null default '',
  estimated_cost numeric(10, 2),
  team text,
  status text not null default 'submitted' check (status in ('submitted', 'in_progress', 'done', 'declined')),
  status_note text not null default '',
  created_by uuid not null default auth.uid() references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();

create or replace function public.guard_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pastoral() then
    if tg_op = 'INSERT' then
      new.status := 'submitted'; new.status_note := ''; new.assigned_to := null;
    elsif new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to or new.status_note is distinct from old.status_note then
      raise exception 'Only a pastor or admin can change the status of a request';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.log_action('request ' || new.status, 'request', new.id::text, jsonb_build_object('title', new.title));
  end if;
  return new;
end $$;
create trigger requests_guard before insert or update on public.requests for each row execute function public.guard_request();

alter table public.requests enable row level security;
create policy "requests: staff read" on public.requests for select to authenticated using (public.is_staff());
create policy "requests: staff create" on public.requests for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "requests: author or pastoral edit" on public.requests for update to authenticated
  using (public.is_pastoral() or (created_by = auth.uid() and status = 'submitted'))
  with check (public.is_pastoral() or created_by = auth.uid());
create policy "requests: author or admin delete" on public.requests for delete to authenticated
  using (public.is_admin() or (created_by = auth.uid() and status = 'submitted'));

create table public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.request_comments enable row level security;
create policy "request comments: staff read" on public.request_comments for select to authenticated using (public.is_staff());
create policy "request comments: staff write" on public.request_comments for insert to authenticated with check (public.is_staff() and author = auth.uid());
create policy "request comments: author delete" on public.request_comments for delete to authenticated using (author = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Leader prayer wall (leaders, pastors, admins only)
-- ---------------------------------------------------------------------
create table public.prayers (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references public.profiles (id),
  title text not null check (length(title) between 1 and 200),
  body text not null default '',
  pastors_only boolean not null default false,
  answered boolean not null default false,
  answered_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger prayers_touch before update on public.prayers for each row execute function public.touch_updated_at();
alter table public.prayers enable row level security;
create policy "prayers: staff read" on public.prayers for select to authenticated
  using (public.is_staff() and (not pastors_only or public.is_pastoral() or author = auth.uid()));
create policy "prayers: staff create" on public.prayers for insert to authenticated with check (public.is_staff() and author = auth.uid());
create policy "prayers: author or pastoral edit" on public.prayers for update to authenticated
  using (author = auth.uid() or public.is_pastoral()) with check (author = auth.uid() or public.is_pastoral());
create policy "prayers: author or admin delete" on public.prayers for delete to authenticated using (author = auth.uid() or public.is_admin());

create table public.prayer_praying (
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);
alter table public.prayer_praying enable row level security;
create policy "praying: staff read" on public.prayer_praying for select to authenticated using (public.is_staff());
create policy "praying: own add" on public.prayer_praying for insert to authenticated with check (public.is_staff() and user_id = auth.uid());
create policy "praying: own remove" on public.prayer_praying for delete to authenticated using (user_id = auth.uid());

create table public.prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayers (id) on delete cascade,
  author uuid not null default auth.uid() references public.profiles (id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.prayer_comments enable row level security;
create policy "prayer comments: read with prayer" on public.prayer_comments for select to authenticated
  using (exists (select 1 from public.prayers p where p.id = prayer_id));
create policy "prayer comments: staff write" on public.prayer_comments for insert to authenticated
  with check (public.is_staff() and author = auth.uid() and exists (select 1 from public.prayers p where p.id = prayer_id));
create policy "prayer comments: author delete" on public.prayer_comments for delete to authenticated using (author = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Shared documents. Leaders upload, an admin approves before anyone else
-- can see them. Files live in a private storage bucket.
-- ---------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  folder text not null default 'General' check (folder in ('General', 'Worship', 'Sound', 'Camera and Media', 'Children''s Ministry', 'Safety Team', 'Outreach', 'Policies', 'Pastors')),
  storage_path text not null unique,
  file_name text not null,
  file_size bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.guard_document() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.status := 'pending'; end if;
    if new.status <> 'pending' then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
    perform public.log_action('document uploaded', 'document', new.id::text, jsonb_build_object('title', new.title, 'status', new.status));
  elsif new.status is distinct from old.status then
    if not public.is_admin() then raise exception 'Only an admin can approve or reject documents'; end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
    perform public.log_action('document ' || new.status, 'document', new.id::text, jsonb_build_object('title', new.title, 'note', new.review_note));
  end if;
  return new;
end $$;
create trigger documents_guard before insert or update on public.documents for each row execute function public.guard_document();

alter table public.documents enable row level security;
create policy "documents: approved or own or admin" on public.documents for select to authenticated
  using (public.is_staff() and (status = 'approved' or uploaded_by = auth.uid() or public.is_admin())
         and (folder <> 'Pastors' or public.is_pastoral()));
create policy "documents: staff upload" on public.documents for insert to authenticated
  with check (public.is_staff() and uploaded_by = auth.uid() and (folder <> 'Pastors' or public.is_pastoral()));
create policy "documents: admin or pending uploader edit" on public.documents for update to authenticated
  using (public.is_admin() or (uploaded_by = auth.uid() and status = 'pending'))
  with check (public.is_admin() or uploaded_by = auth.uid());
create policy "documents: admin or pending uploader delete" on public.documents for delete to authenticated
  using (public.is_admin() or (uploaded_by = auth.uid() and status <> 'approved'));

insert into storage.buckets (id, name, public) values ('portal-files', 'portal-files', false)
on conflict (id) do nothing;

-- Paths: docs/<user id>/<file>   songs/<user id>/<file>
create policy "portal files: staff upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-files' and public.is_staff()
              and (storage.foldername(name))[1] in ('docs', 'songs')
              and (storage.foldername(name))[2] = auth.uid()::text);
create policy "portal files: read allowed documents and charts" on storage.objects for select to authenticated
  using (bucket_id = 'portal-files' and public.is_staff() and (
    (storage.foldername(name))[1] = 'songs'
    or exists (select 1 from public.documents d where d.storage_path = name)
  ));
create policy "portal files: owner or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'portal-files' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- Safety team: concealed carry authorization
-- Stores only what the team needs. A leader views the physical license
-- in person. Full license numbers are never stored.
-- ---------------------------------------------------------------------
create table public.carry_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique default auth.uid() references public.profiles (id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 120),
  phone text not null default '',
  email text not null default '',
  permit_type text not null check (permit_type in ('ohio_chl', 'other_state', 'none')),
  issuing_place text not null default '',
  license_last4 text not null default '' check (license_last4 ~ '^([0-9A-Za-z]{4})?$'),
  license_expires date,
  training_course text not null default '',
  training_date date,
  safety_policy_ack boolean not null default false check (safety_policy_ack),
  signature_name text not null check (length(signature_name) between 1 and 120),
  signed_at timestamptz not null default now(),
  applicant_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'revoked')),
  decision_reason text not null default '',
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  approval_expires date,
  license_seen_by uuid references public.profiles (id),
  license_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger carry_touch before update on public.carry_applications for each row execute function public.touch_updated_at();

create table public.carry_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.carry_applications (id) on delete cascade,
  at timestamptz not null default now(),
  actor uuid references public.profiles (id),
  action text not null,
  reason text not null default ''
);

create or replace function public.guard_carry() returns trigger
language plpgsql security definer set search_path = public as $$
declare reviewer boolean := public.is_staff();
begin
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.decision_reason := ''; new.decided_by := null; new.decided_at := null;
    new.approval_expires := null; new.license_seen_by := null; new.license_seen_at := null;
    new.signed_at := now();
    return new;
  end if;

  if new.status is distinct from old.status
     or new.decision_reason is distinct from old.decision_reason
     or new.approval_expires is distinct from old.approval_expires
     or new.license_seen_by is distinct from old.license_seen_by then
    -- A decision or review change.
    if not reviewer then raise exception 'Only leaders, pastors, or admins can review carry applications'; end if;
    if old.applicant_id = auth.uid() then raise exception 'You cannot review your own carry application'; end if;
    if new.status is distinct from old.status then
      if new.status in ('denied', 'revoked') and length(trim(new.decision_reason)) = 0 then
        raise exception 'Please give a reason when denying or revoking';
      end if;
      if new.status = 'approved' and new.license_seen_by is null and new.permit_type <> 'none' then
        raise exception 'Confirm that a leader has seen the physical license before approving';
      end if;
      new.decided_by := auth.uid(); new.decided_at := now();
      insert into public.carry_history (application_id, actor, action, reason) values (new.id, auth.uid(), new.status, new.decision_reason);
      perform public.log_action('carry ' || new.status, 'carry', new.id::text, jsonb_build_object('name', new.full_name, 'reason', new.decision_reason));
    end if;
    if new.license_seen_by is distinct from old.license_seen_by and new.license_seen_by is not null then
      new.license_seen_by := auth.uid(); new.license_seen_at := now();
      insert into public.carry_history (application_id, actor, action) values (new.id, auth.uid(), 'license seen in person');
    end if;
  elsif auth.uid() = old.applicant_id then
    -- The applicant updated their own information: it goes back for review.
    new.status := 'pending'; new.decided_by := null; new.decided_at := null; new.decision_reason := '';
    new.approval_expires := null; new.license_seen_by := null; new.license_seen_at := null; new.signed_at := now();
    insert into public.carry_history (application_id, actor, action) values (new.id, auth.uid(), 'updated by applicant');
  elsif not reviewer then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger carry_guard before insert or update on public.carry_applications for each row execute function public.guard_carry();

create or replace function public.carry_submitted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.carry_history (application_id, actor, action) values (new.id, auth.uid(), 'submitted');
  perform public.log_action('carry application submitted', 'carry', new.id::text, '{}');
  return new;
end $$;
create trigger carry_after_insert after insert on public.carry_applications for each row execute function public.carry_submitted();

alter table public.carry_applications enable row level security;
create policy "carry: own or staff read" on public.carry_applications for select to authenticated
  using (applicant_id = auth.uid() or public.is_staff());
create policy "carry: submit own" on public.carry_applications for insert to authenticated
  with check (applicant_id = auth.uid() and public.app_role() is not null);
create policy "carry: own or staff update" on public.carry_applications for update to authenticated
  using ((applicant_id = auth.uid() and status <> 'revoked') or public.is_staff())
  with check (applicant_id = auth.uid() or public.is_staff());
create policy "carry: admin delete" on public.carry_applications for delete to authenticated using (public.is_admin());

alter table public.carry_history enable row level security;
create policy "carry history: staff or own read" on public.carry_history for select to authenticated
  using (public.is_staff() or exists (select 1 from public.carry_applications a where a.id = application_id and a.applicant_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Announcements and calendar
-- ---------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  body text not null default '',
  team text,
  pinned boolean not null default false,
  author uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "announcements: staff read" on public.announcements for select to authenticated using (public.is_staff());
create policy "announcements: staff post" on public.announcements for insert to authenticated with check (public.is_staff() and author = auth.uid());
create policy "announcements: author or pastoral edit" on public.announcements for update to authenticated using (author = auth.uid() or public.is_pastoral());
create policy "announcements: author or pastoral delete" on public.announcements for delete to authenticated using (author = auth.uid() or public.is_pastoral());

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  team text,
  notes text not null default '',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events: staff read" on public.events for select to authenticated using (public.is_staff());
create policy "events: staff add" on public.events for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "events: creator or pastoral edit" on public.events for update to authenticated using (created_by = auth.uid() or public.is_pastoral());
create policy "events: creator or pastoral delete" on public.events for delete to authenticated using (created_by = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Sunday run sheets
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  service_date date not null unique,
  sermon_title text not null default '',
  scripture text not null default '',
  speaker text not null default '',
  slides_due date,
  notes text not null default '',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();
alter table public.services enable row level security;
create policy "services: staff read" on public.services for select to authenticated using (public.is_staff());
create policy "services: staff add" on public.services for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "services: staff edit" on public.services for update to authenticated using (public.is_staff());
create policy "services: pastoral delete" on public.services for delete to authenticated using (public.is_pastoral());

create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  position int not null default 0,
  kind text not null default 'other' check (kind in ('welcome', 'song', 'prayer', 'scripture', 'announcements', 'sermon', 'response', 'offering', 'video', 'other')),
  title text not null default '',
  details text not null default '',
  person text not null default ''
);
alter table public.service_items enable row level security;
create policy "service items: staff read" on public.service_items for select to authenticated using (public.is_staff());
create policy "service items: staff add" on public.service_items for insert to authenticated with check (public.is_staff());
create policy "service items: staff edit" on public.service_items for update to authenticated using (public.is_staff());
create policy "service items: staff delete" on public.service_items for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- Volunteer schedule and blackout dates
-- ---------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  serve_date date not null,
  team text not null check (team in ('worship', 'sound', 'media', 'children', 'safety', 'outreach')),
  position text not null default '',
  person_id uuid references public.profiles (id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'swap_requested')),
  note text not null default '',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "assignments: staff read" on public.assignments for select to authenticated using (public.is_staff());
create policy "assignments: team lead add" on public.assignments for insert to authenticated with check (public.is_pastoral() or public.on_team(team));
create policy "assignments: team, or own status" on public.assignments for update to authenticated
  using (public.is_pastoral() or public.on_team(team) or person_id = auth.uid());
create policy "assignments: team delete" on public.assignments for delete to authenticated using (public.is_pastoral() or public.on_team(team));

create or replace function public.guard_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_pastoral() or public.on_team(old.team)) then
    if new.serve_date is distinct from old.serve_date or new.team is distinct from old.team
       or new.position is distinct from old.position or new.person_id is distinct from old.person_id then
      raise exception 'You can confirm or request a swap, but only the team can change the schedule';
    end if;
  end if;
  return new;
end $$;
create trigger assignments_guard before update on public.assignments for each row execute function public.guard_assignment();

create table public.blackouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date_from date not null,
  date_to date not null,
  note text not null default '',
  check (date_to >= date_from)
);
alter table public.blackouts enable row level security;
create policy "blackouts: staff read" on public.blackouts for select to authenticated using (public.is_staff());
create policy "blackouts: own add" on public.blackouts for insert to authenticated with check (public.is_staff() and user_id = auth.uid());
create policy "blackouts: own or pastoral delete" on public.blackouts for delete to authenticated using (user_id = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Worship song library
-- ---------------------------------------------------------------------
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  artist text not null default '',
  song_key text not null default '',
  tempo text not null default '',
  ccli text not null default '',
  notes text not null default '',
  chart_path text,
  chart_name text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.songs enable row level security;
create policy "songs: staff read" on public.songs for select to authenticated using (public.is_staff());
create policy "songs: staff add" on public.songs for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "songs: staff edit" on public.songs for update to authenticated using (public.is_staff());
create policy "songs: creator or pastoral delete" on public.songs for delete to authenticated using (created_by = auth.uid() or public.is_pastoral());

-- ---------------------------------------------------------------------
-- Equipment issues (sound, cameras, building)
-- ---------------------------------------------------------------------
create table public.equipment_issues (
  id uuid primary key default gen_random_uuid(),
  item text not null check (length(item) between 1 and 200),
  area text not null default 'sound' check (area in ('sound', 'media', 'worship', 'children', 'building', 'other')),
  description text not null default '',
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'fixed')),
  fix_note text not null default '',
  reported_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger equipment_touch before update on public.equipment_issues for each row execute function public.touch_updated_at();
alter table public.equipment_issues enable row level security;
create policy "equipment: staff read" on public.equipment_issues for select to authenticated using (public.is_staff());
create policy "equipment: staff report" on public.equipment_issues for insert to authenticated with check (public.is_staff() and reported_by = auth.uid());
create policy "equipment: staff update" on public.equipment_issues for update to authenticated using (public.is_staff());
create policy "equipment: admin delete" on public.equipment_issues for delete to authenticated using (public.is_admin() or reported_by = auth.uid());

-- ---------------------------------------------------------------------
-- Children's ministry: volunteer clearances and incident reports
-- ---------------------------------------------------------------------
create table public.kids_clearances (
  id uuid primary key default gen_random_uuid(),
  person_name text not null check (length(person_name) between 1 and 120),
  profile_id uuid references public.profiles (id) on delete set null,
  background_check_date date,
  background_expires date,
  training_date date,
  training_expires date,
  notes text not null default '',
  updated_by uuid default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger clearances_touch before update on public.kids_clearances for each row execute function public.touch_updated_at();
alter table public.kids_clearances enable row level security;
create policy "clearances: children team or pastoral" on public.kids_clearances for all to authenticated
  using (public.is_pastoral() or public.on_team('children'))
  with check (public.is_pastoral() or public.on_team('children'));

create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  location text not null default '',
  area text not null default 'children' check (area in ('children', 'service', 'building', 'outreach', 'other')),
  description text not null check (length(description) between 1 and 8000),
  people_involved text not null default '',
  action_taken text not null default '',
  parent_notified boolean not null default false,
  follow_up text not null default '',
  reported_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.incident_reports enable row level security;
create policy "incidents: pastoral or reporter read" on public.incident_reports for select to authenticated
  using (public.is_pastoral() or reported_by = auth.uid());
create policy "incidents: staff file" on public.incident_reports for insert to authenticated with check (public.is_staff() and reported_by = auth.uid());
create policy "incidents: pastoral update" on public.incident_reports for update to authenticated using (public.is_pastoral());
create policy "incidents: admin delete" on public.incident_reports for delete to authenticated using (public.is_admin());

create or replace function public.audit_incident() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_action('incident report filed', 'incident', new.id::text, jsonb_build_object('area', new.area));
  return new;
end $$;
create trigger incident_audit after insert on public.incident_reports for each row execute function public.audit_incident();

-- ---------------------------------------------------------------------
-- Indexes for common lists
-- ---------------------------------------------------------------------
create index on public.requests (status, created_at desc);
create index on public.prayers (created_at desc);
create index on public.documents (status, folder);
create index on public.carry_applications (status);
create index on public.events (starts_at);
create index on public.assignments (serve_date, team);
create index on public.audit_log (at desc);

-- ---------------------------------------------------------------------
-- Meet the Team: public bios and photos. Leaders write their own, an
-- admin approves before anything shows on the public website.
-- ---------------------------------------------------------------------
create table public.team_bios (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  title text not null default '' check (length(title) <= 120),
  bio text not null default '' check (length(bio) <= 3000),
  photo_path text,
  sort_order int not null default 100,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  review_note text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.guard_bio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.is_admin() then
    -- Any change by the leader goes back to the admin for approval.
    new.status := 'pending';
    if tg_op = 'UPDATE' then new.sort_order := old.sort_order; new.review_note := old.review_note; end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.log_action('bio ' || new.status, 'bio', new.profile_id::text, jsonb_build_object('name', new.display_name));
  end if;
  return new;
end $$;
create trigger bios_guard before insert or update on public.team_bios for each row execute function public.guard_bio();

alter table public.team_bios enable row level security;
create policy "bios: public sees approved" on public.team_bios for select to anon, authenticated using (status = 'approved');
create policy "bios: own or admin read" on public.team_bios for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "bios: staff write own" on public.team_bios for insert to authenticated
  with check ((profile_id = auth.uid() and public.is_staff()) or public.is_admin());
create policy "bios: own or admin edit" on public.team_bios for update to authenticated
  using ((profile_id = auth.uid() and public.is_staff()) or public.is_admin());
create policy "bios: own or admin delete" on public.team_bios for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- Public photo bucket for approved team photos. Path: <user id>/<file>
insert into storage.buckets (id, name, public) values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;
create policy "team photos: staff upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'team-photos' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "team photos: own or admin replace" on storage.objects for update to authenticated
  using (bucket_id = 'team-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "team photos: own or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'team-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "team photos: anyone can view" on storage.objects for select to anon, authenticated
  using (bucket_id = 'team-photos');
