-- Housekeeping from Supabase's security check.
-- 1. Functions that run automatically (triggers) or only inside other functions don't need to be
--    callable by anyone directly. They still run as before.
revoke execute on function
  public.audit_incident(), public.audit_profiles(), public.carry_submitted(), public.guard_assignment(),
  public.guard_bio(), public.guard_care_slot(), public.guard_carry(), public.guard_document(),
  public.guard_hidden(), public.guard_membership_request(), public.guard_profile(), public.guard_question(),
  public.guard_request(), public.handle_new_user(), public.touch_updated_at(),
  public.log_action(text, text, text, jsonb)
from public, anon, authenticated;

-- 2. Member-only lookups: signed-in users only (each one also checks membership inside).
revoke execute on function public.celebrations(), public.directory_list(), public.member_names(), public.pastor_faq() from public, anon;
grant execute on function public.celebrations(), public.directory_list(), public.member_names(), public.pastor_faq() to authenticated;

-- 3. Pin the search path on the one function that didn't have it set.
alter function public.touch_updated_at() set search_path = public;

-- The helper checks used by security rules (app_role, is_member, is_staff, is_pastoral, is_admin, on_team)
-- stay callable, because the rules themselves call them for every visitor.
