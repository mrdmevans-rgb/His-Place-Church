import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { Empty, PageHead, fmtDate, localISO, useMe } from '../ui'
import { gatewayUrl } from './shared'

// The date of the coming Sunday (today, if it's Sunday).
export const comingSunday = () => {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return localISO(d)
}
const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const monthDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
// "Today, November 22", "This Sunday, November 22", or "Next service: Thursday, December 24"
const heading = (iso) => iso === localISO() ? `Today, ${monthDay(iso)}`
  : new Date(`${iso}T12:00:00`).getDay() === 0 ? `This Sunday, ${monthDay(iso)}` : `Next service: ${longDate(iso)}`

// Private notes for one service. Saves on its own as you type.
export function NoteBox({ date, sermon }) {
  const me = useMe()
  const [body, setBody] = useState(null)
  const [status, setStatus] = useState('')
  const timer = useRef(null)
  const latest = useRef('')
  useEffect(() => {
    setBody(null)
    supabase.from('sermon_notes').select('body').eq('user_id', me.profile.id).eq('service_date', date).maybeSingle()
      .then(({ data }) => { setBody(data?.body || ''); latest.current = data?.body || '' })
  }, [date, me.profile.id])
  const save = async (text) => {
    setStatus('Saving...')
    const { error } = await supabase.from('sermon_notes').upsert({
      user_id: me.profile.id, service_date: date, body: text,
      sermon_title: sermon?.sermon_title || '', scripture: sermon?.scripture || '',
    })
    setStatus(error ? "Couldn't save. Check your connection." : 'Saved')
  }
  useEffect(() => () => {
    // Save anything still waiting when leaving the page.
    if (timer.current) { clearTimeout(timer.current); save(latest.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (body === null) return null
  const change = (e) => {
    const text = e.target.value
    setBody(text); latest.current = text; setStatus('')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; save(text) }, 800)
  }
  return (
    <div className="m-notes">
      <label htmlFor={`notes-${date}`}>My notes <small>Only you can see these.</small></label>
      <textarea id={`notes-${date}`} rows={5} maxLength={20000} value={body} onChange={change} placeholder="What stood out? A verse, a question, something to put into practice." />
      <div className="p-small m-notes-status" aria-live="polite">{status}</div>
    </div>
  )
}

export function useThisSunday() {
  const [s, setS] = useState(undefined)
  useEffect(() => { supabase.rpc('this_sunday').then(({ data }) => setS(data?.[0] || null)) }, [])
  return s
}

// The "This Sunday" card on the member home.
export function SermonCard({ sermon }) {
  const me = useMe()
  const date = sermon?.service_date || comingSunday()
  return (
    <div className="p-card m-sunday">
      <h2 className="p-card-title">{heading(date)}</h2>
      {sermon ? (
        <>
          {sermon.sermon_title && <p className="m-sunday-title">{sermon.sermon_title}</p>}
          {sermon.scripture && <p>Read ahead: <a href={gatewayUrl(sermon.scripture)} target="_blank" rel="noopener noreferrer">{sermon.scripture}</a></p>}
          {sermon.speaker && <p className="p-meta">{sermon.speaker}</p>}
        </>
      ) : me.isStaff ? (
        <p className="p-muted">Add the sermon title and passage in <Link to="/portal/services">Sunday run sheets</Link>, and members will see them here to read ahead.</p>
      ) : null}
      <NoteBox date={date} sermon={sermon} />
      <p className="p-small"><Link to="/portal/notes">All my sermon notes</Link></p>
    </div>
  )
}

// Every sermon note a person has kept, newest first.
export function SermonNotes() {
  const me = useMe()
  const sermon = useThisSunday()
  const [notes, setNotes] = useState(null)
  useEffect(() => {
    supabase.from('sermon_notes').select('*').eq('user_id', me.profile.id).order('service_date', { ascending: false })
      .then(({ data }) => setNotes(data || []))
  }, [me.profile.id])
  if (sermon === undefined || notes === null) return <p className="p-muted">Loading...</p>
  const current = sermon?.service_date || comingSunday()
  const past = notes.filter((n) => n.service_date !== current && n.body.trim())
  return (
    <>
      <PageHead title="My sermon notes" intro="Notes you take during the message are saved here. Only you can see them." />
      <SermonCard sermon={sermon} />
      <h2 className="p-sub">Earlier notes</h2>
      {past.length === 0 ? <Empty>Your notes from past Sundays will show up here.</Empty> : (
        <div className="p-list">
          {past.map((n) => (
            <details className="p-card m-note" key={n.service_date}>
              <summary>
                <strong>{fmtDate(n.service_date)}</strong>
                {n.sermon_title && <> · {n.sermon_title}</>}
                {n.scripture && <span className="p-meta"> · {n.scripture}</span>}
              </summary>
              {n.scripture && <p><a href={gatewayUrl(n.scripture)} target="_blank" rel="noopener noreferrer">Read {n.scripture}</a></p>}
              <NoteBox date={n.service_date} sermon={{ sermon_title: n.sermon_title, scripture: n.scripture }} />
            </details>
          ))}
        </div>
      )}
    </>
  )
}
