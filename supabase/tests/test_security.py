"""
Security tests for the Leader Portal database rules.

Runs against a local Postgres that has supabase/tests/local_stub.sql and the
migration applied. Each test acts as a real user (role "authenticated" with
that user's id), the same way Supabase does, and checks what is allowed.

  python3 supabase/tests/test_security.py "host=/var/tmp/hp-pg port=5433 dbname=portal user=postgres"
"""
import sys
import uuid
import psycopg

DSN = sys.argv[1]
conn = psycopg.connect(DSN, autocommit=True)
results = []


def sql(q, params=(), as_user=None, anon=False):
    """Run one statement as a user. Returns rows, or raises."""
    with conn.transaction():
        with conn.cursor() as cur:
            if anon:
                cur.execute("set local role anon")
                cur.execute("select set_config('request.jwt.claim.sub', '', true)")
            elif as_user:
                cur.execute("set local role authenticated")
                cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (str(as_user),))
            cur.execute(q, params)
            return cur.fetchall() if cur.description else cur.rowcount


def check(name, fn, expect):
    """expect: 'ok', 'denied' (error), or a callable on the result."""
    try:
        out = fn()
        if expect == 'denied':
            passed = isinstance(out, int) and out == 0  # silently filtered update/delete counts as denied
            detail = f'expected denial, got {out!r}'
        elif expect == 'ok':
            passed, detail = True, ''
        else:
            passed = bool(expect(out))
            detail = f'got {out!r}'
    except psycopg.Error as e:
        msg = str(e).splitlines()[0]
        passed = expect == 'denied'
        detail = msg
    results.append((passed, name, '' if passed else detail))


# ---------------- setup (as database owner) ----------------
def make_user(email, role, teams=(), active=True):
    uid = uuid.uuid4()
    sql("insert into auth.users (id, email) values (%s, %s)", (uid, email))
    sql("update public.profiles set role=%s, teams=%s, active=%s, full_name=%s where id=%s",
        (role, list(teams), active, email.split('@')[0], uid))
    return uid


ADMIN = make_user('admin@x.org', 'admin')
ADMIN2 = make_user('admin2@x.org', 'admin')
PASTOR = make_user('pastor@x.org', 'pastor')
WORSHIP = make_user('worship@x.org', 'leader', ['worship'])
KIDS = make_user('kids@x.org', 'leader', ['children'])
SAFETY = make_user('safety@x.org', 'leader', ['safety'])
APPL = make_user('applicant@x.org', 'applicant')
APPL2 = make_user('applicant2@x.org', 'applicant')
GONE = make_user('gone@x.org', 'leader', ['sound'], active=False)
fresh = uuid.uuid4()
sql("insert into auth.users (id, email) values (%s, 'new@x.org')", (fresh,))

check('new sign-in accounts start inactive applicant', lambda: sql("select role, active from public.profiles where id=%s", (fresh,)),
      lambda r: r == [('applicant', False)])

# ---------------- people ----------------
check('applicant sees only own profile', lambda: sql("select count(*) from public.profiles", as_user=APPL), lambda r: r[0][0] == 1)
check('leader sees everyone', lambda: sql("select count(*) from public.profiles", as_user=WORSHIP), lambda r: r[0][0] >= 9)
check('anonymous visitor sees no profiles', lambda: sql("select count(*) from public.profiles", anon=True), lambda r: r[0][0] == 0)
check('inactive leader sees only self', lambda: sql("select count(*) from public.profiles", as_user=GONE), lambda r: r[0][0] == 1)
check('leader cannot make self admin', lambda: sql("update public.profiles set role='admin' where id=%s", (WORSHIP,), as_user=WORSHIP), 'denied')
check('applicant cannot activate self as leader', lambda: sql("update public.profiles set role='leader' where id=%s", (APPL,), as_user=APPL), 'denied')
check('leader can edit own name and phone', lambda: sql("update public.profiles set phone='555' where id=%s", (WORSHIP,), as_user=WORSHIP), lambda r: r == 1)
check('leader cannot edit someone else', lambda: sql("update public.profiles set phone='1' where id=%s", (KIDS,), as_user=WORSHIP), 'denied')
check('admin can change roles', lambda: sql("update public.profiles set teams='{worship,sound}' where id=%s", (WORSHIP,), as_user=ADMIN), lambda r: r == 1)
check('admin cannot remove own admin', lambda: sql("update public.profiles set role='leader' where id=%s", (ADMIN,), as_user=ADMIN), 'denied')
check('admin change is logged', lambda: sql("select count(*) from public.audit_log where action='account changed'"), lambda r: r[0][0] >= 1)

