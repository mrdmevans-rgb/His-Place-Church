// Weekly backup copies of the portal's data.
//   GET  from Vercel Cron (Authorization: Bearer CRON_SECRET): make a copy, then tidy old ones.
//   POST from an admin in the Leader Portal (Admin, Backups):
//     { action: 'list' }            the saved copies
//     { action: 'run' }             make a copy right now
//     { action: 'download', name }  a short-lived private download link
// Copies live in the private "backups" bucket. Only this server code can reach it.
import { alertAdmins, db as getDb, json, readBody } from './_email.js'

const BUCKET = 'backups'
const KEEP_DAYS = 60 // about 8 weekly copies
const KEEP_AT_LEAST = 4 // never tidy below this many, even after a long gap
const NAME = /^hisplace-backup-\d{4}-\d{2}-\d{2}-\d{4}(\d{2})?\.json$/

async function makeBackup(db) {
  const { data, error } = await db.rpc('backup_snapshot')
  if (error) throw new Error(`Could not read the data: ${error.message}`)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15) // 20261116-071530
  const name = `hisplace-backup-${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}-${stamp.slice(9, 15)}.json`
  const body = Buffer.from(JSON.stringify(data, null, 1))
  const { error: upErr } = await db.storage.from(BUCKET).upload(name, body, { contentType: 'application/json', upsert: true })
  if (upErr) throw new Error(`Could not save the copy: ${upErr.message}`)
  return { name, size: body.length, counts: data.counts }
}

async function listBackups(db) {
  const { data, error } = await db.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw new Error(error.message)
  return (data || []).filter((f) => NAME.test(f.name)).map((f) => ({ name: f.name, size: f.metadata?.size || 0, created_at: f.created_at }))
}

export async function tidy(db) {
  const all = await listBackups(db) // newest first
  const cutoff = Date.now() - KEEP_DAYS * 86400000
  const old = all.slice(KEEP_AT_LEAST).filter((f) => new Date(f.created_at).getTime() < cutoff).map((f) => f.name)
  if (old.length) await db.storage.from(BUCKET).remove(old)
  return old.length
}

// The morning email runs every day. If it ran before but not in the last 3 days, it has stopped.
export async function checkDigest(db) {
  const { data } = await db.from('email_state').select('at').eq('key', 'digest').maybeSingle()
  if (!data?.at) return null // never run yet, so nothing has stopped
  const days = (Date.now() - new Date(data.at)) / 86400000
  if (days > 3) await alertAdmins(db, 'digest-missing', 'The morning email roundup has stopped', `The daily email to members last ran ${Math.floor(days)} days ago. It should run every morning.`)
  return days
}

export default async function handler(req, res) {
  let db
  try { db = getDb() } catch (e) { return json(res, 500, { error: e.message }) }
  const auth = req.headers.authorization || ''

  // Weekly run from Vercel Cron.
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET
    if (!secret || auth !== `Bearer ${secret}`) return json(res, 401, { error: 'Not allowed.' })
    try {
      const made = await makeBackup(db)
      const removed = await tidy(db)
      await db.from('audit_log').insert({ action: 'weekly backup made', entity: 'backup', entity_id: made.name, details: { size_kb: Math.round(made.size / 1024), old_copies_removed: removed } })
      await checkDigest(db)
      return json(res, 200, { saved: made.name, removed })
    } catch (e) {
      await alertAdmins(db, 'backup', "This week's backup didn't save", `The weekly backup failed with this message: ${e.message}. You can try again from Admin, Backups with Make a backup now.`)
      return json(res, 502, { error: e.message })
    }
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' })
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return json(res, 401, { error: 'Please sign in.' })
  const { data: who } = await db.auth.getUser(token)
  if (!who?.user) return json(res, 401, { error: 'Your sign-in expired. Please sign in again.' })
  const { data: me } = await db.from('profiles').select('role, active').eq('id', who.user.id).single()
  if (!me?.active || me.role !== 'admin') return json(res, 403, { error: 'Only admins can manage backups.' })

  const body = await readBody(req)
  try {
    if (body.action === 'list') return json(res, 200, { backups: await listBackups(db) })
    if (body.action === 'run') {
      const made = await makeBackup(db)
      await db.from('audit_log').insert({ actor: who.user.id, action: 'backup made', entity: 'backup', entity_id: made.name, details: { size_kb: Math.round(made.size / 1024) } })
      return json(res, 200, { saved: made.name })
    }
    if (body.action === 'download') {
      const name = String(body.name || '')
      if (!NAME.test(name)) return json(res, 400, { error: 'That backup name isn\'t right.' })
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(name, 60, { download: name })
      if (error) return json(res, 404, { error: 'That backup couldn\'t be found.' })
      await db.from('audit_log').insert({ actor: who.user.id, action: 'backup downloaded', entity: 'backup', entity_id: name, details: {} })
      return json(res, 200, { url: data.signedUrl })
    }
    return json(res, 400, { error: 'Unknown action.' })
  } catch (e) {
    return json(res, 502, { error: e.message })
  }
}
