// Emails church admins when someone asks to join the member portal.
// The join page calls this right after a request is saved. It only emails about
// pending requests that haven't been announced yet, so calling it again does nothing.
//
// Needs these Vercel environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL   (already set for api/admin.js)
//   RESEND_API_KEY   secret, from resend.com. Until it's set, this quietly does nothing.
//   NOTIFY_FROM      optional, defaults to His Place Portal <portal@hpcchurch.church>
import { createClient } from '@supabase/supabase-js'

const LOGIN_DOMAIN = 'login.hpcchurch.church'
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  const key = process.env.RESEND_API_KEY
  if (!key) return json(res, 200, { sent: false, reason: 'Email is not set up yet.' })
  const url = process.env.SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return json(res, 500, { error: 'Server is missing Supabase settings.' })
  const db = createClient(url, service, { auth: { persistSession: false } })

  // Requests from the last day that haven't been announced. Claim them first so two calls can't double-send.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data: fresh, error } = await db.from('membership_requests').update({ notified_at: new Date().toISOString() })
    .eq('status', 'pending').is('notified_at', null).gte('created_at', since).select('full_name, email, phone, message, created_at')
  if (error) return json(res, 500, { error: error.message })
  if (!fresh?.length) return json(res, 200, { sent: false, reason: 'Nothing new.' })

  const { data: admins } = await db.from('profiles').select('email').eq('role', 'admin').eq('active', true)
  const to = (admins || []).map((a) => a.email).filter((e) => e && !e.endsWith('@' + LOGIN_DOMAIN))
  if (!to.length) return json(res, 200, { sent: false, reason: 'No admin email addresses.' })

  const site = process.env.SITE_URL || 'https://www.hpcchurch.church'
  const link = `${site}/portal/admin?tab=join`
  const n = fresh.length
  const subject = n === 1 ? `${fresh[0].full_name} asked to join the member portal` : `${n} people asked to join the member portal`
  const list = fresh.map((r) => `<li><strong>${esc(r.full_name)}</strong>${[r.email, r.phone].filter(Boolean).length ? ` (${esc([r.email, r.phone].filter(Boolean).join(', '))})` : ''}${r.message ? `<br><em>${esc(r.message)}</em>` : ''}</li>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2B2420">
    <p>Someone is waiting to be approved for the His Place member portal:</p><ul>${list}</ul>
    <p><a href="${link}" style="display:inline-block;background:#7A2E2E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Review requests</a></p>
    <p style="color:#8C8171;font-size:13px">Sign in, then go to Admin, then Requests to join. Approving creates their account and gives you a sign-in link to text them.</p></div>`
  const text = `Someone is waiting to be approved for the His Place member portal:\n\n${fresh.map((r) => `- ${r.full_name}${r.email ? `, ${r.email}` : ''}${r.phone ? `, ${r.phone}` : ''}${r.message ? `\n  "${r.message}"` : ''}`).join('\n')}\n\nReview requests: ${link}`

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.NOTIFY_FROM || 'His Place Portal <portal@hpcchurch.church>', to, subject, html, text }),
  })
  if (!r.ok) {
    // Let it try again next time.
    await db.from('membership_requests').update({ notified_at: null }).in('created_at', fresh.map((f) => f.created_at))
    return json(res, 502, { sent: false, error: `Email service said ${r.status}` })
  }
  return json(res, 200, { sent: true, count: n })
}
