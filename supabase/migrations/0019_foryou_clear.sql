-- "For you" clean-up: each member can hide single notices, or clear the whole list.
-- Hiding only tidies that member's own list. The reply or reaction itself stays.
alter table public.profiles add column if not exists activity_cleared_at timestamptz;
alter table public.profiles add column if not exists activity_hidden text[] not null default '{}';

-- Same as before, but skips anything at or before the member's last "Clear all".
create or replace function public.my_activity()
returns table (at timestamptz, actor uuid, what text, item_table text, comment_id uuid, my_text text, reply_text text, link text)
language sql stable security definer set search_path = public as $$
  select * from public.activity_for(auth.uid(), greatest(now() - interval '30 days',
    coalesce((select p.activity_cleared_at from public.profiles p where p.id = auth.uid()), '-infinity'::timestamptz)))
  where public.is_member()
$$;
revoke all on function public.my_activity() from public, anon;
grant execute on function public.my_activity() to authenticated;
