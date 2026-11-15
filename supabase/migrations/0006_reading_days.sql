-- Daily readings for each Read together week, Monday through Friday.
-- Each item: {"day": "Monday", "passage": "James 1"}
alter table public.reading_weeks add column if not exists days jsonb not null default '[]';
