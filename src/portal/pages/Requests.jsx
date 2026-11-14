import { useState } from 'react'
import { supabase, TEAMS, teamLabel, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, fmtDate, fmtDateTime, useMe, usePeople, useRows } from '../ui'

const KINDS = [
  ['supplies', 'Supplies needed'],
  ['marketing', 'Flyer or marketing'],
  ['event', 'Conference or event idea'],
]
const kindLabel = (k) => KINDS.find(([v]) => v === k)?.[1] || k
const STATUS = { submitted: ['Submitted', 'neutral'], in_progress: ['In progress', 'info'], done: ['Done', 'success'], declined: ['Declined', 'danger'] }

const fieldsFor = (kind) => [
  { name: 'title', label: kind === 'supplies' ? 'What do you need?' : kind === 'marketing' ? 'What should we make?' : 'Name of the conference or event', required: true },
  {
    name: 'details', label: kind === 'supplies' ? 'Details (quantity, brand, where to buy)' : kind === 'marketing' ? 'Details (event, date, wording, where it will be used)' : 'Why it would benefit His Place, who should go, cost',
    type: 'textarea', rows: 4,
  },
  { name: 'needed_by', label: kind === 'event' ? 'Event date or deadline to register' : 'Needed by', type: 'date', half: true },
  { name: 'estimated_cost', label: 'Estimated cost ($)', type: 'number', min: 0, step: '0.01', half: true },
  { name: 'team', label: 'For which team?', type: 'select', options: TEAMS, placeholder: 'General or whole church', half: true },
  { name: 'link', label: kind === 'event' ? 'Website link' : 'Link (product page, example, or event)', type: 'url', half: true, max: 500 },
]

function Comments({ requestId }) {
  const { name } = usePeople()
  const { rows, reload } = useRows('request_comments', { order: 'created_at', ascending: true, filter: (q) => q.eq('request_id', requestId), deps: [requestId] })
  const [body, setBody] = useState('')
  const [err, setErr] = useState('')
  const add = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    const { error } = await supabase.from('request_comments').insert({ request_id: requestId, body: body.trim() })
    if (error) return setErr(friendlyError(error))
    setBody('')
    reload()
  }
  return (
    <div className="p-comments">
      {rows.map((c) => <div key={c.id} className="p-comment"><strong>{name(c.author)}</strong> <span className="p-meta">{fmtDateTime(c.created_at)}</span><p className="p-pre">{c.body}</p></div>)}
      <form className="p-comment-form" onSubmit={add}>
        <label className="sr-only" htmlFor={`c-${requestId}`}>Add a comment</label>
        <input id={`c-${requestId}`} value={body} maxLength={4000} placeholder="Add a comment or question" onChange={(e) => setBody(e.target.value)} />
        <button className="button button-secondary">Post</button>
      </form>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

function StatusControl({ r, onDone }) {
  const [status, setStatus] = useState(r.status)
  const [note, setNote] = useState(r.status_note || '')
  const [assigned, setAssigned] = useState(r.assigned_to || '')
  const { people } = usePeople()
  const [err, setErr] = useState('')
  const save = async () => {
    const { error } = await supabase.from('requests').update({ status, status_note: note, assigned_to: assigned || null }).eq('id', r.id)
    if (error) return setErr(friendlyError(error))
    onDone()
  }
  return (
    <div className="p-inline-form">
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
        {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select value={assigned} onChange={(e) => setAssigned(e.target.value)} aria-label="Assigned to">
        <option value="">Not assigned</option>
        {Object.values(people).filter((p) => p.active && p.role !== 'applicant').map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the requester (optional)" aria-label="Status note" />
      <button className="button button-primary" onClick={save}>Update</button>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export default function Requests() {
  const me = useMe()
  const { name } = usePeople()
  const [view, setView] = useState('open')
  const [kind, setKind] = useState('all')
  const [newKind, setNewKind] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState('')
  const { rows, loading, error, reload } = useRows('requests', {
    filter: (q) => {
      let x = q
      if (view === 'open') x = x.in('status', ['submitted', 'in_progress'])
      if (view === 'mine') x = x.eq('created_by', me.profile.id)
      if (kind !== 'all') x = x.eq('kind', kind)
      return x
    },
    deps: [view, kind],
  })

  const create = async (v) => {
    const { error: err } = await supabase.from('requests').insert({ ...v, kind: newKind, team: v.team || null })
    if (err) return err
    setNewKind(null)
    setMsg('Your request was submitted. A pastor or admin will follow up.')
    reload()
    return null
  }
  const remove = async (r) => {
    if (!window.confirm('Delete this request?')) return
    const { error: err } = await supabase.from('requests').delete().eq('id', r.id)
    setMsg(err ? friendlyError(err) : 'Request deleted.')
    reload()
  }

  return (
    <>
      <PageHead title="Requests" intro="Ask for supplies, request a flyer or marketing piece, or suggest a conference or event that could benefit His Place.">
        {!newKind && KINDS.map(([k, l]) => <button key={k} className="button button-primary" onClick={() => { setNewKind(k); setMsg('') }}>{l}</button>)}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {newKind && (
        <div className="p-card">
          <h2 className="p-card-title">New request: {kindLabel(newKind)}</h2>
          <Form key={newKind} fields={fieldsFor(newKind)} onSubmit={create} onCancel={() => setNewKind(null)} submitLabel="Submit request" />
        </div>
      )}
      <div className="p-toolbar">
        {[['open', 'Open'], ['mine', 'My requests'], ['all', 'All']].map(([v, l]) => <button key={v} className={`chip${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{l}</button>)}
        <select className="p-select-small" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type of request">
          <option value="all">All types</option>
          {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <Notice tone="error">{error}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>No requests here.</Empty> : (
        <div className="p-list">
          {rows.map((r) => (
            <div className="p-card" key={r.id}>
              <div className="p-item-head">
                <h3>{r.title}</h3>
                <span className="p-badges"><Badge>{kindLabel(r.kind)}</Badge><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></span>
              </div>
              <div className="p-meta">
                {name(r.created_by)} · {fmtDate(r.created_at)}
                {r.team && ` · ${teamLabel(r.team)}`}
                {r.needed_by && ` · Needed by ${fmtDate(r.needed_by)}`}
                {r.estimated_cost != null && ` · About $${Number(r.estimated_cost).toFixed(2)}`}
                {r.assigned_to && ` · Assigned to ${name(r.assigned_to)}`}
              </div>
              {r.details && <p className="p-pre">{r.details}</p>}
              {r.link && <p><a href={r.link} target="_blank" rel="noopener noreferrer">{r.link}</a></p>}
              {r.status_note && <Notice tone="info">{r.status_note}</Notice>}
              {me.isPastoral && <StatusControl r={r} onDone={reload} />}
              <div className="p-row-actions">
                <button className="p-link" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? 'Hide comments' : 'Comments'}</button>
                {(me.isAdmin || (r.created_by === me.profile.id && r.status === 'submitted')) && <button className="p-link danger" onClick={() => remove(r)}>Delete</button>}
              </div>
              {openId === r.id && <Comments requestId={r.id} />}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
