// Admin-only actions for the Leader Portal. Runs on Vercel's server, never in
// the browser, because it uses the Supabase service key.
//
// Needs these Vercel environment variables:
//   SUPABASE_URL                 same as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    secret, from Supabase project settings
//   SITE_URL                     https://www.hpcchurch.church
import { createClient } from '@supabase/supabase-js'

const ROLES = ['admin', 'pastor', 'leader', 'applicant']
const TEAMS = ['worship', 'sound', 'media', 'children', 'safety', 'outreach']

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
  if (!me || me.role !== 'admin' || !me.active) return json(res, 403, { error: 'Only admins can do that.' })

  const body = await readBody(req)
  const action = body.action
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
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'Please enter a valid email address.' })

      let userId
      let link = null
      if (body.sendEmail) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
        if (error) throw error
        userId = data.user.id
      } else {
        const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
        if (error) throw error
        userId = data.user.id
        link = data.properties.action_link
      }
      const { error: pErr } = await admin.from('profiles').upsert({ id: userId, email, full_name: fullName, phone, role, teams, active: true })
      if (pErr) throw pErr
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'person invited', entity: 'profile', entity_id: userId, details: { email, role, teams } })
      return json(res, 200, { ok: true, link })
    }

    if (action === 'link') {
      // A fresh one-time sign-in link for someone already invited, to text or copy.
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
      if (error) throw error
      await admin.from('audit_log').insert({ actor: who.user.id, action: 'sign-in link created', entity: 'profile', entity_id: data.user.id, details: { email } })
      return json(res, 200, { ok: true, link: data.properties.action_link })
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
