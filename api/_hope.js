// Seven Days of Hope emails. Day 1 goes out right after someone signs up (api/notify.js);
// the rest go out one per morning with the daily run (api/digest.js).
// Nothing is sent unless a pastor has approved the content.
import { HOPE } from '../src/content/hope.js'
import { BIBLE_NOTICE, verse } from '../src/scripture.js'
import { CHURCH_ADDRESS, SUNDAY_SERVICE_TIME } from '../src/churchInfo.js'
import { button, esc, layout, sendEmails, site } from './_email.js'

const TZ = 'America/New_York'
const localDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const gateway = (ref) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NASB1995`
export const REPLY_TO = 'info@hpcchurch.church'

export function hopeEmail(n, person) {
  const d = HOPE.days[n - 1]
  const v = verse(d.verse)
  const hi = person.first_name ? `Hi ${esc(person.first_name)},` : 'Hi,'
  const stop = `${site()}/api/unsubscribe?h=${encodeURIComponent(person.token)}`
  const subject = `Day ${n} of 7: ${d.title}`
  const invite = d.invite ? `
<h2 style="font-family:Georgia,serif;font-size:17px;color:#7A2E2E;margin:22px 0 8px">Where to go from here</h2>
<p>If you'd like to talk with someone, just reply to this email. A real person from our church will write back.</p>
${button(`${site()}/know-jesus`, 'How to begin following Jesus')}
<p>You'd also be so welcome to visit. We meet ${esc(SUNDAY_SERVICE_TIME)} at ${esc(CHURCH_ADDRESS)}, and you can come as you are. <a style="color:#7A2E2E" href="${site()}/visit">Plan your visit</a>.</p>` : ''
  const html = layout(subject, `<p>${hi}</p>
<p><strong>Read:</strong> <a style="color:#7A2E2E" href="${gateway(d.read)}">${esc(d.read)}</a></p>
<blockquote style="margin:14px 0;padding:10px 16px;border-left:3px solid #7A2E2E;background:#EDE6D9;border-radius:0 8px 8px 0;font-family:Georgia,serif;line-height:1.6">${esc(v.text)}<br><span style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold">${esc(v.ref)}</span></blockquote>
${d.thought.map((t) => `<p style="line-height:1.65">${esc(t)}</p>`).join('')}
<p style="line-height:1.6"><strong>Something to think about:</strong> ${esc(d.question)}</p>
<p style="line-height:1.6"><strong>A simple prayer:</strong> <em>${esc(d.prayer)}</em></p>${invite}`,
  `You're getting this because you signed up for Seven Days of Hope at hpcchurch.church.<br><a href="${stop}" style="color:#7A2E2E">Stop these emails</a><br><span style="font-size:11px">${esc(BIBLE_NOTICE)}</span>`)
  const text = `${person.first_name ? `Hi ${person.first_name},` : 'Hi,'}\n\nRead: ${d.read} (${gateway(d.read)})\n\n"${v.text}" ${v.ref}\n\n${d.thought.join('\n\n')}\n\nSomething to think about: ${d.question}\n\nA simple prayer: ${d.prayer}\n${d.invite ? `\nIf you'd like to talk with someone, just reply to this email.\nHow to begin following Jesus: ${site()}/know-jesus\nPlan your visit: ${site()}/visit\n` : ''}\nStop these emails: ${stop}\n\n${BIBLE_NOTICE}`
  return { subject, html, text, headers: { 'List-Unsubscribe': `<${stop}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
}

// Send whatever day is due. onlyNew: just day 1 for people who signed up and haven't had it yet.
export async function hopeDue(db, { now = new Date(), onlyNew = false } = {}) {
  const { data: ok } = await db.rpc('is_approved', { p_key: 'hope' })
  if (!ok) return { sent: 0, reason: 'not approved' }
  let q = db.from('hope_signups').select('*').eq('stopped', false).lt('last_day', 7)
  if (onlyNew) q = q.eq('last_day', 0)
  const { data: people } = await q
  const today = localDate(now)
  const due = (people || []).filter((p) => !p.last_sent_at || localDate(new Date(p.last_sent_at)) < today)
  let sent = 0
  for (const p of due) {
    const n = p.last_day + 1
    // Claim this day first so it can only go out once.
    const { data: claimed } = await db.from('hope_signups').update({ last_day: n, last_sent_at: now.toISOString() })
      .eq('id', p.id).eq('last_day', p.last_day).select('id').maybeSingle()
    if (!claimed) continue
    const m = hopeEmail(n, p)
    try {
      const out = await sendEmails([{ to: [p.email], reply_to: REPLY_TO, ...m }])
      if (out.skipped) { await db.from('hope_signups').update({ last_day: p.last_day, last_sent_at: p.last_sent_at }).eq('id', p.id); return { sent, reason: out.skipped } }
      sent++
    } catch (e) {
      await db.from('hope_signups').update({ last_day: p.last_day, last_sent_at: p.last_sent_at }).eq('id', p.id)
      throw e
    }
  }
  return { sent }
}
