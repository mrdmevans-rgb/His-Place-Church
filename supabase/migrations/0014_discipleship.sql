-- Discipleship paths that leaders assign to members (the first one is "Rooted").
-- The course itself lives in the website code (src/portal/member/courses).
-- Who sees what:
--   - Leaders, pastors, and admins assign, pause, and see everyone's progress (sessions done).
--   - A member sees their own assignment and works on it while it's active.
--   - A member's written answers can be read by the member, their mentor, and pastors and admins.

create table public.disciple_assignments (
  member_id uuid not null references public.profiles (id) on delete cascade,
  course text not null default 'rooted' check (course ~ '^[a-z0-9-]{2,40}$'),
  mentor_id uuid references public.profiles (id) on delete set null,
  assigned_by uuid default auth.uid() references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (member_id, course)
);
alter table public.disciple_assignments enable row level security;
create policy "disciple assignments: own or staff read" on public.disciple_assignments for select to authenticated
  using (member_id = auth.uid() or public.is_staff());
create policy "disciple assignments: staff assign" on public.disciple_assignments for insert to authenticated
  with check (public.is_staff() and exists (select 1 from public.profiles p where p.id = member_id and p.active and p.role in ('admin', 'pastor', 'leader', 'member')));
create policy "disciple assignments: staff change" on public.disciple_assignments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "disciple assignments: pastoral remove" on public.disciple_assignments for delete to authenticated
  using (public.is_pastoral());

create table public.disciple_work (
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course text not null,
  session int not null check (session between 1 and 100),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object' and length(answers::text) <= 100000),
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (member_id, course, session)
);
create trigger disciple_work_touch before update on public.disciple_work for each row execute function public.touch_updated_at();
alter table public.disciple_work enable row level security;

-- Is the signed-in person allowed to read this member's answers?
create or replace function public.can_read_disciple(p_member uuid, p_course text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_member = auth.uid() or public.is_pastoral()
    or exists (select 1 from public.disciple_assignments a
               where a.member_id = p_member and a.course = p_course and a.mentor_id = auth.uid() and public.is_staff())
$$;
revoke all on function public.can_read_disciple(uuid, text) from public, anon;
grant execute on function public.can_read_disciple(uuid, text) to authenticated;

create policy "disciple work: member, mentor, pastors read" on public.disciple_work for select to authenticated
  using (public.can_read_disciple(member_id, course));
create policy "disciple work: member writes while assigned" on public.disciple_work for insert to authenticated
  with check (member_id = auth.uid() and exists (select 1 from public.disciple_assignments a where a.member_id = auth.uid() and a.course = disciple_work.course and a.active));
create policy "disciple work: member edits while assigned" on public.disciple_work for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid() and exists (select 1 from public.disciple_assignments a where a.member_id = auth.uid() and a.course = disciple_work.course and a.active));

-- Progress for the leader page: how many sessions each person has finished, without their answers.
create or replace function public.disciple_progress()
returns table (member_id uuid, course text, sessions_done int, last_activity timestamptz)
language sql stable security definer set search_path = public as $$
  select a.member_id, a.course,
         (select count(*)::int from public.disciple_work w where w.member_id = a.member_id and w.course = a.course and w.done_at is not null),
         (select max(w.updated_at) from public.disciple_work w where w.member_id = a.member_id and w.course = a.course)
  from public.disciple_assignments a
  where public.is_staff()
$$;
revoke all on function public.disciple_progress() from public, anon;
grant execute on function public.disciple_progress() to authenticated;

-- Record assignments in the activity log.
create or replace function public.log_disciple_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only log real changes (not, say, a deleted leader's name being cleared from "assigned by").
  if tg_op = 'UPDATE' and new.active = old.active and new.mentor_id is not distinct from old.mentor_id then return new; end if;
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(),
          case when tg_op = 'INSERT' then 'discipleship assigned'
               when tg_op = 'DELETE' then 'discipleship removed'
               when new.active and not old.active then 'discipleship resumed'
               when not new.active and old.active then 'discipleship paused'
               else 'discipleship mentor changed' end,
          'disciple_assignment', coalesce(new.member_id, old.member_id)::text,
          jsonb_build_object('course', coalesce(new.course, old.course), 'mentor', coalesce(new.mentor_id, old.mentor_id)));
  return coalesce(new, old);
end $$;
revoke all on function public.log_disciple_assignment() from public, anon, authenticated;
create trigger disciple_assignments_log after insert or update or delete on public.disciple_assignments
  for each row execute function public.log_disciple_assignment();
