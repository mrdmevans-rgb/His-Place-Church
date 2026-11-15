import { createClient } from '@supabase/supabase-js'

// These two values are safe to be public. The database's own security rules
// decide what each signed-in person can see. They are set in Vercel as
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const portalConfigured = Boolean(url && anonKey)

export const supabase = portalConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const FILE_BUCKET = 'portal-files'

export const TEAMS = [
  ['worship', 'Worship'],
  ['sound', 'Sound'],
  ['media', 'Camera and media'],
  ['children', "Children's ministry"],
  ['safety', 'Safety team'],
  ['outreach', 'Outreach'],
]
export const teamLabel = (t) => (TEAMS.find(([id]) => id === t) || [t, t])[1]

export const ROLES = [
  ['admin', 'Admin'],
  ['pastor', 'Pastor'],
  ['leader', 'Leader'],
  ['member', 'Member'],
  ['applicant', 'Carry applicant only'],
]
export const roleLabel = (r) => (ROLES.find(([id]) => id === r) || [r, r])[1]

// People without an email sign in with a login ID like john.smith.
export const LOGIN_DOMAIN = 'login.hpcchurch.church'
export const isLoginId = (email) => (email || '').toLowerCase().endsWith(`@${LOGIN_DOMAIN}`)
export const loginIdOf = (email) => (isLoginId(email) ? email.split('@')[0] : '')
export const toAccountEmail = (input) => {
  const v = (input || '').trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`
}
export const contactLabel = (email) => (isLoginId(email) ? `Login ID: ${loginIdOf(email)}` : email)

export function friendlyError(error) {
  if (!error) return ''
  const m = error.message || String(error)
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that."
  if (/duplicate key.*carry_applications/i.test(m)) return 'You already have an application. Edit it instead.'
  if (/JWT|session/i.test(m)) return 'Your sign-in expired. Please sign in again.'
  return m
}

// Calls the secure server tool (api/admin.js) as the signed-in person.
export async function callAdmin(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({ error: 'The server did not respond. Try again.' }))
  if (!res.ok) throw new Error(out.error || 'Something went wrong.')
  return out
}

// How many people are waiting for member access (admins only; others get 0).
export const pendingJoinCount = async () => {
  const { count } = await supabase.from('membership_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return count || 0
}