# ---------------- requests ----------------
rid = sql("insert into public.requests (kind, title, status, created_by) values ('supplies', 'Batteries', 'done', %s) returning id, status", (WORSHIP,), as_user=WORSHIP)
check('leader request is forced to submitted', lambda: rid, lambda r: r[0][1] == 'submitted')
rid = rid[0][0]
check('applicant cannot see requests', lambda: sql("select count(*) from public.requests", as_user=APPL), lambda r: r[0][0] == 0)
check('applicant cannot submit requests', lambda: sql("insert into public.requests (kind, title, created_by) values ('supplies','x',%s)", (APPL,), as_user=APPL), 'denied')
check('other leader sees request', lambda: sql("select count(*) from public.requests", as_user=KIDS), lambda r: r[0][0] == 1)
check('leader cannot mark own request done', lambda: sql("update public.requests set status='done' where id=%s", (rid,), as_user=WORSHIP), 'denied')
check('pastor can move request to in progress', lambda: sql("update public.requests set status='in_progress' where id=%s", (rid,), as_user=PASTOR), lambda r: r == 1)
check('leader cannot edit request once in progress', lambda: sql("update public.requests set title='y' where id=%s", (rid,), as_user=WORSHIP), 'denied')
check('leader can comment', lambda: sql("insert into public.request_comments (request_id, body, author) values (%s,'thanks',%s)", (rid, KIDS), as_user=KIDS), 'ok')
check('leader cannot comment as someone else', lambda: sql("insert into public.request_comments (request_id, body, author) values (%s,'x',%s)", (rid, PASTOR), as_user=KIDS), 'denied')

# ---------------- prayer ----------------
p1 = sql("insert into public.prayers (title, author) values ('Mom surgery', %s) returning id", (KIDS,), as_user=KIDS)[0][0]
p2 = sql("insert into public.prayers (title, author, pastors_only) values ('Private matter', %s, true) returning id", (KIDS,), as_user=KIDS)[0][0]
check('leaders see shared prayer', lambda: sql("select count(*) from public.prayers where id=%s", (p1,), as_user=WORSHIP), lambda r: r[0][0] == 1)
check('pastors-only prayer hidden from other leaders', lambda: sql("select count(*) from public.prayers where id=%s", (p2,), as_user=WORSHIP), lambda r: r[0][0] == 0)
check('pastors-only prayer visible to pastor', lambda: sql("select count(*) from public.prayers where id=%s", (p2,), as_user=PASTOR), lambda r: r[0][0] == 1)
check('pastors-only prayer visible to its author', lambda: sql("select count(*) from public.prayers where id=%s", (p2,), as_user=KIDS), lambda r: r[0][0] == 1)
check('applicant sees no prayers', lambda: sql("select count(*) from public.prayers", as_user=APPL), lambda r: r[0][0] == 0)
check('leader cannot comment on hidden prayer', lambda: sql("insert into public.prayer_comments (prayer_id, body, author) values (%s,'x',%s)", (p2, WORSHIP), as_user=WORSHIP), 'denied')
check('leader can mark praying', lambda: sql("insert into public.prayer_praying (prayer_id, user_id) values (%s,%s)", (p1, WORSHIP), as_user=WORSHIP), 'ok')
check('leader cannot edit another person\'s prayer', lambda: sql("update public.prayers set title='z' where id=%s", (p1,), as_user=WORSHIP), 'denied')

