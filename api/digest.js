// Morning email to members who chose updates. Runs once a day from Vercel Cron (see vercel.json).
//   - Mondays: this week's Read together plan (for those who chose it)
//   - Every day: titles and links for anything new in the areas each member picked, since the last run
//   - Every day: personal care reminders and prayer updates (see _reminders.js)
// Only titles go in the email. Details stay inside the portal.
// Vercel Cron sends "Authorization: Bearer CRON_SECRET". Anyone else is turned away.
import { personalEmails } from './_reminders.js'
import { MEMBER_ROLES, alertAdmins, button, db as getDb, esc, json, layout, realEmail, sendEmails, site, unsubscribeLinks } from './_email.js'

const TZ = 'America/New_York'
const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const weekday = (d = new Date()) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(d)
const when = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

export async function buildDigest(db, { now = new Date(), since } = {}) {
  const sinceIso = since.toISOString(), nowIso = now.toISOString()
  const isMonday = weekday(now) === 'Monday'
  const range = (q) => q.gt('created_at', sinceIso).lte('created_at', nowIso)

  const [week, lessonC, readingC, help, prayers, gatherings, care] = await Promise.all([
    isMonday ? db.from('reading_weeks').select('passage, days, note, question').eq('week_of', localDate(now)).maybeSingle().then((r) => r.data) : null,
    range(db.from('lesson_comments').select('author, lesson_id, study_lessons(title, series_id, study_series(status))').eq('hidden', false)).then((r) => r.data || []),
    range(db.from('reading_comments').select('author, reading_weeks(passage)').eq('hidden', false)).then((r) => r.data || []),
    range(db.from('help_posts').select('author, kind, title').eq('hidden', false).eq('status', 'open')).then((r) => r.data || []),
    range(db.from('member_prayers').select('author, title').eq('hidden', false).eq('pastors_only', false)).then((r) => r.data || []),
    range(db.from('gatherings').select('host, title, starts_at').eq('hidden', false).gte('starts_at', nowIso)).then((r) => r.data || []),
    range(db.from('care_pages').select('created_by, title').eq('status', 'open')).then((r) => r.data || []),
  ])

  const [{ data: people }, { data: prefs }] = await Promise.all([
    db.from('profiles').select('id, full_name, email').eq('active', true).in('role', MEMBER_ROLES),
    db.from('email_prefs').select('*'),
  ])
  const prefOf = Object.fromEntries((prefs || []).map((p) => [p.profile_id, p]))
  const url = (path) => `${site()}${path}`
  const messages = []

  for (const person of people || []) {
    const pr = prefOf[person.id]
    if (!pr || !realEmail(person.email)) continue
    const mine = (id) => id === person.id
    const sections = [] // { title, html, text }

    if (pr.weekly_reading && week) {
      const days = (week.days || []).map((d) => `<tr><td style="padding:3px 12px 3px 0;color:#5B5147;font-size:13px;text-transform:uppercase">${esc(d.day)}</td><td style="padding:3px 0"><a style="color:#7A2E2E" href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(d.passage)}&version=NASB1995">${esc(d.passage)}</a></td></tr>`).join('')
      sections.push({
        title: `This week's reading: ${week.passage}`,
        html: `${week.note ? `<p>${esc(week.note)}</p>` : ''}<table style="border-collapse:collapse;margin:6px 0 10px">${days}</table>${week.question ? `<p><strong>Think about:</strong> ${esc(week.question)}</p>` : ''}${button(url('/portal/read'), 'Open Read together')}`,
        text: `This week's reading: ${week.passage}\n${(week.days || []).map((d) => `${d.day}: ${d.passage}`).join('\n')}${week.question ? `\nThink about: ${week.question}` : ''}\n${url('/portal/read')}`,
      })
    }
    if (pr.discussions) {
      const byLesson = {}
      for (const c of lessonC) {
        const l = c.study_lessons
        if (mine(c.author) || !l || l.study_series?.status !== 'published') continue
        const k = c.lesson_id
        byLesson[k] = byLesson[k] || { title: l.title, link: url(`/portal/study/${l.series_id}/${k}`), n: 0 }
        byLesson[k].n++
      }
      const readingN = readingC.filter((c) => !mine(c.author)).length
      const items = Object.values(byLesson).map((x) => ({ text: `${x.n} new comment${x.n > 1 ? 's' : ''} on "${x.title}"`, link: x.link }))
      if (readingN) items.push({ text: `${readingN} new comment${readingN > 1 ? 's' : ''} on this week's reading`, link: url('/portal/read') })
      if (items.length) sections.push(list('New in the discussions', items))
    }
    if (pr.help_board) {
      const items = help.filter((h) => !mine(h.author)).map((h) => ({ text: `${h.kind === 'need' ? 'Need' : 'Offer'}: ${h.title}`, link: url('/portal/help') }))
      if (items.length) sections.push(list('New on the Help board', items))
    }
    if (pr.prayer_wall) {
      const items = prayers.filter((p) => !mine(p.author)).map((p) => ({ text: p.title, link: url('/portal/pray') }))
      if (items.length) sections.push(list('New on the Prayer wall', items))
    }
    if (pr.gatherings) {
      const items = gatherings.filter((g) => !mine(g.host)).map((g) => ({ text: `${g.title}, ${when(g.starts_at)}`, link: url('/portal/gatherings') }))
      if (items.length) sections.push(list('New gatherings', items))
    }
    if (pr.care) {
      const items = care.filter((c) => !mine(c.created_by)).map((c) => ({ text: c.title, link: url('/portal/care') }))
      if (items.length) sections.push(list('New ways to help a family', items))
    }
    if (!sections.length) continue

    const links = unsubscribeLinks(pr.token)
    const first = (person.full_name || '').split(' ')[0]
    const subject = sections.length === 1 ? sections[0].title : (sections[0].title.startsWith("This week's reading") ? `${sections[0].title}, plus what's new` : "What's new at His Place")
    const body = `<p>Good morning${first ? `, ${esc(first)}` : ''}!</p>` + sections.map((s) => `<h2 style="font-family:Georgia,serif;font-size:17px;color:#7A2E2E;margin:20px 0 8px">${esc(s.title)}</h2>${s.html}`).join('')
    messages.push({
      to: [person.email], subject, headers: links.headers,
      html: layout(subject, body, links.footer),
      text: `Good morning${first ? `, ${first}` : ''}!\n\n${sections.map((s) => s.text).join('\n\n')}\n\nChange your emails: ${site()}/portal/account#email-updates\nUnsubscribe: ${links.unsub}`,
    })
  }
  return messages
}

