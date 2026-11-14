import { useState } from 'react'
import { supabase, ROLES, roleLabel, teamLabel, friendlyError } from '../supabase'
import { Badge, Empty, Field, Notice, PageHead, fmtDateTime, useMe, usePeople, usePortal, useRows } from '../ui'

async function callAdmin(body) {
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

const smsHref = (phone, text) => `sms:${(phone || '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(text)}`

export function ShareLink({ link, person, onClose }) {
  const [copied, setCopied] = useState(false)
  const first = (person.full_name || '').split(' ')[0]
  const text = `Hi${first ? ` ${first}` : ''}! Here is your sign-in link for the His Place Leader Portal: ${link}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { window.prompt('Copy this link:', link) }
  }
  return (
    <div className="p-card p-share">
      <h3>Send this sign-in link to {person.full_name || person.email}</h3>
      <p className="p-muted">This one-time link signs them in. It expires soon for security, so send it now. If it expires, just make a new one.</p>
      <div className="p-share-actions">
        <a className="button button-primary" href={smsHref(person.phone, text)}>Text this link</a>
        <button className="button button-secondary" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        <a className="button button-secondary" href={`mailto:${person.email}?subject=${encodeURIComponent('Your His Place Leader Portal sign-in link')}&body=${encodeURIComponent(text)}`}>Email it</a>
        <button className="p-link" onClick={onClose}>Done</button>
      </div>
      {!person.phone && <p className="p-muted">No phone number on file, so you'll pick the person in your messages app.</p>}
    </div>
  )
}

function Invite({ onDone }) {
  const [v, setV] = useState({ full_name: '', email: '', phone: '', role: 'leader', teams: [], method: 'link' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const change = (k, val) => setV((s) => ({ ...s, [k]: val }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const out = await callAdmin({ action: 'invite', email: v.email, full_name: v.full_name, phone: v.phone, role: v.role, teams: v.role === 'applicant' ? [] : v.teams, sendEmail: v.method === 'email' })
      onDone({ link: out.link, person: { full_name: v.full_name, email: v.email, phone: v.phone } })
    } catch (e2) { setErr(e2.message) }
    setBusy(false)
  }
  return (
    <form className="p-card p-form" onSubmit={submit}>
      <h2 className="p-card-title">Invite someone</h2>
      <div className="p-form-grid">
        <Field f={{ name: 'full_name', label: 'Full name', required: true, half: true }} value={v.full_name} onChange={change} />
        <Field f={{ name: 'email', label: 'Email', type: 'email', required: true, half: true }} value={v.email} onChange={change} />
        <Field f={{ name: 'phone', label: 'Mobile phone (for texting links)', type: 'tel', half: true }} value={v.phone} onChange={change} />
        <Field f={{ name: 'role', label: 'Role', type: 'select', required: true, options: ROLES, half: true }} value={v.role} onChange={change} />
        {v.role !== 'applicant' && <Field f={{ name: 'teams', label: 'Teams', type: 'teams' }} value={v.teams} onChange={change} />}
        <Field f={{ name: 'method', label: 'How should they get their sign-in link?', type: 'select', required: true, options: [['link', "Give me a link to text or copy"], ['email', 'Email the invitation for me']] }} value={v.method} onChange={change} />
      </div>
      {v.role === 'applicant' && <Notice tone="info">Carry applicants can only see and submit their own safety team application.</Notice>}
      <Notice tone="error">{err}</Notice>
      <div className="p-form-actions">
        <button className="button button-primary" disabled={busy}>{busy ? 'Inviting...' : 'Invite'}</button>
        <button type="button" className="button button-secondary" onClick={() => onDone(null)}>Cancel</button>
      </div>
    </form>
  )
}

function Person({ p, onSaved, onShare }) {
  const me = useMe()
  const [edit, setEdit] = useState(false)
  const [role, setRole] = useState(p.role)
  const [teams, setTeams] = useState(p.teams || [])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const self = p.id === me.profile.id

  const save = async () => {
    const { error } = await supabase.from('profiles').update({ role, teams: role === 'applicant' ? [] : teams }).eq('id', p.id)
    if (error) return setErr(friendlyError(error))
    setEdit(false)
    onSaved(`${p.full_name || p.email} updated.`)
  }
  const link = async () => {
    setBusy(true)
    try { const out = await callAdmin({ action: 'link', email: p.email }); onShare({ link: out.link, person: p }) } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const toggle = async () => {
    if (p.active && !window.confirm(`Turn off portal access for ${p.full_name || p.email}? They will be signed out and can't sign in. You can turn it back on later.`)) return
    setBusy(true)
    try { await callAdmin({ action: p.active ? 'remove' : 'restore', id: p.id }); onSaved(p.active ? 'Access turned off.' : 'Access turned back on.') } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div className={`p-card${p.active ? '' : ' p-inactive'}`}>
      <div className="p-item-head">
        <h3>{p.full_name || p.email}{self && ' (you)'}</h3>
        <span className="p-badges"><Badge tone={p.role === 'admin' ? 'info' : 'neutral'}>{roleLabel(p.role)}</Badge>{!p.active && <Badge tone="danger">Access off</Badge>}</span>
      </div>
      <div className="p-meta">{p.email}{p.phone && ` · ${p.phone}`}{(p.teams || []).length > 0 && ` · ${p.teams.map(teamLabel).join(', ')}`}</div>
      {edit ? (
        <div className="p-form">
          <div className="p-form-grid">
            <Field f={{ name: 'role', label: 'Role', type: 'select', required: true, options: ROLES, half: true }} value={role} onChange={(_, val) => setRole(val)} />
            {role !== 'applicant' && <Field f={{ name: 'teams', label: 'Teams', type: 'teams' }} value={teams} onChange={(_, val) => setTeams(val)} />}
          </div>
          <div className="p-form-actions"><button className="button button-primary" onClick={save}>Save</button><button className="button button-secondary" onClick={() => setEdit(false)}>Cancel</button></div>
        </div>
      ) : (
        <div className="p-row-actions">
          {p.active && <button className="p-link" disabled={busy} onClick={link}>Send sign-in link</button>}
          {!self && <button className="p-link" onClick={() => setEdit(true)}>Change role or teams</button>}
          {!self && <button className={`p-link${p.active ? ' danger' : ''}`} disabled={busy} onClick={toggle}>{p.active ? 'Turn off access' : 'Turn access back on'}</button>}
        </div>
      )}
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

function People() {
  const { reloadProfile } = usePortal()
  const { people } = usePeople()
  const [inviting, setInviting] = useState(false)
  const [share, setShare] = useState(null)
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const list = Object.values(people)
    .filter((p) => !q || `${p.full_name} ${p.email} ${p.role} ${(p.teams || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.active) - Number(a.active) || (a.full_name || a.email).localeCompare(b.full_name || b.email))
  const saved = (m) => { setMsg(m); reloadProfile() }
  return (
    <>
      <div className="p-toolbar">
        {!inviting && <button className="button button-primary" onClick={() => { setInviting(true); setMsg(''); setShare(null) }}>Invite someone</button>}
        <input className="p-search" type="search" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Notice tone="success">{msg}</Notice>
      {inviting && <Invite onDone={(r) => { setInviting(false); if (r) { reloadProfile(); if (r.link) setShare(r); else setMsg(`Invitation emailed to ${r.person.email}.`) } }} />}
      {share && <ShareLink link={share.link} person={share.person} onClose={() => setShare(null)} />}
      <div className="p-list">{list.map((p) => <Person key={p.id} p={p} onSaved={saved} onShare={(s) => { setShare(s); window.scrollTo(0, 0) }} />)}</div>
    </>
  )
}

function Bios() {
  const { rows, loading, reload } = useRows('team_bios', { order: 'sort_order', ascending: true })
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState({})
  const photo = (p) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)
  const set = async (b, patch, m) => {
    const { error } = await supabase.from('team_bios').update(patch).eq('profile_id', b.profile_id)
    setMsg(error ? friendlyError(error) : m)
    reload()
  }
  return (
    <>
      <p className="p-muted">Bios appear on the public Meet the Team page only after you approve them. Any change a leader makes comes back here for approval.</p>
      <Notice tone="success">{msg}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>No bios yet. Leaders add theirs under My account.</Empty> : (
        <div className="p-list">
          {rows.map((b) => (
            <div className="p-card p-bio-review" key={b.profile_id}>
              {photo(b.photo_path) ? <img src={photo(b.photo_path)} alt="" /> : <div className="p-bio-nophoto">No photo</div>}
              <div>
                <div className="p-item-head"><h3>{b.display_name}</h3><Badge tone={b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warn' : 'neutral'}>{b.status === 'approved' ? 'On the website' : b.status === 'pending' ? 'Waiting for approval' : 'Hidden'}</Badge></div>
                {b.title && <div className="p-meta strong">{b.title}</div>}
                <p className="p-pre">{b.bio}</p>
                <div className="p-inline-form">
                  <label>Order on page <input type="number" style={{ width: 80 }} defaultValue={b.sort_order} onBlur={(e) => Number(e.target.value) !== b.sort_order && set(b, { sort_order: Number(e.target.value) }, 'Order saved.')} /></label>
                  <input placeholder="Note to the leader (optional)" value={notes[b.profile_id] ?? b.review_note} onChange={(e) => setNotes({ ...notes, [b.profile_id]: e.target.value })} aria-label="Note" />
                </div>
                <div className="p-row-actions">
                  {b.status !== 'approved' && <button className="button button-primary" onClick={() => set(b, { status: 'approved', review_note: notes[b.profile_id] ?? '' }, `${b.display_name} is now on the website.`)}>Approve for website</button>}
                  {b.status !== 'hidden' && <button className="button button-secondary" onClick={() => set(b, { status: 'hidden', review_note: notes[b.profile_id] ?? b.review_note }, `${b.display_name} is hidden from the website.`)}>{b.status === 'approved' ? 'Remove from website' : "Don't approve"}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Activity() {
  const { name } = usePeople()
  const { rows, loading } = useRows('audit_log', { order: 'at', filter: (q) => q.limit(200) })
  return loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>No activity yet.</Empty> : (
    <div className="p-table-wrap">
      <table className="p-table">
        <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{fmtDateTime(r.at)}</td>
              <td>{name(r.actor) || 'System'}</td>
              <td>{r.action}</td>
              <td className="p-small">{Object.entries(r.details || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('people')
  return (
    <>
      <PageHead title="Admin" intro="Invite people, set roles and teams, approve website bios, and review activity." />
      <div className="p-toolbar">
        {[['people', 'People'], ['bios', 'Website bios'], ['activity', 'Activity log']].map(([v, l]) => <button key={v} className={`chip${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      {tab === 'people' && <People />}
      {tab === 'bios' && <Bios />}
      {tab === 'activity' && <Activity />}
    </>
  )
}