# ---------------- documents and files ----------------
path = f'docs/{WORSHIP}/setlist.pdf'
d1 = sql("insert into public.documents (title, storage_path, file_name, status, uploaded_by) values ('Set list', %s, 'setlist.pdf', 'approved', %s) returning id, status", (path, WORSHIP), as_user=WORSHIP)
check('leader upload is forced to pending', lambda: d1, lambda r: r[0][1] == 'pending')
d1 = d1[0][0]
check('leader can store file in own folder', lambda: sql("insert into storage.objects (bucket_id, name) values ('portal-files', %s)", (path,), as_user=WORSHIP), 'ok')
check('leader cannot store file in another folder', lambda: sql("insert into storage.objects (bucket_id, name) values ('portal-files', %s)", (f'docs/{KIDS}/x.pdf',), as_user=WORSHIP), 'denied')
check('applicant cannot upload files', lambda: sql("insert into storage.objects (bucket_id, name) values ('portal-files', %s)", (f'docs/{APPL}/x.pdf',), as_user=APPL), 'denied')
check('other leader cannot see pending document', lambda: sql("select count(*) from public.documents where id=%s", (d1,), as_user=KIDS), lambda r: r[0][0] == 0)
check('other leader cannot download pending file', lambda: sql("select count(*) from storage.objects where name=%s", (path,), as_user=KIDS), lambda r: r[0][0] == 0)
check('uploader sees own pending document', lambda: sql("select count(*) from public.documents where id=%s", (d1,), as_user=WORSHIP), lambda r: r[0][0] == 1)
check('admin sees pending document', lambda: sql("select count(*) from public.documents where id=%s", (d1,), as_user=ADMIN), lambda r: r[0][0] == 1)
check('pastor cannot approve documents', lambda: sql("update public.documents set status='approved' where id=%s", (d1,), as_user=PASTOR), 'denied')
check('uploader cannot approve own document', lambda: sql("update public.documents set status='approved' where id=%s", (d1,), as_user=WORSHIP), 'denied')
check('admin approves document', lambda: sql("update public.documents set status='approved' where id=%s", (d1,), as_user=ADMIN), lambda r: r == 1)
check('approved document visible to leaders', lambda: sql("select count(*) from public.documents where id=%s", (d1,), as_user=KIDS), lambda r: r[0][0] == 1)
check('approved file downloadable by leaders', lambda: sql("select count(*) from storage.objects where name=%s", (path,), as_user=KIDS), lambda r: r[0][0] == 1)
check('applicant cannot see approved documents', lambda: sql("select count(*) from public.documents", as_user=APPL), lambda r: r[0][0] == 0)
check('approval logged', lambda: sql("select count(*) from public.audit_log where action='document approved'"), lambda r: r[0][0] == 1)
pp = f'docs/{PASTOR}/care.pdf'
sql("insert into public.documents (title, storage_path, file_name, folder, status, uploaded_by) values ('Care notes', %s, 'c.pdf', 'Pastors', 'pending', %s)", (pp, PASTOR), as_user=PASTOR)
sql("update public.documents set status='approved' where storage_path=%s", (pp,), as_user=ADMIN)
check('Pastors folder hidden from leaders even when approved', lambda: sql("select count(*) from public.documents where storage_path=%s", (pp,), as_user=WORSHIP), lambda r: r[0][0] == 0)
check('leader cannot upload into Pastors folder', lambda: sql("insert into public.documents (title, storage_path, file_name, folder, uploaded_by) values ('x', %s, 'x', 'Pastors', %s)", (f'docs/{WORSHIP}/y.pdf', WORSHIP), as_user=WORSHIP), 'denied')

# ---------------- carry applications ----------------
def apply(uid, name):
    return sql("""insert into public.carry_applications (applicant_id, full_name, permit_type, issuing_place, license_last4, license_expires,
                  safety_policy_ack, signature_name, status) values (%s, %s, 'ohio_chl', 'Clermont', '1234', '2029-01-01', true, %s, 'approved')
                  returning id, status""", (uid, name, name), as_user=uid)

a1 = apply(APPL, 'Applicant One')
check('applicant application forced to pending', lambda: a1, lambda r: r[0][1] == 'pending')
a1 = a1[0][0]
check('applicant cannot submit twice', lambda: apply(APPL, 'Again'), 'denied')
check('applicant cannot apply for someone else', lambda: sql("insert into public.carry_applications (applicant_id, full_name, permit_type, safety_policy_ack, signature_name) values (%s,'x','none',true,'x')", (APPL2,), as_user=APPL), 'denied')
check('application requires policy acknowledgment', lambda: sql("insert into public.carry_applications (applicant_id, full_name, permit_type, safety_policy_ack, signature_name) values (%s,'x','none',false,'x')", (APPL2,), as_user=APPL2), 'denied')
check('license last 4 only, never full number', lambda: sql("insert into public.carry_applications (applicant_id, full_name, permit_type, license_last4, safety_policy_ack, signature_name) values (%s,'x','ohio_chl','AB1234567',true,'x')", (APPL2,), as_user=APPL2), 'denied')
check('applicant cannot approve self', lambda: sql("update public.carry_applications set status='approved' where id=%s", (a1,), as_user=APPL), 'denied')
check('other applicant cannot see it', lambda: sql("select count(*) from public.carry_applications", as_user=APPL2), lambda r: r[0][0] == 0)
check('safety leader can see applications', lambda: sql("select count(*) from public.carry_applications", as_user=SAFETY), lambda r: r[0][0] == 1)
check('approval needs license seen in person', lambda: sql("update public.carry_applications set status='approved' where id=%s", (a1,), as_user=SAFETY), 'denied')
check('denial needs a reason', lambda: sql("update public.carry_applications set status='denied' where id=%s", (a1,), as_user=SAFETY), 'denied')
check('leader marks license seen and approves', lambda: sql("update public.carry_applications set license_seen_by=%s, status='approved', approval_expires='2027-11-01' where id=%s returning decided_by, license_seen_by", (SAFETY, a1), as_user=SAFETY),
      lambda r: r[0][0] == SAFETY and r[0][1] == SAFETY)
