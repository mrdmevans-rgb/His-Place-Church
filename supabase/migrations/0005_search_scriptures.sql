-- "Search the Scriptures" questions on each lesson: cross references members
-- compare for themselves where Bible teachers differ or a verse is easy to misread.
alter table public.study_lessons add column if not exists search jsonb not null default '[]';
