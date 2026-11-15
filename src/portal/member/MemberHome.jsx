import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Heart, MessageCircleQuestion, CalendarHeart, HandHelping, Users, BookMarked, Soup } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, fmtDateTime, today, useMe, usePeople, usePortal } from '../ui'
import { Celebrations } from './Community'
import { PassageLinks, gatewayUrl } from './shared'

export const CONDUCT = [
  'Speak the truth in love (Ephesians 4:15). Be kind, even when you disagree.',
  "Keep what's shared here within our church family. Don't copy or share others' prayer requests, posts, or contact information outside the portal.",
  "Protect our children. Don't post children's photos, schools, or schedules.",
  'No selling, fundraising, or political campaigning.',
  'If something concerns you, use Report, or talk with a pastor.',
  'Pastors and admins may hide posts or remove access to keep the community safe.',
]

export function ConductGate({ children }) {
  const me = useMe()
  const { reloadProfile } = usePortal()
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  if (!me.isMember || me.profile.conduct_accepted_at) return children
  const accept = async () => {
    const { error } = await supabase.from('profiles').update({ conduct_accepted_at: new Date().toISOString() }).eq('id', me.profile.id)
    if (error) return setErr(friendlyError(error))
    reloadProfile()
  }
  return (
    <div className="p-card m-conduct">
      <h1>Welcome to the His Place member portal</h1>
      <p>This is a private space for our church family to study God's Word, pray for one another, and care for each other between Sundays. Before you begin, please read our community guidelines.</p>
      <ol>{CONDUCT.map((c) => <li key={c}>{c}</li>)}</ol>
      <label className="p-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree to these guidelines.</span></label>
      <Notice tone="error">{err}</Notice>
      <button className="button button-primary" disabled={!agree} onClick={accept}>Enter the member portal</button>
    </div>
  )
}

const TILES = [
  ['/portal/study', 'Bible study library', BookOpen],
  ['/portal/read', 'Read together', BookMarked],
  ['/portal/pray', 'Prayer wall', Heart],
  ['/portal/ask', 'Ask the Pastor', MessageCircleQuestion],
  ['/portal/gatherings', 'Gatherings', CalendarHeart],
  ['/portal/care', 'Care calendar', Soup],
  ['/portal/help', 'Help board', HandHelping],
  ['/portal/directory', 'Directory', Users],
]

