-- 1. Pastor alerts: email pastors about new questions, private prayer requests, and reported posts.
alter table public.email_prefs
  add column if not exists new_questions boolean not null default true,
  add column if not exists private_prayers boolean not null default true,
  add column if not exists reported_posts boolean not null default true;
-- Each item is emailed to the pastors once.
alter table public.pastor_questions add column if not exists notified_at timestamptz;
alter table public.member_prayers add column if not exists notified_at timestamptz;
alter table public.content_reports add column if not exists notified_at timestamptz;

-- 2. Public news posted from the Leader Portal.
alter table public.announcements
  add column if not exists show_public boolean not null default false,
  add column if not exists public_until date;
alter table public.events
  add column if not exists show_public boolean not null default false,
  add column if not exists public_details text not null default '' check (length(public_details) <= 2000);

-- The website reads only these safe fields. Internal notes, teams, and who posted never leave the portal.
create or replace function public.public_announcements()
returns table (id uuid, title text, body text, posted date)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.body, (a.created_at at time zone 'America/New_York')::date
  from public.announcements a
  where a.show_public and (a.public_until is null or a.public_until >= (now() at time zone 'America/New_York')::date)
  order by a.pinned desc, a.created_at desc
  limit 20
$$;

create or replace function public.public_events()
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz, location text, details text)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.starts_at, e.ends_at, e.location, e.public_details
  from public.events e
  where e.show_public and coalesce(e.ends_at, e.starts_at) >= now() - interval '6 hours'
  order by e.starts_at
  limit 30
$$;

revoke execute on function public.public_announcements(), public.public_events() from public;
grant execute on function public.public_announcements(), public.public_events() to anon, authenticated;
