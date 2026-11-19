import { useEffect, useState } from 'react'
import { Mail, MessageSquare, Phone } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, fmtDate, fmtDateTime, localISO, today, useMe, usePeople } from '../ui'
import { CHURCH_ADDRESS, SERVICE_HOUR } from '../../churchInfo'

// Visitors from Plan Your Visit (and walk-ins leaders add), with a simple follow-up path:
// welcome before Sunday, did they come, thank-you note, lunch invite, connected.
const first = (n) => (n || '').trim().split(/\s+/)[0]
const longDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const street = CHURCH_ADDRESS.split(',')[0]
const smsLink = (phone, text) => `sms:${phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(text)}`
const mailLink = (email, subject, text) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`

const MESSAGES = {
  welcome: (v, me) => ({
    subject: 'Looking forward to meeting you',
    text: `Hi ${first(v.full_name)}! This is ${me} from His Place Community Church. We're so glad you're planning to visit${v.visit_date ? ` on ${longDay(v.visit_date)}` : ''}. We meet at ${SERVICE_HOUR} at ${street}, and someone will be at the door to welcome you. Is there anything we can do to help you feel at home?`,
  }),
  thanks: (v, me) => ({
    subject: 'Thank you for visiting His Place',
    text: `Hi ${first(v.full_name)}, this is ${me} from His Place. Thank you for worshiping with us! It was great to have you. If you have any questions, or anything we can pray about, I'd love to hear from you.`,
  }),
  lunch: (v, me) => ({
    subject: 'Lunch after church?',
    text: `Hi ${first(v.full_name)}, it's ${me} from His Place. We'd love to get to know you better. Would you like to join us for lunch after church one Sunday soon?`,
  }),
}

function Reach({ v, kind, me }) {
  const m = MESSAGES[kind](v, me)
  return (
    <span className="v-reach">
      {v.phone && <a className="button button-secondary v-btn" href={smsLink(v.phone, m.text)}><MessageSquare size={14} aria-hidden="true" /> Text</a>}
      {v.email && <a className="button button-secondary v-btn" href={mailLink(v.email, m.subject, m.text)}><Mail size={14} aria-hidden="true" /> Email</a>}
      <button type="button" className="p-link subtle" onClick={() => navigator.clipboard?.writeText(m.text)}>Copy the message</button>
    </span>
  )
}

function Step({ done, label, children, onToggle }) {
  // Shows the check right away while it saves.
  const [shown, setShown] = useState(done)
  useEffect(() => { setShown(done) }, [done])
  const toggle = (on) => { setShown(on ? new Date().toISOString() : null); onToggle(on) }
  return (
    <li className={`v-step${shown ? ' done' : ''}`}>
      <label className="p-check"><input type="checkbox" checked={!!shown} onChange={(e) => toggle(e.target.checked)} /><span>{label}{shown && <small>Done {fmtDate(shown)}</small>}</span></label>
      {!shown && children}
    </li>
  )
}

