-- Member features: This Sunday and sermon notes, care reminders, prayer updates,
-- bigger text, and daily check marks for Read together.

-- ---------------------------------------------------------------------
-- 1. This Sunday. Members see only the sermon title, passage, and speaker
--    from the next run sheet. Everything else in the run sheet stays with leaders.
-- ---------------------------------------------------------------------
create or replace function public.this_sunday()
returns table (service_date date, sermon_title text, scripture text, speaker text)
language sql stable security definer set search_path = public as $$
  select s.service_date, s.sermon_title, s.scripture, s.speaker
  from public.services s
  where public.is_member()
    and s.service_date >= (now() at time zone 'America/New_York')::date
    and (s.sermon_title <> '' or s.scripture <> '')
  order by s.service_date
  limit 1
$$;
revoke all on function public.this_sunday() from public, anon;
grant execute on function public.this_sunday() to authenticated;

-- Private sermon notes. Only the person who wrote them can see them.
create table public.sermon_notes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  service_date date not null,
  sermon_title text not null default '' check (length(sermon_title) <= 300),
  scripture text not null default '' check (length(scripture) <= 300),
  body text not null default '' check (length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, service_date)
);
create trigger sermon_notes_touch before update on public.sermon_notes for each row execute function public.touch_updated_at();
alter table public.sermon_notes enable row level security;
create policy "sermon notes: own read" on public.sermon_notes for select to authenticated using (user_id = auth.uid());
create policy "sermon notes: own add" on public.sermon_notes for insert to authenticated with check (user_id = auth.uid() and public.is_member());
create policy "sermon notes: own edit" on public.sermon_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sermon notes: own delete" on public.sermon_notes for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2 and 3. Email choices: care reminders and prayer updates. On unless turned off.
-- ---------------------------------------------------------------------
alter table public.email_prefs
  add column if not exists care_reminders boolean not null default true,
  add column if not exists prayer_updates boolean not null default true;

-- Which care reminders went out, so nobody gets the same one twice. Server only.
create table public.care_reminders_sent (
  slot_id uuid primary key references public.care_slots (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.care_reminders_sent enable row level security;

-- ---------------------------------------------------------------------
-- 4. Bigger text, saved for each person.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists text_size text not null default 'normal' check (text_size in ('normal', 'large', 'larger'));

-- ---------------------------------------------------------------------
-- 5. Daily check marks in Read together. Private to each person.
-- ---------------------------------------------------------------------
create table public.reading_day_done (
  week_id uuid not null references public.reading_weeks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day text not null check (length(day) between 1 and 20),
  done_at timestamptz not null default now(),
  primary key (week_id, user_id, day)
);
alter table public.reading_day_done enable row level security;
create policy "reading days: own read" on public.reading_day_done for select to authenticated using (user_id = auth.uid());
create policy "reading days: own add" on public.reading_day_done for insert to authenticated with check (user_id = auth.uid() and public.is_member());
create policy "reading days: own remove" on public.reading_day_done for delete to authenticated using (user_id = auth.uid());
