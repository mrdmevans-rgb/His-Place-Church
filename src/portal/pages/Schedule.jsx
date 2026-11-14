import { useMemo, useState } from 'react'
import { supabase, TEAMS, teamLabel, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, today, useMe, usePeople, useRows } from '../ui'

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function sundaysOf(year, month) {
  const out = []
  const d = new Date(year, month, 1, 12)
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  while (d.getMonth() === month) { out.push(ymd(d)); d.setDate(d.getDate() + 7) }
  return out
}
const STATUS = { scheduled: ['Scheduled', 'neutral'], confirmed: ['Confirmed', 'success'], swap_requested: ['Needs a swap', 'warn'] }

function MyBlackouts() {
  const me = useMe()
  const { rows, reload } = useRows('blackouts', { order: 'date_from', ascending: true, filter: (q) => q.eq('user_id', me.profile.id).gte('date_to', today()) })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const add = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('blackouts').insert({ date_from: from, date_to: to || from, note })
    if (error) return setErr(friendlyError(error))
    setFrom(''); setTo(''); setNote(''); setErr('')
    reload()
  }
  return (
    <div className="p-card">
      <h2 className="p-card-title">My unavailable dates</h2>
      <p className="p-muted">Let your team leader know when you're away so they don't schedule you.</p>
      {rows.length > 0 && <ul className="p-team-list">{rows.map((b) => <li key={b.id}>{fmtDate(b.date_from)}{b.date_to !== b.date_from && ` to ${fmtDate(b.date_to)}`}{b.note && ` · ${b.note}`} <button className="p-link danger" onClick={async () => { await supabase.from('blackouts').delete().eq('id', b.id); reload() }}>Remove</button></li>)}</ul>}
      <form className="p-inline-form" onSubmit={add}>
        <label>From <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
        <button className="button button-secondary">Add</button>
      </form>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export default function Schedule() {
  const me = useMe()
  const { name, people } = usePeople()
  const now = new Date()
  const [ym, setYm] = useState([now.getFullYear(), now.getMonth()])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const manageable = TEAMS.filter(([t]) => me.isPastoral || me.onTeam(t))
  const [draft, setDraft] = useState({ serve_date: '', team: manageable[0]?.[0] || '', position: '', person_id: '' })
  const first = ymd(new Date(ym[0], ym[1], 1, 12))
  const last = ymd(new Date(ym[0], ym[1] + 1, 0, 12))
  const { rows, reload } = useRows('assignments', { order: 'serve_date', ascending: true, filter: (q) => q.gte('serve_date', first).lte('serve_date', last), deps: [first] })
  const { rows: blackouts } = useRows('blackouts', { order: 'date_from', filter: (q) => q.lte('date_from', last).gte('date_to', first), deps: [first] })
  const { rows: mine, reload: reloadMine } = useRows('assignments', { order: 'serve_date', ascending: true, filter: (q) => q.eq('person_id', me.profile.id).gte('serve_date', today()) })

  const dates = useMemo(() => [...new Set([...sundaysOf(ym[0], ym[1]), ...rows.map((r) => r.serve_date)])].sort(), [ym, rows])
  const away = (pid, date) => blackouts.find((b) => b.user_id === pid && b.date_from <= date && b.date_to >= date)
  const shift = (n) => { const d = new Date(ym[0], ym[1] + n, 1); setYm([d.getFullYear(), d.getMonth()]) }

  const add = async (e) => {
    e.preventDefault()
    setErr('')
    const { error } = await supabase.from('assignments').insert({ ...draft, person_id: draft.person_id || null })
    if (error) return setErr(friendlyError(error))
    setDraft({ ...draft, position: '', person_id: '' })
    reload(); reloadMine()
  }
  const setStatus = async (a, status) => {
    let note = a.note
    if (status === 'swap_requested') { note = window.prompt('Let your team leader know why (optional):', '') ?? null; if (note === null) return }
    const { error } = await supabase.from('assignments').update({ status, note: note || '' }).eq('id', a.id)
    setMsg(error ? friendlyError(error) : status === 'confirmed' ? 'Thanks for confirming!' : 'Swap requested. Your team leader will see it.')
    reload(); reloadMine()
  }
  const reassign = async (a, pid) => {
    const { error } = await supabase.from('assignments').update({ person_id: pid || null, status: 'scheduled', note: '' }).eq('id', a.id)
    if (error) setErr(friendlyError(error))
    reload(); reloadMine()
  }
  const remove = async (a) => { await supabase.from('assignments').delete().eq('id', a.id); reload(); reloadMine() }
  const canManage = (team) => me.isPastoral || me.onTeam(team)
  const staff = Object.values(people).filter((p) => p.active && p.role !== 'applicant').sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))

  return (
    <>
      <PageHead title="Volunteer schedule" intro="Who is serving each Sunday on worship, sound, camera and media, kids, and safety. Confirm your dates or ask for a swap." />
      <Notice tone="success">{msg}</Notice>
      {mine.length > 0 && (
        <div className="p-card">
          <h2 className="p-card-title">My upcoming dates</h2>
          <ul className="p-team-list">
            {mine.map((a) => (
              <li key={a.id}>
                <strong>{fmtDate(a.serve_date)}</strong> · {teamLabel(a.team)}{a.position && `, ${a.position}`} <Badge tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Badge>{' '}
                {a.status !== 'confirmed' && <button className="p-link" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>}
                {a.status !== 'swap_requested' && <button className="p-link" onClick={() => setStatus(a, 'swap_requested')}>I need a swap</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="p-toolbar">
        <button className="chip" onClick={() => shift(-1)} aria-label="Previous month">Previous</button>
        <strong className="p-month">{new Date(ym[0], ym[1], 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <button className="chip" onClick={() => shift(1)} aria-label="Next month">Next</button>
      </div>
      {manageable.length > 0 && (
        <form className="p-card p-inline-form" onSubmit={add}>
          <strong>Schedule someone:</strong>
          <select required value={draft.serve_date} onChange={(e) => setDraft({ ...draft, serve_date: e.target.value })} aria-label="Date">
            <option value="">Date</option>
            {sundaysOf(ym[0], ym[1]).map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
          <select required value={draft.team} onChange={(e) => setDraft({ ...draft, team: e.target.value })} aria-label="Team">{manageable.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select>
          <input value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} placeholder="Position (vocals, camera 1, nursery)" aria-label="Position" />
          <select value={draft.person_id} onChange={(e) => setDraft({ ...draft, person_id: e.target.value })} aria-label="Person">
            <option value="">Open spot</option>
            {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}{draft.serve_date && away(p.id, draft.serve_date) ? ' (away)' : ''}</option>)}
          </select>
          <button className="button button-primary">Add</button>
        </form>
      )}
      <Notice tone="error">{err}</Notice>
      <div className="p-list">
        {dates.map((d) => {
          const list = rows.filter((r) => r.serve_date === d)
          return (
            <div className="p-card" key={d}>
              <h3>{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              {list.length === 0 ? <p className="p-muted">No one scheduled yet.</p> : (
                <div className="p-table-wrap">
                  <table className="p-table">
                    <thead><tr><th>Team</th><th>Position</th><th>Person</th><th>Status</th><th className="no-print" /></tr></thead>
                    <tbody>
                      {list.map((a) => (
                        <tr key={a.id}>
                          <td>{teamLabel(a.team)}</td>
                          <td>{a.position}</td>
                          <td>
                            {canManage(a.team) ? (
                              <select value={a.person_id || ''} onChange={(e) => reassign(a, e.target.value)} aria-label="Person">
                                <option value="">Open spot</option>
                                {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                              </select>
                            ) : (name(a.person_id) || 'Open')}
                            {a.person_id && away(a.person_id, d) && <> <Badge tone="danger">Away that day</Badge></>}
                          </td>
                          <td><Badge tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Badge>{a.note && <div className="p-small">{a.note}</div>}</td>
                          <td className="no-print">{canManage(a.team) && <button className="p-link danger" onClick={() => remove(a)}>Remove</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
        {dates.length === 0 && <Empty>No dates this month.</Empty>}
      </div>
      <MyBlackouts />
    </>
  )
}
