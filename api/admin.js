// Admin-only actions for the Leader Portal. Runs on Vercel's server, never in
// the browser, because it uses the Supabase service key.
//
// Needs these Vercel environment variables:
//   SUPABASE_URL                 same as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    secret, from Supabase project settings
//   SITE_URL                     https://www.hpcchurch.church
import { createClient } from '@supabase/supabase-js'
import { button, esc, layout, sendEmails } from './_email.js'

const ROLES = ['admin', 'pastor', 'leader', 'member', 'applicant']
const TEAMS = ['worship', 'sound', 'media', 'children', 'safety', 'outreach']
// People without an email get a login ID like john.smith, stored behind the
// scenes as john.smith@login.hpcchurch.church. That address never receives mail.
const LOGIN_DOMAIN = 'login.hpcchurch.church'
const slug = (name) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z\s'-]/g, '').replace(/['-]/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.') || 'member'

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' })
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const site = (process.env.SITE_URL || 'https://www.hpcchurch.church').replace(/\/$/, '')
  if (!url || !serviceKey) return json(res, 500, { error: 'The portal is not fully set up yet.' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Who is asking? They must be signed in and an active admin.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return json(res, 401, { error: 'Please sign in.' })
  const { data: who, error: whoErr } = await admin.auth.getUser(token)
  if (whoErr || !who?.user) return json(res, 401, { error: 'Your sign-in expired. Please sign in again.' })
  const { data: me } = await admin.from('profiles').select('role, active').eq('id', who.user.id).single()
  if (!me || !me.active) return json(res, 403, { error: 'Your account is not active.' })
  const isAdmin = me.role === 'admin'

  const body = await readBody(req)
  const action = body.action

  if (action === 'set-email') {
    // Anyone can add or change their own email. Admins can do it for anyone.
    const id = String(body.id || who.user.id)
    if (id !== who.user.id && !isAdmin) return json(res, 403, { error: 'Only admins can change someone else\'s email.' })
    const newEmail = String(body.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) || newEmail.endsWith(`@${LOGIN_DOMAIN}`)) return json(res, 400, { error: 'Please enter a valid email address.' })
    const { data: before } = await admin.from('profiles').select('email').eq('id', id).single()
    const { error } = await admin.auth.admin.updateUserById(id, { email: newEmail, email_confirm: true })
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return json(res, 409, { error: 'That email is already used by another account.' })
      return json(res, 500, { error: error.message })
    }
    const { error: pErr } = await admin.from('profiles').update({ email: newEmail }).eq('id', id)
    if (pErr) return json(res, 500, { error: pErr.message })
    await admin.from('audit_log').insert({ actor: who.user.id, action: 'email changed', entity: 'profile', entity_id: id, details: { from: before?.email, to: newEmail } })
    return json(res, 200, { ok: true })
  }

  if (!isAdmin) return json(res, 403, { error: 'Only admins can do that.' })
  const email = String(body.email || '').trim().toLowerCase()
  const redirectTo = `${site}/portal`

  try {
    if (action === 'invite') {
      // Create the person and get a link to send. If sendEmail is true,
      // Supabase also emails them the invitation.
      const role = ROLES.includes(body.role) ? body.role : 'leader'
      const teams = Array.isArray(body.teams) ? body.teams.filter((t) => TEAMS.includes(t)) : []
      const fullName = String(body.full_name || '').trim().slice(0, 120)
      const phone = String(body.phone || '').trim().slice(0, 40)
      if (!fullName) return json(res, 400, { error: "Please enter the person's name." })
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'Please enter a valid email address, or leave it blank.' })

      let userId
      let link = null
      let loginId = null
      let accountEmail = email
      if (!email) {
        // No email: make a login ID and a link to text them.
        const base = slug(fullName)
        for (let n = 1; n <= 50 && !userId; n++) {
          loginId = n === 1 ? base : `${base}${n}`
          accountEmail = `${loginId}@${LOGIN_DOMAIN}`
          const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email: accountEmail, options: { redirectTo } })
          if (error && /already been registered|already exists/i.test(error.message)) continue
          if (error) throw error
          userId = data.user.id
          link = data.properties.action_link
        }
        if (!userId) return json(res, 409, { error: 'Could not make a login ID for that name. Try adding a middle initial.' })
      } else if (body.sendEmail) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
        if (error) throw error
        userId = data.user.id
      } else {
        const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
        if (error) throw error
        userId = data.user.id
        link = data.properties.action_link
      }
      const { error: pErr } = await admin.from('profiles').upsert({ id: userId, email: accountEmail, full_name: fullName, phone, role, teams, active: true })
      if (pErr) throw pErr
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'person invited', entity: 'profile', entity_id: userId, details: { email: email || `login ID ${loginId}`, role, teams } })
      return json(res, 200, { ok: true, link, loginId })
    }

    if (action === 'link') {
      // A fresh one-time sign-in link for someone already invited, to text or copy.
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
      if (error) throw error
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'sign-in link created', entity: 'profile', entity_id: data.user.id, details: { email } })
      return json(res, 200, { ok: true, link: data.properties.action_link })
    }

    if (action === 'not-signed-in') {
      // Active people who were approved but have never signed in.
      const never = new Map()
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw error
        for (const u of data.users) if (!u.last_sign_in_at) never.set(u.id, u.created_at)
        if (data.users.length < 1000) break
      }
      if (!never.size) return json(res, 200, { people: [] })
      const ids = [...never.keys()]
      const [{ data: people }, { data: sent }] = await Promise.all([
        admin.from('profiles').select('id, full_name, email, phone, role').eq('active', true).neq('role', 'applicant').in('id', ids),
        admin.from('audit_log').select('entity_id, at').in('action', ['sign-in link created', 'sign-in link emailed']).in('entity_id', ids).order('at', { ascending: false }),
      ])
      const lastSent = {}
      for (const r of sent || []) lastSent[r.entity_id] = lastSent[r.entity_id] || r.at
      const out = (people || []).map((p) => ({ ...p, invited_at: never.get(p.id), last_link_at: lastSent[p.id] || null }))
        .sort((a, b) => new Date(a.invited_at) - new Date(b.invited_at))
      return json(res, 200, { people: out })
    }

    if (action === 'email-link') {
      // Email a fresh sign-in link to someone who has a real email address.
      const id = String(body.id || '')
      const { data: p } = await admin.from('profiles').select('id, full_name, email, active').eq('id', id).single()
      if (!p?.active) return json(res, 404, { error: 'That person was not found.' })
      if (!p.email || p.email.endsWith(`@${LOGIN_DOMAIN}`)) return json(res, 400, { error: 'They don\'t have an email address. Use Get a link to text instead.' })
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: p.email, options: { redirectTo } })
      if (error) throw error
      const first = (p.full_name || '').split(' ')[0]
      const link = data.properties.action_link
      const html = layout('Your His Place portal is ready', `<p>Hi${first ? ` ${esc(first)}` : ''},</p>
<p>You've been approved for the His Place member portal, but it looks like you haven't signed in yet. Tap the button to sign in. No password needed.</p>
${button(link, 'Sign in to the portal')}
<p style="font-size:14px;color:#5B5147">This button works once and for 24 hours. After that, go to <a style="color:#7A2E2E" href="${site}/portal">${site.replace(/^https?:\/\//, '')}/portal</a>, choose Email me a link, and enter ${esc(p.email)}.</p>
<p>See you there!</p>`)
      const text = `Hi${first ? ` ${first}` : ''},\n\nYou've been approved for the His Place member portal, but it looks like you haven't signed in yet. Use this link to sign in (no password needed):\n${link}\n\nThe link works once and for 24 hours. After that, go to ${site}/portal, choose Email me a link, and enter ${p.email}.`
      const out = await sendEmails([{ to: [p.email], subject: 'Your His Place portal is ready', html, text }])
      if (out.skipped) return json(res, 503, { error: out.skipped })
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'sign-in link emailed', entity: 'profile', entity_id: p.id, details: { email: p.email } })
      return json(res, 200, { ok: true, email: p.email })
    }

    if (action === 'remove') {
      // Turn off a person's sign-in completely. Their past posts stay. Use restore to undo.
      const id = String(body.id || '')
      if (id === who.user.id) return json(res, 400, { error: "You can't remove yourself." })
      const { data: target } = await admin.from('profiles').select('email').eq('id', id).single()
      const { error: dErr } = await admin.from('profiles').update({ active: false }).eq('id', id)
      if (dErr) throw dErr
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' })
      if (error) throw error
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'person removed', entity: 'profile', entity_id: id, details: { email: target?.email } })
      return json(res, 200, { ok: true })
    }

    if (action === 'restore') {
      const id = String(body.id || '')
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })
      if (error) throw error
      const { error: pErr } = await admin.from('profiles').update({ active: true }).eq('id', id)
      if (pErr) throw pErr
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'person restored', entity: 'profile', entity_id: id, details: {} })
      return json(res, 200, { ok: true })
    }

    return json(res, 400, { error: 'Unknown action.' })
  } catch (e) {
    const msg = e?.message || 'Something went wrong.'
    if (/already been registered|already exists/i.test(msg)) return json(res, 409, { error: 'That email already has an account. Use "Send sign-in link" instead.' })
    return json(res, 500, { error: msg })
  }
}
