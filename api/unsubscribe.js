// One-click unsubscribe from all member emails. Linked from the bottom of every email.
// GET shows a confirmation page. POST is what email apps send for their own "Unsubscribe" button.
import { db as getDb, esc, site } from './_email.js'

const page = (title, msg) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#EDE6D9;font-family:Arial,Helvetica,sans-serif;color:#2B2420">
<div style="max-width:480px;margin:40px auto;background:#F8F4EC;border:1px solid #D4C9B2;border-radius:12px;padding:28px">
<div style="font-family:Georgia,serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#7A2E2E">His Place Community Church</div>
<h1 style="font-family:Georgia,serif;font-size:24px">${esc(title)}</h1><p style="line-height:1.6">${msg}</p>
<p><a href="${site()}/portal/account#email-updates" style="color:#7A2E2E">Choose your email updates</a></p></div></body></html>`

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://x').searchParams
  // Seven Days of Hope uses its own stop link (?h=token).
  const hope = String(params.get('h') || '')
  if (hope) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (!/^[0-9a-f-]{36}$/i.test(hope)) { res.statusCode = 400; return res.end(page('That link didn’t work', 'The link looks incomplete.')) }
    try {
      const { data } = await getDb().from('hope_signups').update({ stopped: true }).eq('token', hope).select('id')
      res.statusCode = 200
      return res.end(page(data?.length ? 'Emails stopped' : 'Nothing to change', data?.length ? 'You won’t get any more Seven Days of Hope emails. If you ever want to talk with someone, you can always reach us at info@hpcchurch.church. We’re praying for you.' : 'We couldn’t find that sign-up. It may already be stopped.'))
    } catch {
      res.statusCode = 500
      return res.end(page('Something went wrong', 'Please try again in a little while.'))
    }
  }
  const token = String(params.get('t') || '')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (!/^[0-9a-f-]{36}$/i.test(token)) { res.statusCode = 400; return res.end(page('That link didn’t work', 'The unsubscribe link looks incomplete. You can turn emails off anytime under My account in the member portal.')) }
  try {
    const db = getDb()
    const { data } = await db.from('email_prefs').update({ pastor_answers: false, weekly_reading: false, discussions: false, help_board: false, prayer_wall: false, gatherings: false, care: false, new_questions: false, private_prayers: false, reported_posts: false, care_reminders: false, prayer_updates: false, post_replies: false, new_visitors: false, web_prayers: false, new_decisions: false })
      .eq('token', token).select('profile_id')
    res.statusCode = 200
    if (!data?.length) return res.end(page('Nothing to change', 'We couldn’t find email settings for that link. You can manage your emails under My account in the member portal.'))
    return res.end(page('You’re unsubscribed', 'You won’t get any more emails from the His Place member portal. Changed your mind? You can pick the emails you want anytime under My account.'))
  } catch {
    res.statusCode = 500
    return res.end(page('Something went wrong', 'Please try again in a little while, or turn emails off under My account in the member portal.'))
  }
}