check('roster shows approved carrier', lambda: sql("select full_name from public.carry_applications where status='approved'", as_user=WORSHIP), lambda r: r == [('Applicant One',)])
check('history recorded', lambda: sql("select action from public.carry_history where application_id=%s order by id", (a1,), as_user=ADMIN),
      lambda r: [x[0] for x in r] == ['submitted', 'approved', 'license seen in person'])
check('applicant sees own history', lambda: sql("select count(*) from public.carry_history where application_id=%s", (a1,), as_user=APPL), lambda r: r[0][0] == 3)
check('applicant edit sends it back for review', lambda: sql("update public.carry_applications set phone='513' where id=%s returning status, license_seen_by", (a1,), as_user=APPL),
      lambda r: r[0] == ('pending', None))
sql("update public.carry_applications set license_seen_by=%s, status='approved' where id=%s", (SAFETY, a1), as_user=SAFETY)
check('revoke needs a reason', lambda: sql("update public.carry_applications set status='revoked' where id=%s", (a1,), as_user=PASTOR), 'denied')
check('pastor revokes with reason', lambda: sql("update public.carry_applications set status='revoked', decision_reason='Policy violation' where id=%s", (a1,), as_user=PASTOR), lambda r: r == 1)
check('revoked applicant cannot edit to re-open', lambda: sql("update public.carry_applications set phone='1' where id=%s", (a1,), as_user=APPL), 'denied')
la = apply(SAFETY, 'Safety Leader')[0][0]
check('leader cannot approve own application', lambda: sql("update public.carry_applications set license_seen_by=%s, status='approved' where id=%s", (SAFETY, la), as_user=SAFETY), 'denied')
check('another leader can approve it', lambda: sql("update public.carry_applications set license_seen_by=%s, status='approved' where id=%s", (WORSHIP, la), as_user=WORSHIP), lambda r: r == 1)
check('inactive leader cannot see applications', lambda: sql("select count(*) from public.carry_applications", as_user=GONE), lambda r: r[0][0] == 0)
check('carry decisions logged', lambda: sql("select count(*) from public.audit_log where entity='carry'"), lambda r: r[0][0] >= 4)

