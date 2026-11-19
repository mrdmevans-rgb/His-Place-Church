-- Which boxes someone checked on the Know Jesus form ("I put my trust in Jesus today", and so on).
alter table public.decisions add column if not exists about text[] not null default '{}'
  check (coalesce(array_length(about, 1), 0) <= 8);
