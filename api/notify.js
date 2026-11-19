// Instant emails.
//   POST {}                                  -> tell admins about new requests to join (called by the join page)
//   POST { kind: 'answer', id }  + sign-in   -> tell a member the pastor answered their question (called by the pastor)
//   POST { kind: 'question' | 'prayer' | 'report', id } + sign-in
//                                            -> tell pastors about a new question, private prayer request, or reported post
//   POST { kind: 'visitor' }                 -> tell pastors about new Plan Your Visit sign-ups (called by the visit form)
//   POST { kind: 'hope' }                    -> send day 1 of Seven Days of Hope to new sign-ups
//   POST { kind: 'webprayer' }               -> tell leaders about new prayer requests from the website
//   POST { kind: 'decision' }                -> tell pastors someone said yes to Jesus
//   POST { kind: 'prayed', id } + sign-in    -> tell a website prayer requester we prayed for them
//   POST { kind: 'paired', id } + sign-in    -> tell a member and their Walk With Me mentor they've been paired
// Each item is emailed once. Until RESEND_API_KEY is set in Vercel, this quietly does nothing.
import { button, db as getDb, esc, json, layout, readBody, realEmail, sendEmails, site, unsubscribeLinks } from './_email.js'
import { REPLY_TO, hopeDue } from './_hope.js'

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

// ---------- Pastor alerts ----------
const AREA = { lesson_comments: 'Bible study discussion', member_prayers: 'Prayer wall', member_prayer_comments: 'Prayer wall encouragement', help_posts: 'Help board', help_replies: 'Help board reply', gatherings: 'Gatherings', reading_comments: 'Read together discussion', praise_reports: 'Praise report', praise_comments: 'Praise report comment' }

async function signedIn(db, req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await db.auth.getUser(token)
  if (!data?.user) return null
  const { data: me } = await db.from('profiles').select('id, active, role').eq('id', data.user.id).single()
  return me?.active ? me : null
}

// Pastors and admins who want this kind of alert (on unless they turned it off).
async function newVisitors(db, res) {
  // Claim new sign-ups first so two calls can't double-send.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data: fresh, error } = await db.from('visitors').update({ notified_at: new Date().toISOString() })
    .eq('source', 'website').is('notified_at', null).gte('created_at', since)
    .select('id, full_name, email, phone, visit_date, adults, kids, notes')
  if (error) return json(res, 500, { error: error.message })
  if (!fresh?.length) return json(res, 200, { sent: false, reason: 'Nothing new.' })
  const release = () => db.from('visitors').update({ notified_at: null }).in('id', fresh.map((f) => f.id))
  const pastors = await pastorsWanting(db, 'new_visitors')
  if (!pastors.length) { await release(); return json(res, 200, { sent: false, reason: 'No pastors want this email.' }) }
  const when = (d) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }) : 'Not sure yet')
  const link = `${site()}/portal/visitors`
  const n = fresh.length
  const subject = n === 1 ? `${fresh[0].full_name} is planning to visit ${fresh[0].visit_date ? when(fresh[0].visit_date) : 'soon'}` : `${n} people are planning to visit`
  const item = (v) => `<li style="margin-bottom:10px"><strong>${esc(v.full_name)}</strong>, ${esc(when(v.visit_date))}<br>${esc([v.email, v.phone].filter(Boolean).join(', '))}<br>${v.adults} adult${v.adults === 1 ? '' : 's'}${v.kids ? `, kids: ${esc(v.kids)}` : ''}${v.notes ? `<br><em>${esc(v.notes)}</em>` : ''}</li>`
  const bodyHtml = `<p>Someone filled out Plan Your Visit:</p><ul>${fresh.map(item).join('')}</ul>${button(link, 'Open the visitor list')}<p style="color:#8C8171;font-size:13px">A quick welcome text before Sunday goes a long way. The visitor list has one ready to send.</p>`
  const bodyText = `Someone filled out Plan Your Visit:\n\n${fresh.map((v) => `- ${v.full_name}, ${when(v.visit_date)}\n  ${[v.email, v.phone].filter(Boolean).join(', ')}\n  ${v.adults} adult(s)${v.kids ? `, kids: ${v.kids}` : ''}${v.notes ? `\n  "${v.notes}"` : ''}`).join('\n')}\n\nVisitor list: ${link}`
  const messages = pastors.map((p) => {
    const links = unsubscribeLinks(p.token)
    return { to: [p.email], subject, headers: links.headers, html: layout('A visitor is coming', bodyHtml, links.footer), text: `${bodyText}\n\nUnsubscribe: ${links.unsub}` }
  })
  try {
    const out = await sendEmails(messages)
    if (out.skipped) { await release(); return json(res, 200, { sent: false, reason: out.skipped }) }
    return json(res, 200, { sent: true, count: n })
  } catch (e) {
    await release()
    return json(res, 502, { sent: false, error: e.message })
  }
}

