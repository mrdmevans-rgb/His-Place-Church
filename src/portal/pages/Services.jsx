import { useState } from 'react'
import { Printer, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { supabase, friendlyError, teamLabel } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, daysUntil, fmtDate, today, useMe, usePeople, useRows } from '../ui'

const KINDS = [['welcome', 'Welcome'], ['song', 'Song'], ['prayer', 'Prayer'], ['scripture', 'Scripture reading'], ['announcements', 'Announcements'], ['sermon', 'Sermon'], ['response', 'Response'], ['offering', 'Offering'], ['video', 'Video'], ['other', 'Other']]
const kindLabel = (k) => KINDS.find(([v]) => v === k)?.[1] || k

const nextSunday = () => {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return d.toISOString().slice(0, 10)
}

function Items({ service }) {
  const { rows: items, reload } = useRows('service_items', { order: 'position', ascending: true, filter: (q) => q.eq('service_id', service.id), deps: [service.id] })
  const { rows: songs } = useRows('songs', { order: 'title', ascending: true })
  const [draft, setDraft] = useState({ kind: 'song', title: '', details: '', person: '' })
  const [err, setErr] = useState('')

  const add = async (e) => {
    e.preventDefault()
    if (!draft.title.trim() && draft.kind !== 'announcements' && draft.kind !== 'offering') return setErr('Add a title.')
    const pos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 1
    const { error } = await supabase.from('service_items').insert({ ...draft, service_id: service.id, position: pos })
    if (error) return setErr(friendlyError(error))
    setDraft({ kind: draft.kind, title: '', details: '', person: '' })
    setErr('')
    reload()
  }
  const move = async (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const a = items[i], b = items[j]
    await supabase.from('service_items').update({ position: b.position }).eq('id', a.id)
    await supabase.from('service_items').update({ position: a.position }).eq('id', b.id)
    reload()
  }
  const remove = async (it) => {
    await supabase.from('service_items').delete().eq('id', it.id)
    reload()
  }
  const pickSong = (title) => {
    const s = songs.find((x) => x.title === title)
    setDraft((d) => ({ ...d, title, details: s ? [s.song_key && `Key of ${s.song_key}`, s.tempo && `${s.tempo} BPM`].filter(Boolean).join(', ') : d.details }))
  }

  return (
    <div className="p-runsheet">
      <ol className="p-runsheet-list">
        {items.map((it, i) => (
          <li key={it.id}>
            <span className="p-run-kind">{kindLabel(it.kind)}</span>
            <span className="p-run-title"><strong>{it.title}</strong>{it.details && <small>{it.details}</small>}</span>
            <span className="p-run-person">{it.person}</span>
            <span className="p-run-actions no-print">
              <button onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
              <button onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
              <button onClick={() => remove(it)} aria-label="Remove"><Trash2 size={15} /></button>
            </span>
          </li>
        ))}
      </ol>
      {items.length === 0 && <p className="p-muted">No items yet. Build the order of service below.</p>}
      <form className="p-inline-form no-print" onSubmit={add}>
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} aria-label="Type">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {draft.kind === 'song' && songs.length > 0 ? (
          <>
            <input list={`songs-${service.id}`} value={draft.title} onChange={(e) => pickSong(e.target.value)} placeholder="Song (pick from library or type)" aria-label="Song" />
            <datalist id={`songs-${service.id}`}>{songs.map((s) => <option key={s.id} value={s.title} />)}</datalist>
          </>
        ) : <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" aria-label="Title" />}
        <input value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} placeholder="Details (key, verses, notes)" aria-label="Details" />
        <input value={draft.person} onChange={(e) => setDraft({ ...draft, person: e.target.value })} placeholder="Who" aria-label="Who" />
        <button className="button button-secondary">Add</button>
      </form>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

function Team({ date }) {
  const { name } = usePeople()
  const { rows } = useRows('assignments', { order: 'team', ascending: true, filter: (q) => q.eq('serve_date', date), deps: [date] })
  if (!rows.length) return <p className="p-muted">No one is scheduled yet. Add people on the Volunteer schedule page.</p>
  return (
    <ul className="p-team-list">
      {rows.map((a) => <li key={a.id}><strong>{teamLabel(a.team)}{a.position && `, ${a.position}`}:</strong> {name(a.person_id) || 'Open'} {a.status === 'swap_requested' && <Badge tone="warn">Needs a swap</Badge>}</li>)}
    </ul>
  )
}

export default function Services() {
  const me = useMe()
  const [past, setPast] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState('')
  const { rows, loading, error, reload } = useRows('services', { order: 'service_date', ascending: !past, filter: (q) => (past ? q.lt('service_date', today()) : q.gte('service_date', today())), deps: [past] })

  const fields = [
    { name: 'service_date', label: 'Sunday', type: 'date', required: true, half: true },
    { name: 'speaker', label: 'Speaker', half: true },
    { name: 'sermon_title', label: 'Sermon title', half: true },
    { name: 'scripture', label: 'Scripture', half: true },
    { name: 'slides_due', label: 'Slides due to media team', type: 'date', half: true },
    { name: 'notes', label: 'Notes for the teams', type: 'textarea', rows: 3 },
  ]
  const save = async (v) => {
    const payload = { service_date: v.service_date, speaker: v.speaker, sermon_title: v.sermon_title, scripture: v.scripture, slides_due: v.slides_due, notes: v.notes }
    const { data, error: err } = editing
      ? await supabase.from('services').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('services').insert(payload).select().single()
    if (err) return /duplicate/.test(err.message) ? 'There is already a run sheet for that Sunday.' : err
    setAdding(false)
    setEditing(null)
    setOpenId(data.id)
    setMsg('Saved.')
    reload()
    return null
  }
  const remove = async (s) => {
    if (!window.confirm(`Delete the run sheet for ${fmtDate(s.service_date)}?`)) return
    const { error: err } = await supabase.from('services').delete().eq('id', s.id)
    setMsg(err ? friendlyError(err) : 'Deleted.')
    reload()
  }

  return (
    <>
      <PageHead title="Sunday run sheets" intro="Order of service, songs, sermon details, and who is serving, all in one place for worship, sound, media, and kids.">
        {!adding && <button className="button button-primary" onClick={() => { setAdding(true); setEditing(null); setMsg('') }}>Plan a Sunday</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {(adding || editing) && <div className="p-card"><h2 className="p-card-title">{editing ? 'Edit details' : 'Plan a Sunday'}</h2><Form fields={fields} initial={editing || { service_date: nextSunday(), speaker: 'Pastor Dave Evans' }} onSubmit={save} onCancel={() => { setAdding(false); setEditing(null) }} /></div>}
      <div className="p-toolbar no-print">
        <button className={`chip${!past ? ' active' : ''}`} onClick={() => setPast(false)}>Upcoming</button>
        <button className={`chip${past ? ' active' : ''}`} onClick={() => setPast(true)}>Past</button>
      </div>
      <Notice tone="error">{error}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>{past ? 'No past run sheets.' : 'No upcoming Sundays planned yet.'}</Empty> : (
        <div className="p-list">
          {rows.map((s) => {
            const due = daysUntil(s.slides_due)
            const open = openId === s.id || rows.length === 1
            return (
              <div className={`p-card${open ? ' p-print-area' : ''}`} key={s.id}>
                <div className="p-item-head">
                  <h3>{new Date(s.service_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                  {s.slides_due && !past && <Badge tone={due < 0 ? 'neutral' : due <= 2 ? 'warn' : 'info'}>Slides due {fmtDate(s.slides_due)}</Badge>}
                </div>
                <div className="p-meta strong">{[s.sermon_title && `"${s.sermon_title}"`, s.scripture, s.speaker].filter(Boolean).join(' · ')}</div>
                {s.notes && <p className="p-pre">{s.notes}</p>}
                {open ? (
                  <>
                    <h4 className="p-sub">Order of service</h4>
                    <Items service={s} />
                    <h4 className="p-sub">Serving this Sunday</h4>
                    <Team date={s.service_date} />
                  </>
                ) : null}
                <div className="p-row-actions no-print">
                  {rows.length > 1 && <button className="p-link" onClick={() => setOpenId(open ? null : s.id)}>{open ? 'Close' : 'Open run sheet'}</button>}
                  {open && <button className="p-link" onClick={() => window.print()}><Printer size={14} /> Print</button>}
                  <button className="p-link" onClick={() => { setEditing(s); setAdding(false) }}>Edit details</button>
                  {me.isPastoral && <button className="p-link danger" onClick={() => remove(s)}>Delete</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
