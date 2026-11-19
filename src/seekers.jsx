// Public pages and forms for people searching for hope and for brand-new believers:
// Seven Days of Hope sign-up, prayer requests, Honest Questions, Church Words, and Next Steps.
// Teaching content only shows once a pastor approves it (Leader Portal > Content to review).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Mail, Send } from 'lucide-react'
import { HOPE } from './content/hope'
import { QUESTIONS } from './content/questions'
import { WORDS } from './content/words'
import { NEXT_STEPS } from './content/nextSteps'
import { BIBLE_NOTICE, verse } from './scripture'
import { useDocumentHead } from './head'

const API = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const CONTACT = 'info@hpcchurch.church'
const gateway = (ref) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NASB1995`
const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } } }

async function rpc(fn, body) {
  if (!API || !KEY) throw new Error('not set up')
  const r = await fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) })
  if (!r.ok) throw new Error(String(r.status))
  return r.status === 204 ? null : r.json()
}
export async function insertRow(table, row) {
  if (!API || !KEY) throw new Error('not set up')
  const r = await fetch(`${API}/rest/v1/${table}`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(row) })
  if (!r.ok) throw new Error(String(r.status))
}
export const notify = (kind) => fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(() => {})

// Which teaching content a pastor has approved.
let approvedCache = null
export function useApproved() {
  const [a, setA] = useState(approvedCache)
  useEffect(() => {
    if (approvedCache) return
    rpc('content_approved').then((rows) => { approvedCache = Object.fromEntries((rows || []).map((r) => [r.key, r.approved])); setA(approvedCache) }).catch(() => setA({}))
  }, [])
  return a
}

function Verse({ k }) {
  const v = verse(k)
  return <blockquote className="sk-verse"><p>{v.text}</p><cite>{v.ref}</cite></blockquote>
}

/* ---------------- Seven Days of Hope ---------------- */
export function HopeSignup({ compact = false, preview = false }) {
  const approved = useApproved()
  const [state, setState] = useState({ sending: false, done: false, error: '' })
  if (!preview && !approved?.hope) return null
  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const first = String(f.get('first') || '').trim(), email = String(f.get('email') || '').trim()
    if (f.get('website')) return setState({ sending: false, done: true, error: '' })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState({ sending: false, done: false, error: 'Please enter a valid email address.' })
    if (preview) return setState({ sending: false, done: true, error: '' })
    setState({ sending: true, done: false, error: '' })
    try { await rpc('start_hope', { p_first: first, p_email: email }); notify('hope'); setState({ sending: false, done: true, error: '' }) }
    catch { setState({ sending: false, done: false, error: `Something went wrong. Please try again, or email ${CONTACT}.` }) }
  }
  return (
    <section className={`sk-hope${compact ? ' compact' : ''}`} id="hope">
      <div className="container sk-hope-inner">
        <div>
          <div className="section-label">Searching for hope?</div>
          <h2>{HOPE.title}</h2>
          <p>{HOPE.intro}</p>
          <ul className="sk-hope-days">{HOPE.days.map((d, i) => <li key={d.title}><span>Day {i + 1}</span> {d.title}</li>)}</ul>
          {!compact && <p className="sk-fine">Wrestling with something specific? Read <Link to="/questions">honest answers to hard questions</Link>, or see what <Link to="/words">church words</Link> mean.</p>}
        </div>
        <div className="card sk-hope-card">
          {state.done ? (
            <div role="status">
              <h3>You're in.</h3>
              <p>Your first email is on its way{preview ? ' (preview only, nothing was sent)' : ''}. Look for it from His Place Portal, and check your spam folder just in case. We're praying for you.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="prayer-form" noValidate>
              <div className="form-field"><label htmlFor="hope-first">First name (optional)</label><input id="hope-first" name="first" maxLength={60} autoComplete="given-name" /></div>
              <div className="form-field"><label htmlFor="hope-email">Email</label><input id="hope-email" name="email" type="email" maxLength={200} autoComplete="email" required /></div>
              <div className="join-hp" aria-hidden="true"><label htmlFor="hope-website">Leave this empty</label><input id="hope-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              {state.error && <p className="join-error" role="alert">{state.error}</p>}
              <button className="button button-primary full-width" disabled={state.sending}><Mail size={15} /> {state.sending ? 'Starting...' : 'Send me Day 1'}</button>
              <p className="sk-fine">One email a morning for seven days, then they stop. Our pastors will see your first name and email so they can pray for you. We'll never share it, and every email has a one-tap stop link.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Prayer requests ---------------- */
export function PrayerRequestForm({ openEmail }) {
  const [state, setState] = useState({ sending: false, done: false, error: '' })
  const [hasEmail, setHasEmail] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k) => String(f.get(k) || '').trim()
    if (!v('name')) return setState({ ...state, error: 'Please tell us your name, even just a first name.' })
    if (v('request').length < 2) return setState({ ...state, error: 'Please tell us how we can pray for you.' })
    if (v('website')) return setState({ sending: false, done: true, error: '' })
    setState({ sending: true, done: false, error: '' })
    try {
      await insertRow('web_prayers', { full_name: v('name'), email: v('email'), request: v('request'), pastors_only: f.get('private') === 'on', wants_note: f.get('note') === 'on' })
      notify('webprayer')
      setState({ sending: false, done: true, error: '' })
    } catch {
      openEmail(`Prayer Request from ${v('name')}`, [`Name: ${v('name')}`, `Email: ${v('email') || 'Not given'}`, '', 'Prayer Request:', v('request')])
      setState({ sending: false, done: false, error: `We couldn't send that just now, so your email app should open with your request filled in. If nothing happens, email ${CONTACT}.` })
    }
  }
  if (state.done) {
    return (
      <div role="status" className="sk-done">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h2>We'll be praying for you.</h2>
        <p>Thank you for trusting us with this. Real people from our church will pray for you by name{hasEmail ? ", and we'll email you when we have" : ''}.</p>
        <p>If you're in crisis or thinking about harming yourself, please call or text <a href="tel:988">988</a> right now. Someone is there day or night.</p>
      </div>
    )
  }
  return (
    <form className="prayer-form" onSubmit={submit} noValidate>
      <div className="form-field"><label htmlFor="prayer-name">Your name</label><input id="prayer-name" name="name" type="text" autoComplete="name" maxLength={120} required /></div>
      <div className="form-field"><label htmlFor="prayer-email">Email (optional)</label><input id="prayer-email" name="email" type="email" autoComplete="email" maxLength={200} onChange={(e) => setHasEmail(!!e.target.value.trim())} /></div>
      <div className="form-field"><label htmlFor="prayer-request">How can we pray for you?</label><textarea id="prayer-request" name="request" rows="7" maxLength={4000} required /></div>
      <label className="serve-option"><input type="checkbox" name="private" /><span><strong>Only share this with the pastors</strong></span></label>
      {hasEmail && <label className="serve-option"><input type="checkbox" name="note" defaultChecked /><span><strong>Email me when you've prayed for me</strong></span></label>}
      <div className="join-hp" aria-hidden="true"><label htmlFor="prayer-website">Leave this empty</label><input id="prayer-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {state.error && <p className="join-error" role="alert">{state.error}</p>}
      <button type="submit" className="button button-primary full-width" disabled={state.sending}><Send size={15} /> {state.sending ? 'Sending...' : 'Send my prayer request'}</button>
    </form>
  )
}