function VisitorCard({ v, leaders, onSaved }) {
  const me = useMe()
  const { name } = usePeople()
  const [notes, setNotes] = useState(v.leader_notes)
  const [err, setErr] = useState('')
  const myName = first(me.profile.full_name) || 'a friend'
  const save = async (patch) => {
    const { error } = await supabase.from('visitors').update(patch).eq('id', v.id)
    if (error) setErr(friendlyError(error)); else { setErr(''); onSaved() }
  }
  const stamp = (k) => (on) => save({ [k]: on ? new Date().toISOString() : null })
  const past = v.visit_date && v.visit_date < today()
  return (
    <div className={`p-card v-card v-${v.status}`}>
      <div className="p-item-head">
        <h3>{v.full_name}</h3>
        <span className="p-badges">
          {v.status === 'came' && <Badge tone="success">Came</Badge>}
          {v.status === 'no_show' && <Badge tone="warn">Didn't make it</Badge>}
          {v.status === 'connected' && <Badge tone="success">Connected</Badge>}
          {v.status === 'closed' && <Badge>Closed</Badge>}
          {v.source === 'leader' && <Badge>Added by a leader</Badge>}
        </span>
      </div>
      <div className="p-meta strong">{v.visit_date ? `${v.status === 'came' ? 'Visited' : past ? 'Planned for' : 'Coming'} ${longDay(v.visit_date)}` : 'Not sure which Sunday yet'} · {v.adults} adult{v.adults === 1 ? '' : 's'}{v.kids ? ` · Kids: ${v.kids}` : ''}</div>
      <div className="v-contact">
        {v.phone && <a href={`tel:${v.phone.replace(/[^\d+]/g, '')}`}><Phone size={13} aria-hidden="true" /> {v.phone}</a>}
        {v.email && <a href={`mailto:${v.email}`}><Mail size={13} aria-hidden="true" /> {v.email}</a>}
      </div>
      {v.notes && <p className="p-pre v-notes">"{v.notes}"</p>}
      <div className="p-meta">Signed up {fmtDateTime(v.created_at)}{v.created_by ? ` · added by ${name(v.created_by)}` : ''}</div>

      <ol className="v-steps">
        <Step done={v.welcomed_at} label="Send a welcome before Sunday" onToggle={stamp('welcomed_at')}><Reach v={v} kind="welcome" me={myName} /></Step>
        <li className="v-step">
          <span className="v-step-label">On Sunday:</span>
          <span className="v-reach">
            <button type="button" className={`chip${v.status === 'came' ? ' active' : ''}`} onClick={() => save({ status: v.status === 'came' ? 'new' : 'came' })}>They came</button>
            <button type="button" className={`chip${v.status === 'no_show' ? ' active' : ''}`} onClick={() => save({ status: v.status === 'no_show' ? 'new' : 'no_show' })}>Didn't make it</button>
          </span>
        </li>
        <Step done={v.thanked_at} label="Send a thank-you after their visit" onToggle={stamp('thanked_at')}><Reach v={v} kind="thanks" me={myName} /></Step>
        <Step done={v.lunch_at} label="Invite them to lunch" onToggle={stamp('lunch_at')}><Reach v={v} kind="lunch" me={myName} /></Step>
      </ol>

      <div className="p-form-grid v-follow">
        <div className="p-field half">
          <label htmlFor={`fu-${v.id}`}>Who is following up?</label>
          <select id={`fu-${v.id}`} value={v.followup_by || ''} onChange={(e) => save({ followup_by: e.target.value || null })}>
            <option value="">Nobody yet</option>
            {leaders.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}{p.id === me.profile.id ? ' (you)' : ''}</option>)}
          </select>
        </div>
        <div className="p-field">
          <label htmlFor={`n-${v.id}`}>Notes for leaders</label>
          <textarea id={`n-${v.id}`} rows={2} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== v.leader_notes && save({ leader_notes: notes })} placeholder="Who they sat with, prayer needs, what they're looking for in a church" />
        </div>
      </div>
      <div className="p-row-actions">
        {v.status !== 'connected' && <button className="p-link" onClick={() => save({ status: 'connected' })}>They're connected</button>}
        {v.status !== 'closed' && <button className="p-link subtle" onClick={() => save({ status: 'closed' })}>Close (no more follow-up)</button>}
        {['connected', 'closed'].includes(v.status) && <button className="p-link subtle" onClick={() => save({ status: 'new' })}>Reopen</button>}
        {me.isPastoral && <button className="p-link danger" onClick={async () => { if (window.confirm(`Delete ${v.full_name} from the visitor list?`)) { await supabase.from('visitors').delete().eq('id', v.id); onSaved() } }}>Delete</button>}
      </div>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export default function Visitors() {
  const { people } = usePeople()
  const [rows, setRows] = useState(null)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const load = () => supabase.from('visitors').select('*').order('visit_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  useEffect(() => { load() }, [])
  const leaders = Object.values(people).filter((p) => p.active && ['admin', 'pastor', 'leader'].includes(p.role)).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  if (!rows) return <p className="p-muted">Loading...</p>
  const t = today()
  const open = rows.filter((v) => !['connected', 'closed'].includes(v.status))
  const coming = open.filter((v) => v.status === 'new' && (!v.visit_date || v.visit_date >= t))
  const followUp = open.filter((v) => !coming.includes(v))
  const done = rows.filter((v) => ['connected', 'closed'].includes(v.status))
  const add = async (v) => {
    const { error } = await supabase.from('visitors').insert({
      full_name: v.full_name, phone: v.phone || '', email: v.email || '', visit_date: v.visit_date || null,
      adults: Number(v.adults) || 1, kids: v.kids || '', notes: v.notes || '', source: 'leader', status: v.visit_date && v.visit_date <= t ? 'came' : 'new',
    })
    if (error) return /visitors_contact/.test(error.message) ? 'Please add a phone number or email.' : error
    setAdding(false); setMsg(`${v.full_name} added.`); load(); return null
  }
  const list = (items) => <div className="p-list">{items.map((v) => <VisitorCard key={v.id} v={v} leaders={leaders} onSaved={load} />)}</div>
  return (
    <>
      <PageHead title="Visitors" intro="People who told us they're coming through Plan Your Visit, plus first-time guests you add. Follow up so nobody falls through the cracks.">
        {!adding && <button className="button button-primary" onClick={() => { setAdding(true); setMsg('') }}>Add a visitor</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {adding && (
        <div className="p-card">
          <h2 className="p-card-title">Add a first-time guest</h2>
          <Form fields={[
            { name: 'full_name', label: 'Name', required: true, half: true, max: 120 },
            { name: 'visit_date', label: 'Visit date', type: 'date', default: localISO(), half: true },
            { name: 'phone', label: 'Phone', type: 'tel', half: true },
            { name: 'email', label: 'Email', type: 'email', half: true },
            { name: 'adults', label: 'Adults', type: 'number', default: 1, half: true },
            { name: 'kids', label: 'Kids and ages', half: true, max: 200 },
            { name: 'notes', label: 'Anything to remember', type: 'textarea', rows: 2, max: 1000 },
          ]} onSubmit={add} onCancel={() => setAdding(false)} submitLabel="Add" />
        </div>
      )}
      <h2 className="p-sub">Coming up ({coming.length})</h2>
      {coming.length ? list(coming) : <Empty>Nobody has signed up for an upcoming Sunday yet.</Empty>}
      <h2 className="p-sub">Follow up ({followUp.length})</h2>
      {followUp.length ? list(followUp) : <Empty>Everyone who visited has been followed up with.</Empty>}
      {done.length > 0 && <details className="m-older"><summary>Connected and closed ({done.length})</summary>{list(done)}</details>}
    </>
  )
}
