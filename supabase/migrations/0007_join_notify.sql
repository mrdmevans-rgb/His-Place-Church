-- Remember which join requests have already been emailed to admins.
alter table public.membership_requests add column if not exists notified_at timestamptz;
