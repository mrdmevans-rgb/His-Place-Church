-- Daily Bible question.
-- Everyone gets the same question each day (Eastern time), in a shuffled order.
-- Members never read the question list directly, so the answer stays hidden
-- until they choose. Answers can't be changed after choosing.
-- Questions are loaded from supabase/content/trivia_seed.sql (built and checked
-- against the Bible text by supabase/content/build_trivia.py).

create table public.trivia_questions (
  id bigint generated always as identity primary key,
  sort_key int not null unique,
  question text not null check (length(question) between 5 and 400),
  choices text[] not null check (array_length(choices, 1) = 4),
  answer smallint not null check (answer between 0 and 3),
  reference text not null check (length(reference) between 3 and 80),
  explanation text not null default '' check (length(explanation) <= 600),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.trivia_questions enable row level security;
-- Only pastors and admins can see the list (with the answers).
create policy "trivia questions: pastoral read" on public.trivia_questions for select to authenticated using (public.is_pastoral());

create table public.trivia_answers (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  question_id bigint not null references public.trivia_questions (id) on delete cascade,
  choice smallint not null check (choice between 0 and 3),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.trivia_answers enable row level security;
create policy "trivia answers: own read" on public.trivia_answers for select to authenticated using (user_id = auth.uid());
-- No insert, update, or delete policies: answers go in only through trivia_answer().

-- Today's question for the signed-in member. Includes the answer only if they've already answered.
create or replace function public.trivia_today()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d date := (now() at time zone 'America/New_York')::date;
  n int;
  q public.trivia_questions;
  mine public.trivia_answers;
  out jsonb;
begin
  if not public.is_member() then return null; end if;
  select * into mine from public.trivia_answers where user_id = auth.uid() and day = d;
  if found then
    select * into q from public.trivia_questions where id = mine.question_id;
  else
    select count(*) into n from public.trivia_questions where active;
    if n = 0 then return null; end if;
    select * into q from public.trivia_questions where active
      order by sort_key offset ((d - date '2026-11-16') % n + n) % n limit 1;
  end if;
  out := jsonb_build_object('day', d, 'id', q.id, 'question', q.question, 'choices', to_jsonb(q.choices), 'answered', mine.user_id is not null);
  if mine.user_id is not null then
    out := out || jsonb_build_object(
      'my_choice', mine.choice, 'correct', mine.correct, 'answer', q.answer,
      'reference', q.reference, 'explanation', q.explanation,
      'today_count', (select count(*) from public.trivia_answers where day = d and question_id = q.id),
      'today_right', (select count(*) from public.trivia_answers where day = d and question_id = q.id and correct),
      'my_total', (select count(*) from public.trivia_answers where user_id = auth.uid()),
      'my_right', (select count(*) from public.trivia_answers where user_id = auth.uid() and correct));
  end if;
  return out;
end $$;

-- Lock in an answer for today, then return the result.
create or replace function public.trivia_answer(p_choice int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'America/New_York')::date;
  t jsonb;
  q public.trivia_questions;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  if p_choice is null or p_choice not between 0 and 3 then raise exception 'Choose one of the four answers'; end if;
  t := public.trivia_today();
  if t is null then raise exception 'There is no question today'; end if;
  if not (t->>'answered')::boolean then
    select * into q from public.trivia_questions where id = (t->>'id')::bigint;
    insert into public.trivia_answers (user_id, day, question_id, choice, correct)
    values (auth.uid(), d, q.id, p_choice, p_choice = q.answer)
    on conflict (user_id, day) do nothing;
  end if;
  return public.trivia_today();
end $$;

revoke all on function public.trivia_today() from public, anon;
revoke all on function public.trivia_answer(int) from public, anon;
grant execute on function public.trivia_today() to authenticated;
grant execute on function public.trivia_answer(int) to authenticated;