export default function MemberHome() {
  const me = useMe()
  const { name } = usePeople()
  const [d, setD] = useState(null)
  useEffect(() => {
    const rows = (q) => q.then((r) => r.data || [])
    Promise.all([
      rows(supabase.from('reading_weeks').select('*').lte('week_of', today()).order('week_of', { ascending: false }).limit(1)),
      rows(supabase.from('reading_weeks').select('*').gt('week_of', today()).order('week_of', { ascending: true }).limit(1)),
      rows(supabase.from('gatherings').select('*').gte('starts_at', new Date().toISOString()).order('starts_at').limit(3)),
      rows(supabase.from('member_prayers').select('id, title, author, created_at').eq('answered', false).eq('pastors_only', false).order('created_at', { ascending: false }).limit(4)),
      rows(supabase.from('care_pages').select('id, title').eq('status', 'open')),
      rows(supabase.from('help_posts').select('id, title, kind').eq('status', 'open').order('created_at', { ascending: false }).limit(3)),
      rows(supabase.from('lesson_progress').select('lesson_id, completed_at, study_lessons(series_id, position, study_series(title))').order('completed_at', { ascending: false }).limit(1)),
      rows(supabase.from('pastor_questions').select('id').eq('author', me.profile.id).not('answered_at', 'is', null)),
    ]).then(([reading, nextReading, gatherings, prayers, care, help, progress, answered]) => setD({ reading: reading[0], nextReading: nextReading[0], gatherings, prayers, care, help, progress: progress[0], answered }))
  }, [me.profile.id])
  const first = (me.profile.full_name || '').split(' ')[0]
  if (!d) return <p className="p-muted">Loading...</p>
  const s = d.progress?.study_lessons
  return (
    <>
      <PageHead title={`Welcome${first ? `, ${first}` : ''}`} intro="Your His Place family, all week long." />
      <div className="m-tiles">{TILES.map(([to, label, Icon]) => <Link key={to} to={to} className="m-tile"><Icon size={22} aria-hidden="true" /><span>{label}</span></Link>)}</div>
      {d.answered.length > 0 && <Notice tone="success">The pastor has answered your question. <Link to="/portal/ask">Read the answer</Link></Notice>}
      <div className="p-dash-grid">
        <div className="p-card">
          <h2 className="p-card-title">This week's reading</h2>
          {d.reading ? (() => {
            const dow = new Date().getDay()
            const todays = dow >= 1 && dow <= 5 ? d.reading.days?.[dow - 1] : null
            return <>
              <p><strong>{d.reading.passage}</strong></p>
              {todays ? <p>Today: <a href={gatewayUrl(todays.passage)} target="_blank" rel="noopener noreferrer">{todays.passage}</a></p> : <PassageLinks passage={d.reading.passage} />}
              <p><Link to="/portal/read">Read together and share</Link></p>
            </>
          })() : d.nextReading ? <><p>Starts {fmtDate(d.nextReading.week_of)}: <strong>{d.nextReading.passage}</strong></p><p><Link to="/portal/read">See the plan</Link></p></> : <p className="p-muted">Coming soon.</p>}
        </div>
        <div className="p-card">
          <h2 className="p-card-title">Keep studying</h2>
          {s ? <p>You last finished lesson {s.position} of <strong>{s.study_series?.title}</strong>. <Link to={`/portal/study/${s.series_id}`}>Pick up where you left off</Link></p>
            : <p>Find a study by book, teacher, or style. <Link to="/portal/study">Browse the library</Link></p>}
        </div>
        <div className="p-card">
          <h2 className="p-card-title">Coming up</h2>
          {d.gatherings.length ? <ul className="p-team-list">{d.gatherings.map((g) => <li key={g.id}><strong>{g.title}</strong><br /><span className="p-meta">{fmtDateTime(g.starts_at)}</span></li>)}</ul> : <p className="p-muted">Nothing planned. <Link to="/portal/gatherings">Host something</Link></p>}
        </div>
        <div className="p-card">
          <h2 className="p-card-title">Pray for</h2>
          {d.prayers.length ? <ul className="p-team-list">{d.prayers.map((p) => <li key={p.id}>{p.title} <span className="p-meta">· {name(p.author) || 'a member'}, {fmtDate(p.created_at)}</span></li>)}</ul> : <p className="p-muted">No needs shared right now.</p>}
          <Link to="/portal/pray">Prayer wall</Link>
        </div>
      </div>
      {(d.care.length > 0 || d.help.length > 0) && (
        <div className="p-card">
          <h2 className="p-card-title">Ways to help this week</h2>
          <ul className="p-team-list">
            {d.care.map((c) => <li key={c.id}><Badge tone="warn">Meals</Badge> <Link to="/portal/care">{c.title}</Link></li>)}
            {d.help.map((h) => <li key={h.id}><Badge tone={h.kind === 'need' ? 'warn' : 'success'}>{h.kind === 'need' ? 'Need' : 'Offer'}</Badge> <Link to="/portal/help">{h.title}</Link></li>)}
          </ul>
        </div>
      )}
      <Celebrations compact />
    </>
  )
}

export function Moderation() {
  const [rows, setRows] = useState(null)
  const load = async () => {
    const { data } = await supabase.from('content_reports').select('*').eq('resolved', false).order('created_at', { ascending: false })
    const out = []
    for (const r of data || []) {
      const { data: item } = await supabase.from(r.item_table).select('*').eq('id', r.item_id).maybeSingle()
      out.push({ ...r, item })
    }
    setRows(out)
  }
  useEffect(() => { load() }, [])
  const { name } = usePeople()
  const resolve = async (r, hide) => {
    if (hide && r.item) await supabase.from(r.item_table).update({ hidden: true }).eq('id', r.item_id)
    await supabase.from('content_reports').update({ resolved: true }).eq('id', r.id)
    load()
  }
  const label = { lesson_comments: 'Study discussion', member_prayers: 'Prayer request', member_prayer_comments: 'Prayer encouragement', help_posts: 'Help board post', help_replies: 'Help board reply', gatherings: 'Gathering', reading_comments: 'Reading comment' }
  return (
    <>
      <PageHead title="Reported posts" intro="Posts members have flagged for a pastor to review. Hiding a post removes it for everyone except its author." />
      {rows === null ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>Nothing reported. Praise God!</Empty> : rows.map((r) => (
        <div className="p-card" key={r.id}>
          <div className="p-item-head"><h3>{label[r.item_table]}</h3><span className="p-meta">Reported by {name(r.reporter) || 'a member'}, {fmtDate(r.created_at)}</span></div>
          {r.reason && <Notice tone="warn">Reason: {r.reason}</Notice>}
          {r.item ? <p className="p-pre m-quoted">{r.item.title || r.item.body}{r.item.title && r.item.body ? `\n\n${r.item.body}` : ''}</p> : <p className="p-muted">This post was already deleted.</p>}
          {r.item && <div className="p-meta">Posted by {name(r.item.author || r.item.host) || 'a member'}{r.item.hidden ? ' · already hidden' : ''}</div>}
          <div className="p-row-actions">
            {r.item && !r.item.hidden && <button className="button button-primary" onClick={() => resolve(r, true)}>Hide post</button>}
            <button className="button button-secondary" onClick={() => resolve(r, false)}>It's fine, dismiss</button>
          </div>
        </div>
      ))}
    </>
  )
}