// Claim rows not yet emailed (last 24 hours) so two calls can't double-send.
async function claimNew(db, table, cols, extra = (q) => q) {
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data, error } = await extra(db.from(table).update({ notified_at: new Date().toISOString() }).is('notified_at', null).gte('created_at', since)).select(cols)
  if (error) throw new Error(error.message)
  return data || []
}
async function sendToMany(people, subject, title, bodyHtml, bodyText, release) {
  if (!people.length) { await release(); return { sent: false, reason: 'Nobody wants this email.' } }
  const messages = people.map((p) => {
    const links = unsubscribeLinks(p.token)
    return { to: [p.email], subject, headers: links.headers, html: layout(title, bodyHtml, links.footer), text: `${bodyText}\n\nUnsubscribe: ${links.unsub}` }
  })
  try {
    const out = await sendEmails(messages)
    if (out.skipped) { await release(); return { sent: false, reason: out.skipped } }
    return { sent: true, count: out.sent }
  } catch (e) { await release(); return { sent: false, error: e.message } }
}
const quoteBox = (t) => `<div style="border-left:3px solid #B8862F;background:#EDE6D9;padding:10px 14px;border-radius:4px;white-space:pre-wrap">${esc(t)}</div>`

async function webPrayers(db, res) {
  let rows
  try { rows = await claimNew(db, 'web_prayers', 'id, full_name, email, request, pastors_only') } catch (e) { return json(res, 500, { error: e.message }) }
  if (!rows.length) return json(res, 200, { sent: false, reason: 'Nothing new.' })
  const out = {}
  for (const group of [rows.filter((r) => !r.pastors_only), rows.filter((r) => r.pastors_only)]) {
    if (!group.length) continue
    const priv = group[0].pastors_only
    const people = await pastorsWanting(db, 'web_prayers', !priv)
    const link = `${site()}/portal/prayer?tab=web`
    const subject = group.length === 1 ? `Prayer request from ${group[0].full_name}${priv ? ' (pastors only)' : ''}` : `${group.length} new prayer requests from the website`
    const html = `<p>${priv ? 'For pastors only. Please keep this confidential.' : 'New from the website prayer form:'}</p>${group.map((r) => `<p><strong>${esc(r.full_name)}</strong></p>${quoteBox(r.request)}`).join('')}${button(link, 'Pray, then let them know')}<p style="color:#8C8171;font-size:13px">After you pray, tap "We prayed for you" and they'll get a short note saying so.</p>`
    const text = `${group.map((r) => `${r.full_name}:\n${r.request}`).join('\n\n')}\n\nOpen: ${link}`
    out[priv ? 'pastors' : 'leaders'] = await sendToMany(people, subject, 'Someone asked for prayer', html, text, () => db.from('web_prayers').update({ notified_at: null }).in('id', group.map((g) => g.id)))
  }
  return json(res, 200, out)
}

