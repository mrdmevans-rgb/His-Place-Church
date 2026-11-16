// Personal morning emails, sent by the daily run in api/digest.js:
//   - Care reminders: the morning before someone's day on a Care calendar.
//   - Prayer updates: when people start praying for your request or leave an encouragement.
// Both are on unless the person turns them off in My account.
import { button, esc, layout, realEmail, sendEmails, site, unsubscribeLinks } from './_email.js'

const TZ = 'America/New_York'
const localDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const longDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })
const firstName = (p) => (p?.full_name || '').trim().split(/\s+/)[0] || ''

// Email settings for these people. Anyone without saved settings gets a row with the
// defaults (these two emails on) so their email can carry an unsubscribe link.
async function prefsFor(db, ids) {
  if (!ids.length) return {}
  const { data } = await db.from('email_prefs').select('profile_id, token, care_reminders, prayer_updates').in('profile_id', ids)
  const have = Object.fromEntries((data || []).map((p) => [p.profile_id, p]))
  const missing = ids.filter((id) => !have[id])
  if (missing.length) {
    await db.from('email_prefs').upsert(missing.map((id) => ({ profile_id: id })), { onConflict: 'profile_id', ignoreDuplicates: true })
    const { data: added } = await db.from('email_prefs').select('profile_id, token, care_reminders, prayer_updates').in('profile_id', missing)
    for (const p of added || []) have[p.profile_id] = p
  }
  return have
}

async function people(db, ids) {
  if (!ids.length) return {}
  const { data } = await db.from('profiles').select('id, full_name, email, active').in('id', ids)
  return Object.fromEntries((data || []).map((p) => [p.id, p]))
}

const footerText = (links) => `\n\nChange your emails: ${site()}/portal/account#email-updates\nUnsubscribe: ${links.unsub}`

export async function careReminders(db, now = new Date()) {
  const tomorrow = localDate(new Date(now.getTime() + 86400000))
  const { data: slots } = await db.from('care_slots')
    .select('id, slot_date, label, note, taken_by, care_pages(title, drop_off, status)')
    .eq('slot_date', tomorrow).not('taken_by', 'is', null)
  const open = (slots || []).filter((s) => s.care_pages?.status === 'open')
  if (!open.length) return { sent: 0 }
  const { data: done } = await db.from('care_reminders_sent').select('slot_id').in('slot_id', open.map((s) => s.id))
  const already = new Set((done || []).map((d) => d.slot_id))
  const todo = open.filter((s) => !already.has(s.id))
  const who = await people(db, [...new Set(todo.map((s) => s.taken_by))])
  const prefs = await prefsFor(db, Object.keys(who))
  const messages = [], claimed = []
  for (const s of todo) {
    const p = who[s.taken_by], pr = prefs[s.taken_by]
    if (!p?.active || !realEmail(p.email) || !pr || pr.care_reminders === false) continue
    // Claim it first, so it can only ever go out once.
    const { error } = await db.from('care_reminders_sent').insert({ slot_id: s.id, user_id: p.id })
    if (error) continue
    claimed.push(s.id)
    const c = s.care_pages, links = unsubscribeLinks(pr.token), first = firstName(p)
    const subject = `Reminder: ${s.label} tomorrow for ${c.title}`
    const body = `<p>Hi${first ? ` ${esc(first)}` : ''},</p>
<p>Thank you for helping! Just a reminder that you signed up for <strong>${esc(s.label)}</strong> tomorrow, ${esc(longDate(s.slot_date))}.</p>
<p><strong>${esc(c.title)}</strong></p>
${s.note ? `<p>You said: ${esc(s.note)}</p>` : ''}
${c.drop_off ? `<p><strong>Drop off:</strong> ${esc(c.drop_off)}</p>` : ''}
${button(`${site()}/portal/care`, 'See the care calendar')}
<p style="font-size:14px;color:#5B5147">Can't make it after all? Open the care calendar and tap "I can't anymore" so someone else can step in.</p>`
    messages.push({
      to: [p.email], subject, headers: links.headers,
      html: layout(subject, body, links.footer),
      text: `Hi${first ? ` ${first}` : ''},\n\nThank you for helping! A reminder that you signed up for ${s.label} tomorrow, ${longDate(s.slot_date)}, for ${c.title}.${s.note ? `\nYou said: ${s.note}` : ''}${c.drop_off ? `\nDrop off: ${c.drop_off}` : ''}\n\n${site()}/portal/care\nCan't make it after all? Open the care calendar and tap "I can't anymore" so someone else can step in.${footerText(links)}`,
    })
  }
  if (!messages.length) return { sent: 0 }
  try {
    return await sendEmails(messages)
  } catch (e) {
    await db.from('care_reminders_sent').delete().in('slot_id', claimed) // try again tomorrow's run if it failed
    throw e
  }
}