function list(title, items) {
  return {
    title,
    html: `<ul style="padding-left:18px;margin:0">${items.map((i) => `<li style="margin-bottom:6px"><a style="color:#2B2420" href="${esc(i.link)}">${esc(i.text)}</a></li>`).join('')}</ul>`,
    text: `${title}\n${items.map((i) => `- ${i.text}`).join('\n')}`,
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return json(res, 401, { error: 'Not allowed.' })
  let db
  try { db = getDb() } catch (e) { return json(res, 500, { error: e.message }) }
  const now = new Date()
  const { data: state } = await db.from('email_state').select('at').eq('key', 'digest').maybeSingle()
  // First run, or a long gap: look back one day at most.
  const since = state?.at && now - new Date(state.at) < 3 * 86400000 ? new Date(state.at) : new Date(now - 86400000)
  await checkBackups(db)
  // Personal emails (care reminders, prayer updates) run on their own, so a problem
  // with one never stops the other.
  let personal = null
  try {
    personal = await personalEmails(db, now)
  } catch (e) {
    personal = { error: e.message }
    await alertAdmins(db, 'personal', "This morning's reminders didn't go out", `The care reminders or prayer updates failed with this message: ${e.message}. They will try again tomorrow morning.`)
  }
  try {
    const messages = await buildDigest(db, { now, since })
    const out = messages.length ? await sendEmails(messages) : { sent: 0 }
    if (out.skipped) return json(res, 200, { sent: 0, reason: out.skipped, personal })
    await db.from('email_state').upsert({ key: 'digest', at: now.toISOString() })
    return json(res, 200, { sent: out.sent, personal })
  } catch (e) {
    await alertAdmins(db, 'digest', "This morning's email roundup didn't go out", `The daily email to members failed with this message: ${e.message}. It will try again tomorrow morning.`)
    return json(res, 502, { error: e.message, personal })
  }
}

// The weekly backup runs on Mondays. If the newest copy is more than 8 days old, it has stopped.
// (The digest checks this so a stopped backup can't go unnoticed, and the backup checks the digest.)
export async function checkBackups(db) {
  const { data } = await db.storage.from('backups').list('', { limit: 1, sortBy: { column: 'name', order: 'desc' } })
  const newest = (data || []).find((f) => f.name.startsWith('hisplace-backup-'))
  if (!newest) return null // no copies yet, so nothing has stopped
  const days = (Date.now() - new Date(newest.created_at)) / 86400000
  if (days > 8) await alertAdmins(db, 'backup-missing', 'The weekly backup has stopped', `The newest backup copy is ${Math.floor(days)} days old. A new one should be made every Monday morning. You can make one now from Admin, Backups.`)
  return days
}