async function decisions(db, res) {
  let rows
  try { rows = await claimNew(db, 'decisions', 'id, full_name, email, phone, note') } catch (e) { return json(res, 500, { error: e.message }) }
  if (!rows.length) return json(res, 200, { sent: false, reason: 'Nothing new.' })
  const people = await pastorsWanting(db, 'new_decisions')
  const link = `${site()}/portal/visitors`
  const subject = rows.length === 1 ? `${rows[0].full_name} said yes to Jesus` : `${rows.length} people said yes to Jesus`
  const html = `<p>Someone shared on the website that they've decided to follow Jesus. Praise God!</p>${rows.map((r) => `<p><strong>${esc(r.full_name)}</strong>${[r.email, r.phone].filter(Boolean).length ? `<br>${esc([r.email, r.phone].filter(Boolean).join(', '))}` : '<br><em>No contact info given</em>'}</p>${r.note ? quoteBox(r.note) : ''}`).join('')}${button(link, 'Welcome them')}<p style="color:#8C8171;font-size:13px">The first few days matter most. A welcome, a talk about baptism, and a mentor can help them put down deep roots.</p>`
  const text = `Someone said yes to Jesus on the website:\n\n${rows.map((r) => `${r.full_name} ${[r.email, r.phone].filter(Boolean).join(', ')}${r.note ? `\n"${r.note}"` : ''}`).join('\n\n')}\n\nWelcome them: ${link}`
  return json(res, 200, await sendToMany(people, subject, 'Someone said yes to Jesus', html, text, () => db.from('decisions').update({ notified_at: null }).in('id', rows.map((r) => r.id))))
}

async function prayedFor(db, req, res, id) {
  const me = await signedIn(db, req)
  if (!me || !['admin', 'pastor', 'leader'].includes(me.role)) return json(res, 403, { error: 'Leaders only.' })
  const claimed = (await db.from('web_prayers').update({ told_at: new Date().toISOString() }).eq('id', id).not('prayed_at', 'is', null).is('told_at', null).eq('wants_note', true).neq('email', '').select('id, full_name, email, pastors_only').maybeSingle()).data
  if (!claimed) return json(res, 200, { sent: false, reason: 'Already sent, no email, or not marked prayed yet.' })
  if (claimed.pastors_only && !['admin', 'pastor'].includes(me.role)) { await db.from('web_prayers').update({ told_at: null }).eq('id', id); return json(res, 403, { error: 'Pastors only.' }) }
  const first = claimed.full_name.trim().split(/\s+/)[0]
  const subject = 'We prayed for you today'
  const html = layout(subject, `<p>Hi ${esc(first)},</p><p>We wanted you to know that our church prayed for you by name today. You're not alone in what you're carrying, and God hears every word.</p><p>If you'd like to talk with someone, or there's an update you'd like to share, just reply to this email. A real person will read it.</p>${button(`${site()}/visit`, "You're always welcome at His Place")}<p>With love,<br>His Place Community Church</p>`, `You're getting this because you asked us to pray for you at hpcchurch.church.`)
  const text = `Hi ${first},\n\nWe wanted you to know that our church prayed for you by name today. You're not alone in what you're carrying, and God hears every word.\n\nIf you'd like to talk with someone, or there's an update you'd like to share, just reply to this email. A real person will read it.\n\nWith love,\nHis Place Community Church\n${site()}`
  try {
    const out = await sendEmails([{ to: [claimed.email], reply_to: REPLY_TO, subject, html, text }])
    if (out.skipped) { await db.from('web_prayers').update({ told_at: null }).eq('id', id); return json(res, 200, { sent: false, reason: out.skipped }) }
    return json(res, 200, { sent: true })
  } catch (e) {
    await db.from('web_prayers').update({ told_at: null }).eq('id', id)
    return json(res, 502, { sent: false, error: e.message })
  }
}