export async function prayerUpdates(db, { since, now = new Date() }) {
  const range = (q) => q.gt('created_at', since.toISOString()).lte('created_at', now.toISOString())
  const [{ data: praying }, { data: comments }] = await Promise.all([
    range(db.from('member_praying').select('prayer_id, user_id, member_prayers(author, title, hidden)')),
    range(db.from('member_prayer_comments').select('prayer_id, author, hidden, member_prayers(author, title, hidden)')),
  ])
  // Per request: who started praying, and how many new encouragements (not counting the person's own).
  const byPrayer = {}
  const slot = (id, mp) => (byPrayer[id] = byPrayer[id] || { author: mp.author, title: mp.title, prayers: new Set(), notes: 0 })
  for (const r of praying || []) {
    const mp = r.member_prayers
    if (!mp || mp.hidden || r.user_id === mp.author) continue
    slot(r.prayer_id, mp).prayers.add(r.user_id)
  }
  for (const r of comments || []) {
    const mp = r.member_prayers
    if (!mp || mp.hidden || r.hidden || r.author === mp.author) continue
    slot(r.prayer_id, mp).notes++
  }
  const items = Object.values(byPrayer)
  if (!items.length) return { sent: 0 }
  const authors = [...new Set(items.map((i) => i.author))]
  const who = await people(db, [...new Set([...authors, ...items.flatMap((i) => [...i.prayers])])])
  const prefs = await prefsFor(db, authors.filter((id) => who[id]?.active && realEmail(who[id]?.email)))
  const names = (ids) => {
    const list = [...ids].map((id) => firstName(who[id]) || 'Someone')
    return list.length <= 3 ? list.join(list.length === 2 ? ' and ' : ', ').replace(/, ([^,]*)$/, ', and $1') : `${list.slice(0, 2).join(', ')}, and ${list.length - 2} others`
  }
  const messages = []
  for (const id of authors) {
    const p = who[id], pr = prefs[id]
    if (!p || !pr || pr.prayer_updates === false) continue
    const mine = items.filter((i) => i.author === id)
    const lines = mine.map((i) => {
      const parts = []
      if (i.prayers.size) parts.push(`${names(i.prayers)} ${i.prayers.size === 1 ? 'is' : 'are'} praying`)
      if (i.notes) parts.push(`${i.notes} new encouragement${i.notes > 1 ? 's' : ''}`)
      return { title: i.title, text: parts.join(', plus ') }
    })
    const total = new Set(mine.flatMap((i) => [...i.prayers])).size
    const subject = total ? `${total === 1 ? 'Someone is' : `${total} people are`} praying for you` : 'You have new encouragement'
    const links = unsubscribeLinks(pr.token), first = firstName(p)
    const body = `<p>Hi${first ? ` ${esc(first)}` : ''},</p>
<p>Your church family is with you.</p>
<ul style="padding-left:18px">${lines.map((l) => `<li style="margin-bottom:8px"><strong>${esc(l.title)}</strong><br>${esc(l.text)}</li>`).join('')}</ul>
${button(`${site()}/portal/pray`, 'Open the prayer wall')}
<p style="font-size:14px;color:#5B5147">When God answers, you can mark your request answered on the prayer wall so everyone can rejoice with you.</p>`
    messages.push({
      to: [p.email], subject, headers: links.headers,
      html: layout(subject, body, links.footer),
      text: `Hi${first ? ` ${first}` : ''},\n\nYour church family is with you.\n\n${lines.map((l) => `${l.title}: ${l.text}`).join('\n')}\n\n${site()}/portal/pray${footerText(links)}`,
    })
  }
  return messages.length ? sendEmails(messages) : { sent: 0 }
}

// Run both. Each keeps its own "last run" time so one failing never affects the other.
export async function personalEmails(db, now = new Date()) {
  const out = {}
  out.care = await careReminders(db, now)
  const { data: st } = await db.from('email_state').select('at').eq('key', 'prayer_updates').maybeSingle()
  const since = st?.at && now - new Date(st.at) < 3 * 86400000 ? new Date(st.at) : new Date(now - 86400000)
  out.prayer = await prayerUpdates(db, { since, now })
  if (!out.prayer.skipped) await db.from('email_state').upsert({ key: 'prayer_updates', at: now.toISOString() })
  return out
}