# ---------------- teams ----------------
check('worship leader can schedule worship', lambda: sql("insert into public.assignments (serve_date, team, position, person_id) values ('2026-12-06','worship','Vocals',%s) returning id", (KIDS,), as_user=WORSHIP), lambda r: len(r) == 1)
check('children leader cannot schedule worship', lambda: sql("insert into public.assignments (serve_date, team, position) values ('2026-12-06','worship','Keys')", as_user=KIDS), 'denied')
asg = sql("select id from public.assignments limit 1")[0][0]
check('scheduled person can request swap', lambda: sql("update public.assignments set status='swap_requested', note='Out of town' where id=%s", (asg,), as_user=KIDS), lambda r: r == 1)
check('scheduled person cannot move the date', lambda: sql("update public.assignments set serve_date='2026-12-13' where id=%s", (asg,), as_user=KIDS), 'denied')
check('children leader manages clearances', lambda: sql("insert into public.kids_clearances (person_name, background_expires) values ('Jane','2028-01-01')", as_user=KIDS), 'ok')
check('worship leader cannot see clearances', lambda: sql("select count(*) from public.kids_clearances", as_user=WORSHIP), lambda r: r[0][0] == 0)
check('pastor sees clearances', lambda: sql("select count(*) from public.kids_clearances", as_user=PASTOR), lambda r: r[0][0] == 1)
inc = sql("insert into public.incident_reports (occurred_at, description, reported_by) values (now(), 'Scraped knee', %s) returning id", (KIDS,), as_user=KIDS)[0][0]
check('other leaders cannot read incident reports', lambda: sql("select count(*) from public.incident_reports", as_user=WORSHIP), lambda r: r[0][0] == 0)
check('reporter can read own report', lambda: sql("select count(*) from public.incident_reports", as_user=KIDS), lambda r: r[0][0] == 1)
check('pastor reads incident reports', lambda: sql("select count(*) from public.incident_reports", as_user=PASTOR), lambda r: r[0][0] == 1)
check('leader cannot edit incident report', lambda: sql("update public.incident_reports set follow_up='x' where id=%s", (inc,), as_user=KIDS), 'denied')
check('leaders add songs and announcements', lambda: (sql("insert into public.songs (title) values ('Way Maker')", as_user=WORSHIP), sql("insert into public.announcements (title) values ('Rehearsal moved')", as_user=WORSHIP)), 'ok')
check('leader reports equipment issue', lambda: sql("insert into public.equipment_issues (item, area) values ('Channel 4 crackles','sound')", as_user=WORSHIP), 'ok')
check('applicant sees no team data', lambda: sql("select (select count(*) from public.songs)+(select count(*) from public.announcements)+(select count(*) from public.equipment_issues)+(select count(*) from public.assignments)", as_user=APPL), lambda r: r[0][0] == 0)
check('activity log is admin only', lambda: sql("select count(*) from public.audit_log", as_user=PASTOR), lambda r: r[0][0] == 0)
check('admin reads activity log', lambda: sql("select count(*) from public.audit_log", as_user=ADMIN), lambda r: r[0][0] > 0)
check('anonymous visitor sees no carry data', lambda: sql("select count(*) from public.carry_applications", anon=True), lambda r: r[0][0] == 0)

# ---------------- meet the team ----------------
check('leader writes own bio, forced pending', lambda: sql("insert into public.team_bios (profile_id, display_name, title, status) values (%s, 'Worship Leader Jo', 'Worship Leader', 'approved') returning status", (WORSHIP,), as_user=WORSHIP), lambda r: r[0][0] == 'pending')
check('public cannot see pending bio', lambda: sql("select count(*) from public.team_bios", anon=True), lambda r: r[0][0] == 0)
check('leader cannot approve own bio', lambda: sql("update public.team_bios set status='approved' where profile_id=%s returning status", (WORSHIP,), as_user=WORSHIP), lambda r: r[0][0] == 'pending')
check('applicant cannot create a bio', lambda: sql("insert into public.team_bios (profile_id, display_name) values (%s, 'x')", (APPL,), as_user=APPL), 'denied')
check('leader cannot write someone else\'s bio', lambda: sql("insert into public.team_bios (profile_id, display_name) values (%s, 'x')", (KIDS,), as_user=WORSHIP), 'denied')
check('admin approves bio', lambda: sql("update public.team_bios set status='approved' where profile_id=%s", (WORSHIP,), as_user=ADMIN), lambda r: r == 1)
check('public sees approved bio', lambda: sql("select display_name from public.team_bios", anon=True), lambda r: r == [('Worship Leader Jo',)])
check('leader edit sends bio back for approval', lambda: sql("update public.team_bios set bio='New bio' where profile_id=%s returning status", (WORSHIP,), as_user=WORSHIP), lambda r: r[0][0] == 'pending')
check('public no longer sees it until re-approved', lambda: sql("select count(*) from public.team_bios", anon=True), lambda r: r[0][0] == 0)
check('leader uploads photo to own folder', lambda: sql("insert into storage.objects (bucket_id, name) values ('team-photos', %s)", (f'{WORSHIP}/me.jpg',), as_user=WORSHIP), 'ok')
check('leader cannot upload into another folder', lambda: sql("insert into storage.objects (bucket_id, name) values ('team-photos', %s)", (f'{KIDS}/me.jpg',), as_user=WORSHIP), 'denied')
check('public can view team photos', lambda: sql("select count(*) from storage.objects where bucket_id='team-photos'", anon=True), lambda r: r[0][0] == 1)
check('public still cannot see private files', lambda: sql("select count(*) from storage.objects where bucket_id='portal-files'", anon=True), lambda r: r[0][0] == 0)

failed = [r for r in results if not r[0]]
for ok, name, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))
print(f'\n{len(results) - len(failed)}/{len(results)} passed')
sys.exit(1 if failed else 0)
