-- Email updates each member chooses for themselves.
-- Only the member can see or change their own choices. The server (service key) reads them to send emails.
create table public.email_prefs (
  profile_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  pastor_answers boolean not null default true,   -- instant: the pastor answered my question
  weekly_reading boolean not null default false,  -- Monday: this week's Read together plan
  discussions boolean not null default false,     -- morning roundup: new Bible study and reading discussion posts
  help_board boolean not null default false,      -- morning roundup: new needs and offers
  prayer_wall boolean not null default false,     -- morning roundup: new prayer requests
  gatherings boolean not null default false,      -- morning roundup: new gatherings
  care boolean not null default false,            -- morning roundup: new care calendars
  token uuid not null unique default gen_random_uuid(), -- for one-click unsubscribe links
  updated_at timestamptz not null default now()
);
create trigger email_prefs_touch before update on public.email_prefs for each row execute function public.touch_updated_at();
alter table public.email_prefs enable row level security;
create policy "email prefs: own read" on public.email_prefs for select to authenticated using (profile_id = auth.uid());
create policy "email prefs: own insert" on public.email_prefs for insert to authenticated with check (profile_id = auth.uid() and public.is_member());
create policy "email prefs: own update" on public.email_prefs for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "email prefs: own delete" on public.email_prefs for delete to authenticated using (profile_id = auth.uid());

-- When each kind of automatic email last went out (server only, no policies).
create table public.email_state (
  key text primary key,
  at timestamptz not null
);
alter table public.email_state enable row level security;

-- Each answer is emailed to the person who asked only once.
alter table public.pastor_questions add column if not exists answer_emailed_at timestamptz;