async function paired(db, req, res, id) {
  const me = await signedIn(db, req)
  if (!me || !['admin', 'pastor', 'leader'].includes(me.role)) return json(res, 403, { error: 'Leaders only.' })
  const r = (await db.from('mentor_requests').update({ notified_at: new Date().toISOString() }).eq('id', id).eq('status', 'paired').is('notified_at', null).select('member_id, mentor_id').maybeSingle()).data
  if (!r) return json(res, 200, { sent: false, reason: 'Already sent.' })
  const { data: ppl } = await db.from('profiles').select('id, full_name, email').in('id', [r.member_id, r.mentor_id])
  const by = Object.fromEntries((ppl || []).map((p) => [p.id, p]))
  const member = by[r.member_id], mentor = by[r.mentor_id]
  const f = (p) => (p?.full_name || '').split(' ')[0] || 'friend'
  const link = `${site()}/portal/walk-with-me`
  const msgs = []
  if (realEmail(member?.email)) msgs.push({ to: [member.email], subject: `${mentor?.full_name || 'Someone'} will walk with you`, html: layout('You have a mentor', `<p>Hi ${esc(f(member))},</p><p>${esc(mentor?.full_name || 'A mentor')} has agreed to walk with you in your faith. They'll reach out soon to find a time to meet, pray, and open God's Word together.</p>${button(link, 'Open Walk With Me')}`), text: `Hi ${f(member)},\n\n${mentor?.full_name || 'A mentor'} has agreed to walk with you in your faith. They'll reach out soon.\n\n${link}` })
  if (realEmail(mentor?.email)) msgs.push({ to: [mentor.email], subject: `You're walking with ${member?.full_name || 'someone new'}`, html: layout('Thank you for walking with someone', `<p>Hi ${esc(f(mentor))},</p><p>You've been paired with <strong>${esc(member?.full_name || 'a member')}</strong> through Walk With Me. Reach out this week to say hello and find a time to meet. You don't need all the answers. Love them, pray with them, and open the Word together.</p>${button(link, 'See who you are walking with')}`), text: `Hi ${f(mentor)},\n\nYou've been paired with ${member?.full_name || 'a member'} through Walk With Me. Reach out this week to say hello.\n\n${link}` })
  if (!msgs.length) return json(res, 200, { sent: false, reason: 'No email addresses.' })
  try {
    const out = await sendEmails(msgs)
    if (out.skipped) { await db.from('mentor_requests').update({ notified_at: null }).eq('id', id); return json(res, 200, { sent: false, reason: out.skipped }) }
    return json(res, 200, { sent: true, count: out.sent })
  } catch (e) {
    await db.from('mentor_requests').update({ notified_at: null }).eq('id', id)
    return json(res, 502, { sent: false, error: e.message })
  }
}

async function pastorsWanting(db, pref, includeLeaders = false) {
  const { data: people } = await db.from('profiles').select('id, full_name, email').eq('active', true).in('role', includeLeaders ? ['admin', 'pastor', 'leader'] : ['admin', 'pastor'])
  const list = (people || []).filter((p) => realEmail(p.email))
  if (!list.length) return []
  const { data: prefs } = await db.from('email_prefs').select('*').in('profile_id', list.map((p) => p.id))
  const byId = Object.fromEntries((prefs || []).map((p) => [p.profile_id, p]))
  const out = []
  for (const p of list) {
    let pr = byId[p.id]
    if (pr && pr[pref] === false) continue
    if (!pr) pr = (await db.from('email_prefs').insert({ profile_id: p.id }).select('token').single()).data
    out.push({ ...p, token: pr?.token })
  }
  return out
}

