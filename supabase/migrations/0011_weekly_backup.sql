-- Weekly backup copies of the portal's data.
-- api/backup.js calls backup_snapshot() with the service key once a week and
-- saves the result as a JSON file in the private "backups" storage bucket.
-- Admins download copies from the Leader Portal (Admin, Backups) through that
-- same server code. Nobody can reach the bucket or the function directly.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do update set public = false;
-- No storage policies on purpose: only the service key can read or write it.

create or replace function public.backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  rows jsonb;
  tables jsonb := '{}'::jsonb;
  counts jsonb := '{}'::jsonb;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t.table_name) into rows;
    tables := tables || jsonb_build_object(t.table_name, rows);
    counts := counts || jsonb_build_object(t.table_name, jsonb_array_length(rows));
  end loop;

  -- Who has a login (no passwords). Lets accounts be matched up again after a restore.
  rows := (select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'phone', u.phone,
      'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at) order by u.created_at), '[]'::jsonb)
    from auth.users u);
  counts := counts || jsonb_build_object('auth_users', jsonb_array_length(rows));

  return jsonb_build_object(
    'made_at', now(),
    'format', 1,
    'counts', counts,
    'auth_users', rows,
    'tables', tables
  );
end;
$$;

revoke all on function public.backup_snapshot() from public, anon, authenticated;
grant execute on function public.backup_snapshot() to service_role;