/* ---------------- Honest Questions ---------------- */
export function QuestionsBody() {
  const [open, setOpen] = useState(() => (typeof window !== 'undefined' ? window.location.hash.slice(1) : ''))
  return (
    <div className="sk-questions">
      {QUESTIONS.map((q) => (
        <details key={q.slug} id={q.slug} className="card sk-q" open={open === q.slug} onToggle={(e) => e.currentTarget.open && setOpen(q.slug)}>
          <summary><h2>{q.q}</h2></summary>
          {q.a.map((p) => <p key={p}>{p}</p>)}
          {q.verses.map((k) => <Verse key={k} k={k} />)}
          <p className="sk-more">Read more: {q.more.map((r, i) => <span key={r}>{i ? ', ' : ''}<a href={gateway(r)} target="_blank" rel="noopener noreferrer">{r}</a></span>)}</p>
          <p className="sk-talk">Want to talk about this? <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`A question: ${q.q}`)}`}>Email a pastor</a>, or <Link to="/visit">come see us on Sunday</Link>.</p>
        </details>
      ))}
    </div>
  )
}
export function HonestQuestionsPage() {
  const approved = useApproved()
  useDocumentHead({ title: 'Honest Questions', description: 'Plain, honest answers from the Bible to the questions people lie awake with: pain, forgiveness, doubt, anxiety, and how to know Jesus.' })
  if (approved === null) return <section className="section page-section"><div className="container"><p>Loading...</p></div></section>
  if (!approved.questions) return <ComingSoon />
  return (
    <section className="section page-section">
      <div className="container stack-lg sk-page">
        <div className="section-intro">
          <div className="section-label">Honest Questions</div>
          <h1>Questions people lie awake with</h1>
          <p>You don't have to have it all figured out to come to God. Here are short, honest answers from the Bible to some of the hardest questions. Tap a question to read.</p>
        </div>
        <QuestionsBody />
        <p className="sk-also">Hearing words you don't know? <Link to="/words">Church Words Decoded</Link> explains them in plain language. Ready to follow Jesus? <Link to="/know-jesus">Here's how</Link>.</p>
        <HopeSignup compact />
        <p className="translation-note">{BIBLE_NOTICE}</p>
      </div>
    </section>
  )
}

/* ---------------- Church Words ---------------- */
export function WordsBody() {
  const [q, setQ] = useState('')
  const list = WORDS.filter((w) => !q || `${w.word} ${w.also.join(' ')} ${w.means}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <label className="sr-only" htmlFor="words-search">Search church words</label>
      <input id="words-search" className="sk-search" type="search" placeholder="Search, like grace or baptism" value={q} onChange={(e) => setQ(e.target.value)} />
      <dl className="sk-words">
        {list.map((w) => (
          <div key={w.word} className="card" id={w.word.toLowerCase().replace(/[^a-z]+/g, '-')}>
            <dt>{w.word}</dt>
            <dd>{w.means} <a href={gateway(w.ref)} target="_blank" rel="noopener noreferrer">See {w.ref}</a></dd>
          </div>
        ))}
      </dl>
      {list.length === 0 && <p>No match. <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('What does this word mean?')}`}>Ask us</a> and we'll explain.</p>}
    </>
  )
}
export function ChurchWordsPage() {
  const approved = useApproved()
  useDocumentHead({ title: 'Church Words Decoded', description: 'Plain explanations of words you hear at church: grace, gospel, repent, baptism, and more.' })
  if (approved === null) return <section className="section page-section"><div className="container"><p>Loading...</p></div></section>
  if (!approved.words) return <ComingSoon />
  return (
    <section className="section page-section">
      <div className="container stack-lg sk-page">
        <div className="section-intro">
          <div className="section-label">Church Words Decoded</div>
          <h1>What does that word mean?</h1>
          <p>Church has its own vocabulary, and nobody should feel lost. Here are plain explanations of words you'll hear often.</p>
        </div>
        <WordsBody />
        <p className="sk-also">Have bigger questions? <Link to="/questions">Read honest answers</Link>, or <Link to="/know-jesus">learn how to know Jesus</Link>.</p>
      </div>
    </section>
  )
}

/* ---------------- Next Steps ---------------- */
export function NextStepsBody() {
  const [done, setDone] = useState(() => store.get('hp-next-steps') || {})
  const toggle = (k) => { const n = { ...done, [k]: !done[k] }; setDone(n); store.set('hp-next-steps', n) }
  const count = NEXT_STEPS.steps.filter((s) => done[s.key]).length
  return (
    <>
      <Verse k={NEXT_STEPS.welcome} />
      <p className="sk-progress" aria-live="polite">{count} of {NEXT_STEPS.steps.length} steps done</p>
      <ol className="sk-steps">
        {NEXT_STEPS.steps.map((s) => (
          <li key={s.key} className={`card${done[s.key] ? ' done' : ''}`}>
            <label className="sk-step-head"><input type="checkbox" checked={!!done[s.key]} onChange={() => toggle(s.key)} /><h2>{s.title}</h2></label>
            <p>{s.text}</p>
            {s.verse && <Verse k={s.verse} />}
            {s.chapters && (
              <>
                <div className="sk-chapters" role="group" aria-label="Check off each chapter of John as you read it">
                  {Array.from({ length: s.chapters }, (_, i) => i + 1).map((c) => (
                    <button key={c} type="button" className={done[`john${c}`] ? 'on' : ''} aria-pressed={!!done[`john${c}`]} aria-label={`John chapter ${c}${done[`john${c}`] ? ', read' : ''}`} onClick={() => toggle(`john${c}`)}>{c}</button>
                  ))}
                </div>
                {(() => {
                  const next = Array.from({ length: s.chapters }, (_, i) => i + 1).find((c) => !done[`john${c}`])
                  return next ? <p><a className="button button-secondary" href={gateway(`John ${next}`)} target="_blank" rel="noopener noreferrer">Read the next chapter: John {next}</a></p> : <p><strong>You've read the whole Gospel of John. Well done!</strong></p>
                })()}
              </>
            )}
            {s.key === 'baptism' && <p><a className="button button-secondary" href={`mailto:${CONTACT}?subject=${encodeURIComponent("I'd like to talk about baptism")}`}>Ask about baptism</a></p>}
            {s.key === 'sunday' && <p><Link className="button button-secondary" to="/visit">Plan your visit</Link></p>}
            {s.key === 'roots' && <p><Link className="button button-secondary" to="/join">Request member access</Link></p>}
          </li>
        ))}
      </ol>
      <p className="sk-fine">Your check marks are saved on this device only.</p>
    </>
  )
}
export function NextStepsPage() {
  const approved = useApproved()
  useDocumentHead({ title: 'Next Steps', description: 'Just decided to follow Jesus? Simple next steps to help you grow: prayer, the Gospel of John, baptism, church, and a mentor.' })
  if (approved === null) return <section className="section page-section"><div className="container"><p>Loading...</p></div></section>
  if (!approved.next_steps) return <ComingSoon />
  return (
    <section className="section page-section">
      <div className="container stack-lg sk-page">
        <div className="section-intro">
          <div className="section-label">Next steps</div>
          <h1>{NEXT_STEPS.title}</h1>
          <p>{NEXT_STEPS.intro}</p>
        </div>
        <NextStepsBody />
        <p className="sk-also">Hearing words like grace, repent, or baptism? <Link to="/words">Church Words Decoded</Link> explains them.</p>
        <p className="translation-note">{BIBLE_NOTICE}</p>
      </div>
    </section>
  )
}

// A page of its own for Seven Days of Hope, so it's easy to share: hpcchurch.church/hope
export function HopePage() {
  const approved = useApproved()
  useDocumentHead({ title: 'Seven Days of Hope', description: 'Seven short emails, one each morning, walking through the Gospel of John. For anyone searching for hope, peace, and Jesus. No church background needed.' })
  if (approved === null) return <section className="section page-section"><div className="container"><p>Loading...</p></div></section>
  if (!approved.hope) return <ComingSoon />
  return (
    <>
      <section className="section page-section sk-hope-hero">
        <div className="container section-intro">
          <div className="section-label">For anyone searching</div>
          <h1>Looking for hope?</h1>
          <p>Maybe life feels heavy right now. Maybe you've got questions about God, or you're just curious about Jesus. You don't need to have anything figured out. For seven mornings, we'll send you a short email with a passage from the Gospel of John, a few honest thoughts, and a simple prayer.</p>
          <Verse k="matt11:28" />
        </div>
      </section>
      <HopeSignup />
      <section className="section">
        <div className="container sk-also">
          <p>Not ready for emails? <Link to="/questions">Read honest answers to hard questions</Link>, <Link to="/prayer">ask us to pray for you</Link>, or <Link to="/know-jesus">learn how to know Jesus</Link>.</p>
          <p className="translation-note">{BIBLE_NOTICE}</p>
        </div>
      </section>
    </>
  )
}

function ComingSoon() {
  return (
    <section className="section page-section">
      <div className="container section-intro">
        <div className="section-label">Coming soon</div>
        <h1>This page isn't ready yet.</h1>
        <p>We're still working on it. In the meantime, we'd love to hear from you.</p>
        <div className="hero-actions"><Link to="/know-jesus" className="button button-primary">Know Jesus</Link><Link to="/prayer" className="button button-secondary">Ask for prayer</Link></div>
      </div>
    </section>
  )
}

// After someone shares "I put my trust in Jesus" or "I'm coming back", take them to Next Steps.
export function useAfterDecision() {
  const nav = useNavigate()
  return () => { window.scrollTo(0, 0); nav('/next-steps?welcome=1') }
}
