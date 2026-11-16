import { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, ChevronsUp } from 'lucide-react'
import { supabase, ROLES, roleLabel, teamLabel, friendlyError, callAdmin, callBackup, isLoginId, loginIdOf, contactLabel, pendingJoinCount } from '../supabase'
import { squareJpeg } from './Account'
import { Badge, Empty, Field, Notice, PageHead, fmtDateTime, useMe, usePeople, usePortal, useRows } from '../ui'

const smsHref = (phone, text) => `sms:${(phone || '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(text)}`

export function ShareLink({ link, person, onClose }) {
  const [copied, setCopied] = useState(false)
  const first = (person.full_name || '').split(' ')[0]
  const loginId = person.loginId || loginIdOf(person.email)
  const text = `Hi${first ? ` ${first}` : ''}! Here is your sign-in link for the His Place Community Church portal: ${link}`
    + (loginId ? ` Your login ID is ${loginId}. After you sign in, go to My account to set a password.` : '')
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { window.prompt('Copy this link:', link) }
  }
  return (
    <div className="p-card p-share">
      <h3>Send this sign-in link to {person.full_name || person.email}</h3>
      <p className="p-muted">This one-time link signs them in. It expires in 24 hours, so send it now. If it expires, just make a new one.</p>
      {loginId && <Notice tone="info">No email on file. Their login ID is <strong>{loginId}</strong>. It's included in the text. After signing in they should set a password under My account, and they can add an email there anytime.</Notice>}
      <div className="p-share-actions">
        <a className="button button-primary" href={smsHref(person.phone, text)}>Text this link</a>
        <button className="button button-secondary" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        {!loginId && <a className="button button-secondary" href={`mailto:${person.email}?subject=${encodeURIComponent('Your His Place portal sign-in link')}&body=${encodeURIComponent(text)}`}>Email it</a>}
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
      const out = await callAdmin({ action: 'invite', email: v.email, full_name: v.full_name, phone: v.phone, role: v.role, teams: v.role === 'applicant' ? [] : v.teams, sendEmail: !!v.email && v.method === 'email' })
      onDone({ link: out.link, person: { full_name: v.full_name, email: v.email, phone: v.phone, loginId: out.loginId } })
    } catch (e2) { setErr(e2.message) }
    setBusy(false)
  }
  return (
    <form className="p-card p-form" onSubmit={submit}>
      <h2 className="p-card-title">Invite someone</h2>
      <div className="p-form-grid">
        <Field f={{ name: 'full_name', label: 'Full name', required: true, half: true }} value={v.full_name} onChange={change} />
        <Field f={{ name: 'email', label: 'Email (optional)', type: 'email', half: true, help: "No email? Leave it blank. They'll get a login ID, and can add an email later." }} value={v.email} onChange={change} />
        <Field f={{ name: 'phone', label: 'Mobile phone (for texting links)', type: 'tel', half: true }} value={v.phone} onChange={change} />
        <Field f={{ name: 'role', label: 'Role', type: 'select', required: true, options: ROLES, half: true }} value={v.role} onChange={change} />
        {v.role !== 'applicant' && <Field f={{ name: 'teams', label: 'Teams', type: 'teams' }} value={v.teams} onChange={change} />}
        {v.email && <Field f={{ name: 'method', label: 'How should they get their sign-in link?', type: 'select', required: true, options: [['link', "Give me a link to text or copy"], ['email', 'Email the invitation for me']] }} value={v.method} onChange={change} />}
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
  const setEmail = async () => {
    const current = isLoginId(p.email) ? '' : p.email
    const next = window.prompt(`Email for ${p.full_name || 'this person'}:`, current)
    if (next === null || next.trim() === current) return
    setBusy(true)
    try { await callAdmin({ action: 'set-email', id: p.id, email: next }); onSaved(`Email saved. ${p.full_name || 'They'} now sign in with ${next.trim().toLowerCase()}.`) } catch (e) { setErr(e.message) }
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
      <div className="p-meta">{contactLabel(p.email)}{p.phone && ` · ${p.phone}`}{(p.teams || []).length > 0 && ` · ${p.teams.map(teamLabel).join(', ')}`}</div>
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
          <button className="p-link" disabled={busy} onClick={setEmail}>{isLoginId(p.email) ? 'Add email' : 'Change email'}</button>
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

function BioEdit({ b, onDone }) {
  const me = useMe()
  const [v, setV] = useState({ display_name: b.display_name, title: b.title, bio: b.bio })
  const [photoPath, setPhotoPath] = useState(b.photo_path)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const change = (k, val) => setV((s) => ({ ...s, [k]: val }))
  const url = photoPath ? supabase.storage.from('team-photos').getPublicUrl(photoPath).data.publicUrl : null
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const blob = await squareJpeg(file)
      const path = `${me.profile.id}/${b.profile_id}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('team-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      setPhotoPath(path)
    } catch (e) { setErr(friendlyError(e)) }
    setBusy(false)
  }
  const save = async () => {
    if (!v.display_name.trim()) return setErr('Name is required.')
    setBusy(true)
    const { error } = await supabase.from('team_bios').update({ display_name: v.display_name.trim(), title: v.title, bio: v.bio, photo_path: photoPath }).eq('profile_id', b.profile_id)
    if (!error && b.photo_path && photoPath !== b.photo_path) await supabase.storage.from('team-photos').remove([b.photo_path])
    setBusy(false)
    if (error) return setErr(friendlyError(error))
    onDone(`${v.display_name} saved.${b.status === 'approved' ? ' The website shows your changes now.' : ''}`)
  }
  return (
    <div className="p-bio-edit">
      <div className="p-bio-photo">
        {url ? <img src={url} alt="" /> : <div className="p-bio-nophoto">No photo</div>}
        <label className="button button-secondary">{busy ? 'Working...' : url ? 'Replace photo' : 'Add photo'}
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
        </label>
      </div>
      <div className="p-form">
        <div className="p-form-grid">
          <Field f={{ name: 'display_name', label: 'Name', required: true, half: true, max: 120 }} value={v.display_name} onChange={change} />
          <Field f={{ name: 'title', label: 'Role or title', half: true, max: 120 }} value={v.title} onChange={change} />
          <Field f={{ name: 'bio', label: 'Bio', type: 'textarea', rows: 8, max: 3000 }} value={v.bio} onChange={change} />
        </div>
        {b.status === 'approved' && <Notice tone="info">This bio is on the website. Your changes go live as soon as you save.</Notice>}
        <Notice tone="error">{err}</Notice>
        <div className="p-form-actions">
          <button className="button button-primary" disabled={busy} onClick={save}>Save changes</button>
          <button className="button button-secondary" onClick={() => onDone('')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const SECTION_IDEAS = ['Pastors', 'Elders', 'Ministry Leaders', 'Worship Team', 'Production Team', "Children's Ministry", 'Safety Team', 'Outreach']

function Bios() {
  const { rows: raw, loading, reload } = useRows('team_bios', { order: 'sort_order', ascending: true })
  const rows = [...raw].sort((a, b) => a.sort_order - b.sort_order || a.display_name.localeCompare(b.display_name))
  const [moving, setMoving] = useState(false)
  // Renumber everyone 10, 20, 30... in the new order, saving only what changed.
  const reorder = async (from, to) => {
    if (to < 0 || to >= rows.length || from === to) return
    setMoving(true)
    const list = [...rows]
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    const changes = list.map((b, i) => [b, (i + 1) * 10]).filter(([b, n]) => b.sort_order !== n)
    for (const [b, n] of changes) {
      const { error } = await supabase.from('team_bios').update({ sort_order: n }).eq('profile_id', b.profile_id)
      if (error) { setMsg(friendlyError(error)); break }
    }
    setMoving(false)
    setMsg(`${item.display_name} moved.`)
    reload()
  }
  const setSection = async (b, section) => {
    if ((section || '') === b.section) return
    const { error } = await supabase.from('team_bios').update({ section: section.trim().slice(0, 60) }).eq('profile_id', b.profile_id)
    setMsg(error ? friendlyError(error) : section.trim() ? `${b.display_name} is now under ${section.trim()}.` : `${b.display_name} removed from a section.`)
    reload()
  }
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState({})
  const [editing, setEditing] = useState(null)
  const photo = (p) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)
  const set = async (b, patch, m) => {
    const { error } = await supabase.from('team_bios').update(patch).eq('profile_id', b.profile_id)
    setMsg(error ? friendlyError(error) : m)
    reload()
  }
  return (
    <>
      <p className="p-muted">Bios appear on the public Meet the Team page only after you approve them, in the order shown here. Use the arrows to move people, and sections to group them under headings like Pastors or Worship Team. You can edit any bio to fix spelling or grammar.</p>
      <p><a href="/team" target="_blank" rel="noopener noreferrer">Preview the Meet the Team page</a></p>
      <datalist id="bio-sections">{[...new Set([...SECTION_IDEAS, ...rows.map((b) => b.section).filter(Boolean)])].map((x) => <option key={x} value={x} />)}</datalist>
      <Notice tone="success">{msg}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>No bios yet. Leaders add theirs under My account.</Empty> : (
        <div className="p-list">
          {rows.map((b, i) => (
            <div className="p-card p-bio-row" key={b.profile_id}>
              {editing !== b.profile_id && (
                <div className="p-order" aria-label={`Position ${i + 1} of ${rows.length}`}>
                  <span className="p-order-num">{i + 1}</span>
                  <button disabled={moving || i === 0} onClick={() => reorder(i, i - 1)} aria-label={`Move ${b.display_name} up`} title="Move up"><ArrowUp size={16} /></button>
                  <button disabled={moving || i === rows.length - 1} onClick={() => reorder(i, i + 1)} aria-label={`Move ${b.display_name} down`} title="Move down"><ArrowDown size={16} /></button>
                  <button disabled={moving || i === 0} onClick={() => reorder(i, 0)} aria-label={`Move ${b.display_name} to the top`} title="Move to top"><ChevronsUp size={16} /></button>
                </div>
              )}
              {editing === b.profile_id ? (
                <>
                  <h3 className="p-card-title">Edit {b.display_name}</h3>
                  <BioEdit b={b} onDone={(m) => { setEditing(null); if (m) { setMsg(m); reload() } }} />
                </>
              ) : (
                <div className="p-bio-review">
                  {photo(b.photo_path) ? <img src={photo(b.photo_path)} alt="" /> : <div className="p-bio-nophoto">No photo</div>}
                  <div>
                    <div className="p-item-head"><h3>{b.display_name}</h3><Badge tone={b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warn' : 'neutral'}>{b.status === 'approved' ? 'On the website' : b.status === 'pending' ? 'Waiting for approval' : 'Hidden'}</Badge></div>
                    {b.title && <div className="p-meta strong">{b.title}</div>}
                    {b.section && <div className="p-meta">Section: <strong>{b.section}</strong></div>}
                    <p className="p-pre">{b.bio}</p>
                    <div className="p-inline-form">
                      <label>Section <input list="bio-sections" key={b.section} defaultValue={b.section} placeholder="None" style={{ width: 190 }} onBlur={(e) => setSection(b, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={`Section for ${b.display_name}`} /></label>
                      <input placeholder="Note to the leader (optional)" value={notes[b.profile_id] ?? b.review_note} onChange={(e) => setNotes({ ...notes, [b.profile_id]: e.target.value })} aria-label="Note" />
                    </div>
                    <div className="p-row-actions">
                      <button className="button button-secondary" onClick={() => { setEditing(b.profile_id); setMsg('') }}>Edit</button>
                      {b.status !== 'approved' && <button className="button button-primary" onClick={() => set(b, { status: 'approved', review_note: notes[b.profile_id] ?? '' }, `${b.display_name} is now on the website.`)}>Approve for website</button>}
                      {b.status !== 'hidden' && <button className="button button-secondary" onClick={() => set(b, { status: 'hidden', review_note: notes[b.profile_id] ?? b.review_note }, `${b.display_name} is hidden from the website.`)}>{b.status === 'approved' ? 'Remove from website' : "Don't approve"}</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function JoinRequests() {
  const { reloadProfile } = usePortal()
  const [view, setView] = useState('pending')
  const { rows, reload } = useRows('membership_requests', { filter: (q) => q.eq('status', view), deps: [view] })
  const [share, setShare] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(null)
  const approve = async (r) => {
    setBusy(r.id); setMsg('')
    try {
      const out = await callAdmin({ action: 'invite', full_name: r.full_name, email: r.email, phone: r.phone, role: 'member', teams: [], sendEmail: false })
      await supabase.from('membership_requests').update({ status: 'approved' }).eq('id', r.id)
      setShare({ link: out.link, person: { full_name: r.full_name, email: r.email, phone: r.phone, loginId: out.loginId } })
      reloadProfile(); reload()
    } catch (e) { setMsg(e.message) }
    setBusy(null)
  }
  const decline = async (r) => {
    if (!window.confirm(`Decline ${r.full_name}'s request?`)) return
    await supabase.from('membership_requests').update({ status: 'declined' }).eq('id', r.id)
    reload()
  }
  return (
    <>
      <p className="p-muted">People who asked for member access on the website. Approving creates their member account and gives you a sign-in link to text them.</p>
      <div className="p-toolbar">{[['pending', 'Waiting'], ['approved', 'Approved'], ['declined', 'Declined']].map(([v, l]) => <button key={v} className={`chip${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{l}</button>)}</div>
      <Notice tone="error">{msg}</Notice>
      {share && <ShareLink link={share.link} person={share.person} onClose={() => setShare(null)} />}
      {rows.length === 0 ? <Empty>{view === 'pending' ? 'No requests waiting.' : 'None.'}</Empty> : (
        <div className="p-list">{rows.map((r) => (
          <div className="p-card" key={r.id}>
            <div className="p-item-head"><h3>{r.full_name}</h3><span className="p-meta">{fmtDateTime(r.created_at)}</span></div>
            <div className="p-meta">{[r.email, r.phone].filter(Boolean).join(' · ')}</div>
            {r.message && <p className="p-pre">{r.message}</p>}
            {view === 'pending' && (
              <div className="p-row-actions">
                <button className="button button-primary" disabled={busy === r.id} onClick={() => approve(r)}>{busy === r.id ? 'Approving...' : 'Approve and invite'}</button>
                <button className="button button-secondary" onClick={() => decline(r)}>Decline</button>
              </div>
            )}
          </div>
        ))}</div>
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

function Backups() {
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState({ tone: 'info', text: '' })
  const load = () => callBackup({ action: 'list' }).then((r) => setList(r.backups)).catch((e) => { setList([]); setMsg({ tone: 'error', text: e.message }) })
  useEffect(() => { load() }, [])
  const runNow = async () => {
    setBusy('run'); setMsg({ tone: 'info', text: '' })
    try { await callBackup({ action: 'run' }); setMsg({ tone: 'success', text: 'Backup saved.' }); await load() } catch (e) { setMsg({ tone: 'error', text: e.message }) }
    setBusy('')
  }
  const download = async (name) => {
    setBusy(name)
    try { const { url } = await callBackup({ action: 'download', name }); window.location.href = url } catch (e) { setMsg({ tone: 'error', text: e.message }) }
    setBusy('')
  }
  return (
    <div className="stack-md">
      <div className="p-card">
        <h2 className="p-card-title">Weekly backups</h2>
        <p>Early every Monday morning, the portal saves a copy of everything members and leaders have entered: people, prayer requests, questions, studies, the calendar, and more. Copies are kept for about two months. Passwords aren't included, so after a restore people would reset theirs.</p>
        <p className="p-muted">Keep any copy you download somewhere safe. It holds private information like prayer requests and phone numbers.</p>
        <button className="button button-primary" onClick={runNow} disabled={!!busy}>{busy === 'run' ? 'Saving...' : 'Make a backup now'}</button>
      </div>
      {msg.text && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {list === null ? <p className="p-muted">Loading...</p> : list.length === 0 ? <Empty>No backups yet. The first one is made next Monday, or tap Make a backup now.</Empty> : (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead><tr><th>Saved</th><th>Size</th><th><span className="sr-only">Download</span></th></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.name}>
                  <td>{fmtDateTime(b.created_at)}</td>
                  <td>{b.size >= 1048576 ? `${(b.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b.size / 1024))} KB`}</td>
                  <td><button className="link-button" onClick={() => download(b.name)} disabled={!!busy}>{busy === b.name ? 'Getting it...' : 'Download'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'people')
  const [joinWaiting, setJoinWaiting] = useState(0)
  useEffect(() => { pendingJoinCount().then(setJoinWaiting) }, [tab])
  return (
    <>
      <PageHead title="Admin" intro="Invite people, set roles and teams, approve website bios, review activity, and download backups." />
      <div className="p-toolbar">
        {[['people', 'People'], ['join', joinWaiting > 0 ? `Requests to join (${joinWaiting})` : 'Requests to join'], ['bios', 'Website bios'], ['activity', 'Activity log'], ['backups', 'Backups']].map(([v, l]) => <button key={v} className={`chip${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      {tab === 'people' && <People />}
      {tab === 'join' && <JoinRequests />}
      {tab === 'bios' && <Bios />}
      {tab === 'activity' && <Activity />}
      {tab === 'backups' && <Backups />}
    </>
  )
}

