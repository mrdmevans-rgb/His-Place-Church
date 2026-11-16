import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Circle, Sprout } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, fmtDateTime, useMe, usePeople, usePortal } from '../ui'
import { gatewayUrl } from './shared'

// Courses live in the code. Loaded only when someone opens one.
const COURSES = { rooted: () => import('./courses/rooted.json').then((m) => m.default) }
export const COURSE_NAMES = { rooted: 'Rooted' }

function useCourse(key) {
  const [c, setC] = useState(null)
  useEffect(() => { COURSES[key]?.().then(setC) }, [key])
  return c
}

/* ======================= One session ======================= */
function Field({ id, value, onChange, readOnly, rows = 3, label, placeholder }) {
  if (readOnly) return <div className="d-answer">{value ? value : <em className="p-muted">No answer yet</em>}</div>
  return <textarea id={id} aria-label={label} className="d-input" rows={rows} maxLength={5000} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}
function Tick({ checked, onChange, readOnly, children }) {
  return (
    <label className="p-check d-tick">
      <input type="checkbox" checked={!!checked} disabled={readOnly} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

// What a mentor sees: only the parts with answers.
function AnswersOnly({ lesson, answers }) {
  const a = answers || {}
  const yes = (v) => (v ? 'Yes' : 'Not yet')
  return (
    <dl className="d-answers">
      {lesson.blocks.map((b, i) => {
        switch (b.t) {
          case 'read': return <div key={i}><dt>{b.text}</dt><dd>{yes(a[b.id])}</dd></div>
          case 'q': return <div key={i}><dt>{b.q}</dt><dd><Field value={a[b.id]} readOnly /></dd></div>
          case 'memory': return <div key={i}><dt>Memory verse: {b.ref}</dt><dd>Can say it from memory: {yes(a[`${b.id}_ok`])}{a[b.id] && <Field value={a[b.id]} readOnly />}</dd></div>
          case 'activity': return <div key={i}><dt>Activity: {b.title}</dt><dd>Done: {yes(a[`${b.id}_done`])}<Field value={a[b.id]} readOnly /></dd></div>
          case 'video': return <div key={i}><dt>Video: {b.title}</dt><dd>Watched: {yes(a[`${b.id}_done`])}<p className="p-small d-prompt-ro">{b.prompt}</p><Field value={a[b.id]} readOnly /></dd></div>
          default: return null
        }
      })}
    </dl>
  )
}

export function SessionBody({ lesson, answers, setAnswer, readOnly }) {
  const a = answers || {}
  return (
    <div className="d-session">
      {lesson.blocks.map((b, i) => {
        switch (b.t) {
          case 'big': return <p key={i} className="d-big">{b.text}</p>
          case 'h': return <h2 key={i} className="p-sub d-h">{b.text}</h2>
          case 'p': return <p key={i} className="d-p">{b.text}</p>
          case 'note': return <Notice key={i} tone="info">{b.text}</Notice>
          case 'passage': return <blockquote key={i} className="d-passage"><p>{b.text}</p><cite><a href={gatewayUrl(b.ref)} target="_blank" rel="noopener noreferrer">{b.ref}</a></cite></blockquote>
          case 'read': return <div key={i} className="p-card d-read"><p>{b.text}</p><Tick checked={a[b.id]} readOnly={readOnly} onChange={(v) => setAnswer(b.id, v)}>I read it</Tick></div>
          case 'q': return <div key={i} className="d-q"><label htmlFor={`a-${b.id}`}>{b.q}</label><Field id={`a-${b.id}`} label={b.q} value={a[b.id]} readOnly={readOnly} onChange={(v) => setAnswer(b.id, v)} /></div>
          case 'memory': return (
            <div key={i} className="p-card d-memory">
              <blockquote className="d-passage"><p>{b.text}</p><cite><a href={gatewayUrl(b.ref)} target="_blank" rel="noopener noreferrer">{b.ref}</a></cite></blockquote>
              <Tick checked={a[`${b.id}_ok`]} readOnly={readOnly} onChange={(v) => setAnswer(`${b.id}_ok`, v)}>I can say it from memory</Tick>
              <Field id={`a-${b.id}`} label={`Write ${b.ref} from memory`} placeholder="Practice: write it out from memory" rows={2} value={a[b.id]} readOnly={readOnly} onChange={(v) => setAnswer(b.id, v)} />
            </div>
          )
          case 'activity': return (
            <div key={i} className="p-card d-activity">
              <h3>{b.title}</h3>
              <p>{b.how}</p>
              <Tick checked={a[`${b.id}_done`]} readOnly={readOnly} onChange={(v) => setAnswer(`${b.id}_done`, v)}>Done</Tick>
              <Field id={`a-${b.id}`} label={`${b.title}: what I did`} placeholder="What you did, and what you noticed" rows={4} value={a[b.id]} readOnly={readOnly} onChange={(v) => setAnswer(b.id, v)} />
            </div>
          )
          case 'video': return (
            <div key={i} className="p-card d-video">
              <div className="d-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${b.vid}?rel=0`} title={b.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
              <h3>{b.title} <span className="p-meta">{b.mins} min, BibleProject</span></h3>
              <Tick checked={a[`${b.id}_done`]} readOnly={readOnly} onChange={(v) => setAnswer(`${b.id}_done`, v)}>I watched it</Tick>
              <label htmlFor={`a-${b.id}`} className="d-prompt">{b.prompt}</label>
              <Field id={`a-${b.id}`} label={b.prompt} rows={3} value={a[b.id]} readOnly={readOnly} onChange={(v) => setAnswer(b.id, v)} />
            </div>
          )
          default: return null
        }
      })}
    </div>
  )
}

/* ======================= Member: my path ======================= */
function useMyWork(memberId, course) {
  const [work, setWork] = useState(null)
  const load = () => supabase.from('disciple_work').select('*').eq('member_id', memberId).eq('course', course)
    .then(({ data }) => setWork(Object.fromEntries((data || []).map((w) => [w.session, w]))))
  useEffect(() => { if (memberId) load() }, [memberId, course]) // eslint-disable-line react-hooks/exhaustive-deps
  return [work, load]
}

export function MyDiscipleship() {
  const me = useMe()
  const { n } = useParams()
  const [assignment, setAssignment] = useState(undefined)
  useEffect(() => {
    supabase.from('disciple_assignments').select('*').eq('member_id', me.profile.id).order('assigned_at', { ascending: false })
      .then(({ data }) => setAssignment((data || [])[0] || null))
  }, [me.profile.id])
  const key = assignment?.course || 'rooted'
  const course = useCourse(key)
  const [work, reloadWork] = useMyWork(me.profile.id, key)
  if (assignment === undefined || (assignment && (!course || !work))) return <p className="p-muted">Loading...</p>
  if (!assignment) {
    return (
      <>
        <PageHead title="Discipleship" />
        <Empty>Discipleship paths are given by a pastor or leader, so you can walk through them together. If you'd like to start one, let a leader know.</Empty>
      </>
    )
  }
  if (n) return <MySession course={course} courseKey={key} n={Number(n)} work={work} reloadWork={reloadWork} active={assignment.active} />
  return <CourseHome course={course} work={work} assignment={assignment} />
}

function CourseHome({ course, work, assignment }) {
  const { name } = usePeople()
  const done = course.lessons.filter((l) => work[l.n]?.done_at).length
  const next = course.lessons.find((l) => !work[l.n]?.done_at)
  return (
    <>
      <PageHead title={course.title} intro={course.subtitle} />
      {!assignment.active && <Notice tone="warn">Your path is paused for now. You can still read your answers. Talk with your mentor to pick it back up.</Notice>}
      <div className="p-card d-theme">
        <blockquote className="d-passage"><p>{course.intro.theme_text}</p><cite><a href={gatewayUrl(course.intro.theme)} target="_blank" rel="noopener noreferrer">{course.intro.theme}</a></cite></blockquote>
        {course.intro.about.map((t) => <p key={t}>{t}</p>)}
        <h3 className="p-sub">The path</h3>
        <ul className="d-flow">{course.intro.flow.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="p-meta">{assignment.mentor_id ? <>Your mentor: <strong>{name(assignment.mentor_id) || 'a leader'}</strong>. </> : ''}{course.translation}.</p>
      </div>
      <div className="d-progress" aria-label={`${done} of ${course.lessons.length} sessions finished`}>
        <div className="d-bar"><span style={{ width: `${(done / course.lessons.length) * 100}%` }} /></div>
        <span className="p-small">{done} of {course.lessons.length} sessions finished</span>
      </div>
      {next && assignment.active && <p><Link className="button button-primary" to={`/portal/discipleship/${next.n}`}>{done ? `Continue: Session ${next.n}` : 'Start Session 1'}</Link></p>}
      <ol className="d-list">
        {course.lessons.map((l) => {
          const w = work[l.n]
          return (
            <li key={l.n}>
              <Link to={`/portal/discipleship/${l.n}`} className={`d-item${w?.done_at ? ' done' : ''}`}>
                {w?.done_at ? <CheckCircle2 size={20} aria-label="Finished" /> : <Circle size={20} aria-hidden="true" />}
                <span><strong>{l.n <= 12 ? `Session ${l.n}: ` : ''}{l.title}</strong>{l.reading && <small>Read {l.reading}</small>}</span>
                {!w?.done_at && w && <Badge tone="info">Started</Badge>}
              </Link>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function MySession({ course, courseKey, n, work, reloadWork, active }) {
  const me = useMe()
  const nav = useNavigate()
  const lesson = course.lessons.find((l) => l.n === n)
  const [answers, setAnswers] = useState(() => work[n]?.answers || {})
  const [status, setStatus] = useState('')
  const timer = useRef(null)
  const latest = useRef(answers)
  useEffect(() => { setAnswers(work[n]?.answers || {}); latest.current = work[n]?.answers || {}; window.scrollTo(0, 0) }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (next, extra = {}) => {
    setStatus('Saving...')
    const { error } = await supabase.from('disciple_work').upsert({ member_id: me.profile.id, course: courseKey, session: n, answers: next, ...extra })
    setStatus(error ? `Couldn't save. ${friendlyError(error)}` : 'Saved')
    return !error
  }
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); save(latest.current) } }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!lesson) return <Empty>That session wasn't found. <Link to="/portal/discipleship">Back to the path</Link></Empty>
  const setAnswer = (id, v) => {
    const next = { ...latest.current, [id]: v }
    latest.current = next; setAnswers(next); setStatus('')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; save(next) }, 800)
  }
  const done = !!work[n]?.done_at
  const finish = async () => {
    clearTimeout(timer.current); timer.current = null
    if (await save(latest.current, { done_at: done ? null : new Date().toISOString() })) {
      await reloadWork()
      if (!done) { const nextL = course.lessons.find((l) => l.n > n); nav(nextL ? `/portal/discipleship/${nextL.n}` : '/portal/discipleship') }
    }
  }
  const prev = course.lessons.filter((l) => l.n < n).pop()
  const nextL = course.lessons.find((l) => l.n > n)
  return (
    <>
      <p className="p-small"><Link to="/portal/discipleship">{course.title}</Link> · {n <= 12 ? `Session ${n} of 12` : 'Wrapping up'}</p>
      <PageHead title={lesson.title} />
      {!active && <Notice tone="warn">Your path is paused, so changes won't save. Talk with your mentor to pick it back up.</Notice>}
      <div className="d-savebar p-small" aria-live="polite">{active ? (status || 'Your answers save as you type. Your mentor and our pastors can read them.') : 'Read only'}</div>
      <SessionBody lesson={lesson} answers={answers} setAnswer={setAnswer} readOnly={!active} />
      <div className="d-nav">
        {prev ? <Link className="button button-secondary" to={`/portal/discipleship/${prev.n}`}>Back</Link> : <span />}
        {active && <button className={`button ${done ? 'button-secondary' : 'button-primary'}`} onClick={finish}>{done ? 'Mark as not finished' : n <= 12 ? 'I finished this session' : 'I finished the path'}</button>}
        {nextL ? <Link className="button button-secondary" to={`/portal/discipleship/${nextL.n}`}>Next</Link> : <span />}
      </div>
    </>
  )
}

/* ======================= Leaders ======================= */
export function DiscipleshipLeaders() {
  const me = useMe()
  const { people, name } = usePeople()
  const { reloadProfile } = usePortal()
  const { memberId } = useParams()
  const [rows, setRows] = useState(null)
  const [progress, setProgress] = useState({})
  const [form, setForm] = useState({ member: '', mentor: me.profile.id })
  const [msg, setMsg] = useState({ tone: 'success', text: '' })
  const course = useCourse('rooted')
  const total = course?.lessons.length || 13
  const load = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('disciple_assignments').select('*').order('assigned_at', { ascending: false }),
      supabase.rpc('disciple_progress'),
    ])
    setRows(a || [])
    setProgress(Object.fromEntries((p || []).map((x) => [`${x.member_id}|${x.course}`, x])))
  }
  useEffect(() => { load() }, [])
  const everyone = useMemo(() => Object.values(people).filter((p) => p.active && ['admin', 'pastor', 'leader', 'member'].includes(p.role)).sort((x, y) => (x.full_name || '').localeCompare(y.full_name || '')), [people])
  const leaders = everyone.filter((p) => ['admin', 'pastor', 'leader'].includes(p.role))
  if (memberId) return <MemberAnswers memberId={memberId} course={course} />
  if (!rows) return <p className="p-muted">Loading...</p>
  const assigned = new Set(rows.map((r) => r.member_id))
  const assign = async (e) => {
    e.preventDefault()
    if (!form.member) return
    const { error } = await supabase.from('disciple_assignments').insert({ member_id: form.member, course: 'rooted', mentor_id: form.mentor || null })
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: `Rooted assigned to ${name(form.member)}. It now shows in their portal under Discipleship.` })
    if (!error) { setForm({ ...form, member: '' }); load(); if (form.member === me.profile.id) reloadProfile() }
  }
  const update = async (r, patch, text) => {
    const { error } = await supabase.from('disciple_assignments').update(patch).eq('member_id', r.member_id).eq('course', r.course)
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text })
    load(); if (r.member_id === me.profile.id) reloadProfile()
  }
  const canRead = (r) => me.isPastoral || r.mentor_id === me.profile.id
  return (
    <>
      <PageHead title="Discipleship paths" intro="Assign Rooted, a twelve session discipleship path, to a member and walk through it with them. They see it in their portal once it's assigned." />
      <form className="p-card p-form" onSubmit={assign}>
        <h2 className="p-card-title">Assign Rooted</h2>
        <div className="p-form-grid">
          <div className="p-field half">
            <label htmlFor="d-member">Member</label>
            <select id="d-member" required value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })}>
              <option value="">Choose a person</option>
              {everyone.filter((p) => !assigned.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          <div className="p-field half">
            <label htmlFor="d-mentor">Mentor</label>
            <select id="d-mentor" value={form.mentor} onChange={(e) => setForm({ ...form, mentor: e.target.value })}>
              <option value="">No mentor yet</option>
              {leaders.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}{p.id === me.profile.id ? ' (you)' : ''}</option>)}
            </select>
            <small>The mentor meets with them and can read their answers. Pastors can too.</small>
          </div>
        </div>
        <div className="p-form-actions"><button className="button button-primary" disabled={!form.member}>Assign</button></div>
      </form>
      <Notice tone={msg.tone}>{msg.text}</Notice>
      {rows.length === 0 ? <Empty>Nobody has been assigned a path yet.</Empty> : (
        <div className="p-list">
          {rows.map((r) => {
            const pr = progress[`${r.member_id}|${r.course}`]
            const doneN = pr?.sessions_done || 0
            return (
              <div className={`p-card${r.active ? '' : ' p-inactive'}`} key={r.member_id + r.course}>
                <div className="p-item-head">
                  <h3>{name(r.member_id) || 'A member'}</h3>
                  <span className="p-badges">{!r.active && <Badge tone="warn">Paused</Badge>}{doneN >= total && <Badge tone="success">Finished</Badge>}</span>
                </div>
                <div className="d-progress"><div className="d-bar"><span style={{ width: `${(doneN / total) * 100}%` }} /></div><span className="p-small">{doneN} of {total} sessions</span></div>
                <div className="p-meta">{COURSE_NAMES[r.course] || r.course} · Assigned {fmtDate(r.assigned_at)}{r.assigned_by ? ` by ${name(r.assigned_by)}` : ''}{pr?.last_activity ? ` · Last worked on ${fmtDateTime(pr.last_activity)}` : ' · Not started yet'}</div>
                <div className="p-row-actions">
                  <label className="d-mentor-pick">Mentor:{' '}
                    <select value={r.mentor_id || ''} onChange={(e) => update(r, { mentor_id: e.target.value || null }, 'Mentor updated.')} aria-label={`Mentor for ${name(r.member_id)}`}>
                      <option value="">No mentor yet</option>
                      {leaders.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                    </select>
                  </label>
                  {canRead(r) && <Link className="p-link" to={`/portal/discipleship-leaders/${r.member_id}`}>Read their answers</Link>}
                  <button className="p-link" onClick={() => update(r, { active: !r.active }, r.active ? 'Paused. They can still read their answers but not change them.' : 'Turned back on.')}>{r.active ? 'Pause' : 'Turn back on'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function MemberAnswers({ memberId, course }) {
  const { name } = usePeople()
  const [work, setWork] = useState(null)
  const [open, setOpen] = useState(null)
  useEffect(() => {
    supabase.from('disciple_work').select('*').eq('member_id', memberId).eq('course', 'rooted')
      .then(({ data }) => setWork(Object.fromEntries((data || []).map((w) => [w.session, w]))))
  }, [memberId])
  if (!course || !work) return <p className="p-muted">Loading...</p>
  const who = name(memberId) || 'This member'
  return (
    <>
      <p className="p-small"><Link to="/portal/discipleship-leaders">Discipleship paths</Link></p>
      <PageHead title={`${who}: ${course.title}`} intro="Read only. Use what they wrote to guide your time together." />
      {Object.keys(work).length === 0 && <Empty>{who} hasn't written anything yet, or you aren't their mentor.</Empty>}
      <ol className="d-list">
        {course.lessons.map((l) => {
          const w = work[l.n]
          return (
            <li key={l.n}>
              <button type="button" className={`d-item${w?.done_at ? ' done' : ''}`} onClick={() => setOpen(open === l.n ? null : l.n)} aria-expanded={open === l.n}>
                {w?.done_at ? <CheckCircle2 size={20} aria-label="Finished" /> : <Circle size={20} aria-hidden="true" />}
                <span><strong>{l.n <= 12 ? `Session ${l.n}: ` : ''}{l.title}</strong><small>{w?.done_at ? `Finished ${fmtDate(w.done_at)}` : w ? `Last saved ${fmtDateTime(w.updated_at)}` : 'Not started'}</small></span>
              </button>
              {open === l.n && <div className="d-readonly"><AnswersOnly lesson={l} answers={w?.answers} /></div>}
            </li>
          )
        })}
      </ol>
    </>
  )
}

export const DiscipleshipIcon = Sprout
