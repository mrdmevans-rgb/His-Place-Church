// Shared helpers for church emails. Files starting with _ are not public endpoints on Vercel.
import { createClient } from '@supabase/supabase-js'

export const LOGIN_DOMAIN = 'login.hpcchurch.church'
export const MEMBER_ROLES = ['admin', 'pastor', 'leader', 'member']
export const site = () => (process.env.SITE_URL || 'https://www.hpcchurch.church').replace(/\/$/, '')
export const fromAddress = () => process.env.NOTIFY_FROM || 'His Place Portal <portal@hpcchurch.church>'
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export const realEmail = (e) => !!e && !e.endsWith('@' + LOGIN_DOMAIN)

export function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

export function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server is missing Supabase settings.')
  return createClient(url, key, { auth: { persistSession: false } })
}

// Wrap content in a simple, church-branded email. footer is plain HTML.
export function layout(title, bodyHtml, footerHtml = '') {
  return `<div style="background:#EDE6D9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#2B2420">
  <div style="max-width:560px;margin:0 auto;background:#F8F4EC;border:1px solid #D4C9B2;border-radius:12px;padding:24px">
    <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#7A2E2E;margin-bottom:6px">His Place Community Church</div>
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px">${esc(title)}</h1>
    ${bodyHtml}
  </div>
  <div style="max-width:560px;margin:12px auto 0;font-size:12px;color:#8C8171;text-align:center;line-height:1.5">${footerHtml}</div>
</div>`
}

export const button = (href, label) => `<p style="margin:18px 0"><a href="${esc(href)}" style="display:inline-block;background:#7A2E2E;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`

export function unsubscribeLinks(token) {
  const unsub = `${site()}/api/unsubscribe?t=${encodeURIComponent(token)}`
  const settings = `${site()}/portal/account#email-updates`
  return {
    unsub,
    footer: `You're getting this because you chose email updates in the His Place member portal.<br><a href="${settings}" style="color:#7A2E2E">Change which emails you get</a> &nbsp;or&nbsp; <a href="${unsub}" style="color:#7A2E2E">unsubscribe from all</a>.`,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}

// Send one or more emails through Resend. Uses the batch endpoint in groups of 100.
export async function sendEmails(messages) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: 0, skipped: 'Email is not set up yet.' }
  let sent = 0
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100).map((m) => ({ from: fromAddress(), ...m }))
    const r = await fetch(batch.length === 1 ? 'https://api.resend.com/emails' : 'https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.length === 1 ? batch[0] : batch),
    })
    if (!r.ok) throw new Error(`Email service said ${r.status}: ${(await r.text()).slice(0, 200)}`)
    sent += batch.length
  }
  return { sent }
}
