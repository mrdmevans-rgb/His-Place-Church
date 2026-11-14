-- Record when an admin edits someone else's website bio (grammar fixes, etc.).
-- Admin edits keep the bio's current approval status.
create or replace function public.guard_bio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.is_admin() then
    -- Any change by the leader goes back to the admin for approval.
    new.status := 'pending';
    if tg_op = 'UPDATE' then new.sort_order := old.sort_order; new.review_note := old.review_note; end if;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.log_action('bio ' || new.status, 'bio', new.profile_id::text, jsonb_build_object('name', new.display_name));
    end if;
    if new.display_name is distinct from old.display_name or new.title is distinct from old.title
       or new.bio is distinct from old.bio or new.photo_path is distinct from old.photo_path then
      perform public.log_action('bio edited by admin', 'bio', new.profile_id::text, jsonb_build_object('name', new.display_name));
    end if;
  end if;
  return new;
end $$;
