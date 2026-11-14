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
  ['applicant', 'Carry applicant only'],
]
export const roleLabel = (r) => (ROLES.find(([id]) => id === r) || [r, r])[1]

export function friendlyError(error) {
  if (!error) return ''
  const m = error.message || String(error)
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that."
  if (/duplicate key.*carry_applications/i.test(m)) return 'You already have an application. Edit it instead.'
  if (/JWT|session/i.test(m)) return 'Your sign-in expired. Please sign in again.'
  return m
}
