// Instant emails.
//   POST {}                                  -> tell admins about new requests to join (called by the join page)
//   POST { kind: 'answer', id }  + sign-in   -> tell a member the pastor answered their question (called by the pastor)
// Each item is emailed once. Until RESEND_API_KEY is set in Vercel, this quietly does nothing.
import { button, db as getDb, esc, json, layout, readBody, realEmail, sendEmails, site, unsubscribeLinks } from './_email.js'

async function joinRequests(db, res) {
  // Claim new requests first so two calls can't double-send.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data: fresh, error } = await db.from('membership_requests').update({ notified_at: new Date().toISOString() })
    .eq('status', 'pending').is('notified_at', null).gte('created_at', since).select('id, full_name, email, phone, message')
  if (error) return json(res, 500, { error: error.message })
  if (!fresh?.length) return json(res, 200, { sent: false, reason: 'Nothing new.' })

  const { data: admins } = await db.from('profiles').select('email').eq('role', 'admin').eq('active', true)
  const to = (admins || []).map((a) => a.email).filter(realEmail)
  if (!to.length) return json(res, 200, { sent: false, reason: 'No admin email addresses.' })

  const link = `${site()}/portal/admin?tab=join`
  const n = fresh.length
  const subject = n === 1 ? `${fresh[0].full_name} asked to join the member portal` : `${n} people asked to join the member portal`
  const contact = (r) => [r.email, r.phone].filter(Boolean).join(', ')
  const list = fresh.map((r) => `<li style="margin-bottom:8px"><strong>${esc(r.full_name)}</strong>${contact(r) ? ` (${esc(contact(r))})` : ''}${r.message ? `<br><em>${esc(r.message)}</em>` : ''}</li>`).join('')
  const html = layout('Someone is waiting to join', `<p>These people asked for member portal access:</p><ul>${list}</ul>${button(link, 'Review requests')}
    <p style="color:#8C8171;font-size:13px">Approving creates their account and gives you a sign-in link to text them.</p>`)
  const text = `These people asked for member portal access:\n\n${fresh.map((r) => `- ${r.full_name}${contact(r) ? `, ${contact(r)}` : ''}${r.message ? `\n  "${r.message}"` : ''}`).join('\n')}\n\nReview requests: ${link}`
  try {
    const out = await sendEmails([{ to, subject, html, text }])
    if (out.skipped) {
      await db.from('membership_requests').update({ notified_at: null }).in('id', fresh.map((f) => f.id))
      return json(res, 200, { sent: false, reason: out.skipped })
    }
    return json(res, 200, { sent: true, count: n })
  } catch (e) {
    await db.from('membership_requests').update({ notified_at: null }).in('id', fresh.map((f) => f.id))
    return json(res, 502, { sent: false, error: e.message })
  }
}

async function pastorAnswer(db, req, res, id) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const { data: who } = token ? await db.auth.getUser(token) : { data: null }
  if (!who?.user) return json(res, 401, { error: 'Please sign in.' })
  const { data: me } = await db.from('profiles').select('role, active').eq('id', who.user.id).single()
  if (!me?.active || !['admin', 'pastor'].includes(me.role)) return json(res, 403, { error: 'Only pastors can do that.' })

  // Claim the answer so it's only emailed once.
  const { data: q } = await db.from('pastor_questions').update({ answer_emailed_at: new Date().toISOString() })
    .eq('id', id).is('answer_emailed_at', null).not('answered_at', 'is', null).select('id, author, question, answer').maybeSingle()
  if (!q) return json(res, 200, { sent: false, reason: 'Already emailed, or not answered yet.' })
  const [{ data: person }, { data: prefs }] = await Promise.all([
    db.from('profiles').select('full_name, email, active').eq('id', q.author).single(),
    db.from('email_prefs').select('pastor_answers, token').eq('profile_id', q.author).maybeSingle(),
  ])
  const wants = prefs ? prefs.pastor_answers : true // on by default
  if (!person?.active || !realEmail(person.email) || !wants) return json(res, 200, { sent: false, reason: 'They have not chosen this email.' })

  let tokenForLinks = prefs?.token
  if (!tokenForLinks) {
    const { data: created } = await db.from('email_prefs').insert({ profile_id: q.author }).select('token').single()
    tokenForLinks = created?.token
  }
  const links = unsubscribeLinks(tokenForLinks)
  const first = (person.full_name || '').split(' ')[0]
  const link = `${site()}/portal/ask`
  const html = layout('The pastor answered your question', `<p>Hi${first ? ` ${esc(first)}` : ''},</p>
    <p style="margin-bottom:6px"><strong>You asked:</strong></p><p style="white-space:pre-wrap;margin-top:0">${esc(q.question)}</p>
    <div style="border-left:3px solid #6B7752;background:#EDE6D9;padding:10px 14px;border-radius:4px;white-space:pre-wrap">${esc(q.answer)}</div>
    ${button(link, 'Open Ask the Pastor')}`, links.footer)
  const text = `Hi${first ? ` ${first}` : ''},\n\nYou asked:\n${q.question}\n\nThe pastor's answer:\n${q.answer}\n\n${link}\n\nUnsubscribe: ${links.unsub}`
  try {
    const out = await sendEmails([{ to: [person.email], subject: 'The pastor answered your question', html, text, headers: links.headers }])
    if (out.skipped) { await db.from('pastor_questions').update({ answer_emailed_at: null }).eq('id', q.id); return json(res, 200, { sent: false, reason: out.skipped }) }
    return json(res, 200, { sent: true })
  } catch (e) {
    await db.from('pastor_questions').update({ answer_emailed_at: null }).eq('id', q.id)
    return json(res, 502, { sent: false, error: e.message })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  let db
  try { db = getDb() } catch (e) { return json(res, 500, { error: e.message }) }
  const body = await readBody(req)
  if (body.kind === 'answer') return pastorAnswer(db, req, res, String(body.id || ''))
  return joinRequests(db, res)
}
