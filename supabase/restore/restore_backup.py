"""
Restore a His Place backup copy (the JSON file from Admin, Backups) into a database.

  python3 supabase/restore/restore_backup.py BACKUP.json "DATABASE CONNECTION" [--replace] [--with-logins]

What it does
  - Loads every table in the copy into the matching table, inside one transaction.
    If anything fails, nothing is changed.
  - Triggers are paused while loading, so the activity log and other automatic
    steps don't fire twice. Number counters are reset afterward.
  - Stops if a table already has rows, unless you pass --replace (which empties
    the portal's tables first). Use --replace only when you mean to roll back.
  - --with-logins also loads the login list (ids and emails, never passwords).
    Use it only for a practice restore into an empty test database. On the real
    Supabase project, logins live in Supabase Auth and are not restored this way.

Afterward it checks that every row came back and that nothing points at a
missing record, and prints a short report.
"""
import json
import sys

import psycopg
from psycopg import sql

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a for a in sys.argv[1:] if a.startswith('--')}
if len(args) != 2:
    sys.exit(__doc__)
backup_path, dsn = args
data = json.load(open(backup_path, encoding='utf-8'))
if data.get('format') != 1 or 'tables' not in data:
    sys.exit('That file does not look like a His Place backup copy.')

conn = psycopg.connect(dsn)
cur = conn.cursor()
cur.execute("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
db_tables = {r[0] for r in cur.fetchall()}
in_copy = set(data['tables'])
missing_here = sorted(in_copy - db_tables)
not_in_copy = sorted(db_tables - in_copy)
if len(in_copy & db_tables) < len(in_copy) / 2:
    sys.exit("This database doesn't have the portal's tables yet. Set it up from supabase/migrations first, then restore.")

try:
    cur.execute("set local session_replication_role = replica")  # pause triggers and reference checks while loading
    if '--replace' in flags:
        cur.execute(sql.SQL('truncate {} restart identity cascade').format(
            sql.SQL(', ').join(sql.Identifier('public', t) for t in sorted(in_copy & db_tables))))
    else:
        busy = []
        for t in sorted(in_copy & db_tables):
            cur.execute(sql.SQL('select exists (select 1 from {})').format(sql.Identifier('public', t)))
            if cur.fetchone()[0]:
                busy.append(t)
        if busy:
            raise SystemExit(f"These tables already have data: {', '.join(busy)}. Pass --replace to empty them first.")

    if '--with-logins' in flags:
        for u in data.get('auth_users', []):
            cur.execute("insert into auth.users (id, email, phone, created_at, last_sign_in_at) values (%s, %s, %s, %s, %s) on conflict (id) do nothing",
                        (u['id'], u['email'], u.get('phone'), u.get('created_at'), u.get('last_sign_in_at')))

    for t in sorted(in_copy & db_tables):
        rows = data['tables'][t]
        if rows:
            cur.execute(sql.SQL('insert into {t} overriding system value select * from jsonb_populate_recordset(null::{t}, %s::jsonb)')
                        .format(t=sql.Identifier('public', t)), (json.dumps(rows),))

    # Move number counters past the restored rows so new rows don't collide.
    cur.execute("""select table_name, column_name from information_schema.columns
                   where table_schema='public' and (is_identity='YES' or column_default like 'nextval(%%')""")
    for t, c in cur.fetchall():
        if t in in_copy:
            cur.execute(sql.SQL("select setval(pg_get_serial_sequence(%s, %s), coalesce((select max({c}) from {t}), 0) + 1, false)")
                        .format(c=sql.Identifier(c), t=sql.Identifier('public', t)), (f'public.{t}', c))

    cur.execute("set local session_replication_role = origin")

    # Check: every row came back.
    short = []
    for t in sorted(in_copy & db_tables):
        cur.execute(sql.SQL('select count(*) from {}').format(sql.Identifier('public', t)))
        have, want = cur.fetchone()[0], len(data['tables'][t])
        if have != want:
            short.append(f'{t}: {have} of {want}')
    # Check: nothing points at a missing record (single-column references).
    cur.execute("""select c.conrelid::regclass::text, a.attname, c.confrelid::regclass::text, fa.attname
                   from pg_constraint c
                   join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
                   join pg_attribute fa on fa.attrelid=c.confrelid and fa.attnum=c.confkey[1]
                   where c.contype='f' and c.connamespace='public'::regnamespace and array_length(c.conkey,1)=1""")
    orphans = []
    for child, col, parent, pcol in cur.fetchall():
        cur.execute(sql.SQL('select count(*) from {child} x where x.{col} is not null and not exists (select 1 from {parent} p where p.{pcol} = x.{col})').format(
            child=sql.SQL(child), col=sql.Identifier(col), parent=sql.SQL(parent), pcol=sql.Identifier(pcol)))
        n = cur.fetchone()[0]
        if n:
            orphans.append(f'{child}.{col} -> {parent}: {n}')
    if short or orphans:
        raise SystemExit('Restore stopped, nothing was changed.\n  Missing rows: ' + ('; '.join(short) or 'none') + '\n  Broken references: ' + ('; '.join(orphans) or 'none'))
    conn.commit()
except BaseException:
    conn.rollback()
    raise

total = sum(len(v) for v in data['tables'].values())
print(f"Restored {total} rows in {len(in_copy & db_tables)} tables from the copy made {data['made_at']}.")
print('Every row is back and every reference checks out.')
if missing_here:
    print('In the copy but not in this database (skipped): ' + ', '.join(missing_here))
if not_in_copy:
    print('In this database but not in the copy (left alone): ' + ', '.join(not_in_copy))