async function pastorAlert(db, req, res, kind, id) {
  const me = await signedIn(db, req)
  if (!me) return json(res, 401, { error: 'Please sign in.' })
  const now = new Date().toISOString()
  let claimed, subject, title, bodyHtml, bodyText, link, pref, table
  const nameOf = async (uid) => (await db.from('profiles').select('full_name').eq('id', uid).maybeSingle()).data?.full_name || 'A member'
  if (kind === 'question') {
    table = 'pastor_questions'; pref = 'new_questions'
    claimed = (await db.from(table).update({ notified_at: now }).eq('id', id).is('notified_at', null).select('id, author, question').maybeSingle()).data
    if (!claimed) return json(res, 200, { sent: false, reason: 'Already sent.' })
    const who = await nameOf(claimed.author)
    subject = `New question for the pastor from ${who}`
    title = 'A new question for the pastor'
    link = `${site()}/portal/ask`
    bodyHtml = `<p><strong>${esc(who)}</strong> asked:</p><div style="border-left:3px solid #B8862F;background:#EDE6D9;padding:10px 14px;border-radius:4px;white-space:pre-wrap">${esc(claimed.question)}</div>${button(link, 'Answer in the pastor inbox')}<p style="color:#8C8171;font-size:13px">Only pastors can see this question.</p>`
    bodyText = `${who} asked:\n\n${claimed.question}\n\nAnswer it here: ${link}`
  } else if (kind === 'prayer') {
    table = 'member_prayers'; pref = 'private_prayers'
    claimed = (await db.from(table).update({ notified_at: now }).eq('id', id).eq('pastors_only', true).is('notified_at', null).select('id, author, title, body').maybeSingle()).data
    if (!claimed) return json(res, 200, { sent: false, reason: 'Already sent, or not a private request.' })
    const who = await nameOf(claimed.author)
    subject = `Private prayer request from ${who}`
    title = 'A private prayer request'
    link = `${site()}/portal/pray`
    bodyHtml = `<p><strong>${esc(who)}</strong> sent a prayer request to the pastors only:</p><div style="border-left:3px solid #B8862F;background:#EDE6D9;padding:10px 14px;border-radius:4px"><strong>${esc(claimed.title)}</strong>${claimed.body ? `<div style="white-space:pre-wrap;margin-top:6px">${esc(claimed.body)}</div>` : ''}</div>${button(link, 'Open the prayer wall')}<p style="color:#8C8171;font-size:13px">Only pastors can see this request. Please keep it confidential.</p>`
    bodyText = `${who} sent a prayer request to the pastors only:\n\n${claimed.title}\n${claimed.body || ''}\n\nOpen the prayer wall: ${link}`
  } else {
    table = 'content_reports'; pref = 'reported_posts'
    // Members can't read reports back after filing them, so gather every report not yet emailed.
    const since = new Date(Date.now() - 86400000).toISOString()
    const rows = (await db.from(table).update({ notified_at: now }).is('notified_at', null).eq('resolved', false).gte('created_at', since).select('id, item_table, reason')).data || []
    if (!rows.length) return json(res, 200, { sent: false, reason: 'Already sent.' })
    claimed = { id: rows.map((r) => r.id) }
    subject = rows.length === 1 ? 'A post was reported in the member portal' : `${rows.length} posts were reported in the member portal`
    title = rows.length === 1 ? 'A post was reported' : `${rows.length} posts were reported`
    link = `${site()}/portal/reports`
    const lines = rows.map((r) => `<li>${esc(AREA[r.item_table] || 'Member portal')}${r.reason ? `: <em>${esc(r.reason)}</em>` : ''}</li>`).join('')
    bodyHtml = `<p>Someone reported ${rows.length === 1 ? 'a post' : 'posts'} for a pastor to look at:</p><ul>${lines}</ul>${button(link, 'Review reported posts')}`
    bodyText = `Reported for a pastor to look at:\n${rows.map((r) => `- ${AREA[r.item_table] || 'Member portal'}${r.reason ? `: ${r.reason}` : ''}`).join('\n')}\n\nReview: ${link}`
  }
  const release = () => db.from(table).update({ notified_at: null }).in('id', [].concat(claimed.id))
  const pastors = await pastorsWanting(db, pref)
  if (!pastors.length) return json(res, 200, { sent: false, reason: 'No pastors want this email.' })
  const messages = pastors.map((p) => {
    const links = unsubscribeLinks(p.token)
    return { to: [p.email], subject, headers: links.headers, html: layout(title, bodyHtml, links.footer), text: `${bodyText}\n\nUnsubscribe: ${links.unsub}` }
  })
  try {
    const out = await sendEmails(messages)
    if (out.skipped) { await release(); return json(res, 200, { sent: false, reason: out.skipped }) }
    return json(res, 200, { sent: true, count: out.sent })
  } catch (e) {
    await release()
    return json(res, 502, { sent: false, error: e.message })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  let db
  try { db = getDb() } catch (e) { return json(res, 500, { error: e.message }) }
  const body = await readBody(req)
  if (body.kind === 'answer') return pastorAnswer(db, req, res, String(body.id || ''))
  if (body.kind === 'visitor') return newVisitors(db, res)
  if (body.kind === 'webprayer') return webPrayers(db, res)
  if (body.kind === 'decision') return decisions(db, res)
  if (body.kind === 'prayed') return prayedFor(db, req, res, String(body.id || ''))
  if (body.kind === 'paired') return paired(db, req, res, String(body.id || ''))
  if (body.kind === 'hope') { try { return json(res, 200, await hopeDue(db, { onlyNew: true })) } catch (e) { return json(res, 502, { error: e.message }) } }
  if (['question', 'prayer', 'report'].includes(body.kind)) return pastorAlert(db, req, res, body.kind, String(body.id || ''))
  return joinRequests(db, res)
}
