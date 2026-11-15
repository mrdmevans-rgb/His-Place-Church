import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Circle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, useMe, useRows } from '../ui'
import { PassageLinks, Thread } from './shared'

export const STYLES = [
  ['verse_by_verse', 'Verse by verse'],
  ['topical', 'Topical'],
  ['doctrine', 'Doctrine and theology'],
  ['devotional', 'Short devotional'],
  ['overview', 'Book overview'],
]
export const styleLabel = (s) => STYLES.find(([v]) => v === s)?.[1] || s

// Only YouTube is embedded. Everything else opens on the ministry's own site.
export function youtubeEmbed(url) {
  try {
    const u = new URL(url)
    const list = u.searchParams.get('list')
    let id = ''
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1)
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.match(/\/(embed|live|shorts)\/([\w-]{11})/) || [])[2] || ''
    if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0${list ? `&list=${list}` : ''}`
    if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0`
  } catch { /* not a URL */ }
  return null
}
const siteName = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'their website' } }

export default function Library() {
  const { rows: series, loading, error } = useRows('study_series', { order: 'sort_order', ascending: true })
  const { rows: teachers } = useRows('teachers', { order: 'sort_order', ascending: true })
  const { rows: lessons } = useRows('study_lessons', { select: 'id, series_id', order: null })
  const { rows: done } = useRows('lesson_progress', { select: 'lesson_id', order: null })
  const me = useMe()
  const [q, setQ] = useState('')
  const [book, setBook] = useState('')
  const [style, setStyle] = useState('')
  const [teacher, setTeacher] = useState('')
  const tName = (id) => teachers.find((t) => t.id === id)?.name || ''
  const books = useMemo(() => [...new Set(series.map((s) => s.book).filter(Boolean))].sort(), [series])
  const doneSet = new Set(done.map((d) => d.lesson_id))
  const shown = series.filter((s) => (me.isPastoral ? true : s.status === 'published')
    && (!book || s.book === book) && (!style || s.style === style) && (!teacher || s.teacher_id === teacher)
    && (!q || `${s.title} ${s.book} ${s.description} ${tName(s.teacher_id)}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <PageHead title="Bible study library" intro="Video teaching from trusted, Bible-centered pastors, with a study guide for every lesson. Videos play from each ministry's own channel.">
        {me.isPastoral && <Link className="button button-secondary" to="/portal/library-manage">Manage the library</Link>}
      </PageHead>
      <details className="p-card m-howto">
        <summary>How to study a passage</summary>
        <ol>
          <li><strong>Pray first.</strong> Ask the Holy Spirit to open your eyes to His Word (Psalm 119:18).</li>
          <li><strong>Read it in context.</strong> Read the whole chapter, not just one verse. Who wrote it, to whom, and why? What was happening at the time?</li>
          <li><strong>Observe.</strong> Write down what it actually says before deciding what it means. Notice repeated words, commands, and promises.</li>
          <li><strong>Let Scripture explain Scripture.</strong> Look up cross references. A clear passage helps explain a harder one, and the Bible never contradicts itself.</li>
          <li><strong>Dig into the words.</strong> Use Study on Blue Letter Bible, then the Interlinear tool, to see the original Hebrew or Greek word and how it's used elsewhere.</li>
          <li><strong>Then check the teachers.</strong> Watch the lesson and read the commentary, but test what you hear by the Bible, like the Bereans did (Acts 17:11).</li>
          <li><strong>Apply it.</strong> Ask what it meant to them then, what never changes about God, and what it means for you this week.</li>
        </ol>
      </details>
      <div className="p-toolbar">
        <input className="p-search" type="search" placeholder="Search studies" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search studies" />
        <select className="p-select-small" value={book} onChange={(e) => setBook(e.target.value)} aria-label="Book of the Bible"><option value="">All books</option>{books.map((b) => <option key={b}>{b}</option>)}</select>
        <select className="p-select-small" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style"><option value="">All styles</option>{STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="p-select-small" value={teacher} onChange={(e) => setTeacher(e.target.value)} aria-label="Teacher"><option value="">All teachers</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      </div>
      <Notice tone="error">{error}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : shown.length === 0 ? <Empty>No studies match yet. Check back soon.</Empty> : (
        <div className="m-series-grid">
          {shown.map((s) => {
            const ls = lessons.filter((l) => l.series_id === s.id)
            const finished = ls.filter((l) => doneSet.has(l.id)).length
            return (
              <Link to={`/portal/study/${s.id}`} className="m-series-card" key={s.id}>
                <div className="m-series-top">
                  <span className="m-book">{s.book || 'Study'}</span>
                  {s.status === 'draft' && <Badge tone="warn">Draft</Badge>}
                </div>
                <h3>{s.title}</h3>
                <div className="p-meta">{[tName(s.teacher_id), styleLabel(s.style), `${ls.length} lesson${ls.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div>
                {s.description && <p>{s.description.length > 160 ? `${s.description.slice(0, 160)}...` : s.description}</p>}
                {ls.length > 0 && finished > 0 && (
                  <div className="m-progress" aria-label={`${finished} of ${ls.length} lessons done`}><span style={{ width: `${(finished / ls.length) * 100}%` }} /></div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

export function SeriesPage() {
  const { seriesId } = useParams()
  const { rows: [s], loading } = useRows('study_series', { order: null, filter: (q) => q.eq('id', seriesId), deps: [seriesId] })
  const { rows: lessons } = useRows('study_lessons', { order: 'position', ascending: true, filter: (q) => q.eq('series_id', seriesId), deps: [seriesId] })
  const { rows: teachers } = useRows('teachers', { order: null })
  const { rows: done } = useRows('lesson_progress', { select: 'lesson_id', order: null })
  const doneSet = new Set(done.map((d) => d.lesson_id))
  if (loading) return <p className="p-muted">Loading...</p>
  if (!s) return <Empty>That study isn't available. <Link to="/portal/study">Back to the library</Link></Empty>
  const t = teachers.find((x) => x.id === s.teacher_id)
  const next = lessons.find((l) => !doneSet.has(l.id))
  return (
    <>
      <Link to="/portal/study" className="m-back"><ChevronLeft size={16} /> Library</Link>
      <PageHead title={s.title} intro={[s.book, t?.name && `${t.name}${t.ministry ? `, ${t.ministry}` : ''}`, styleLabel(s.style)].filter(Boolean).join(' · ')}>
        {next && <Link className="button button-primary" to={`/portal/study/${s.id}/${next.id}`}>{doneSet.size && lessons.some((l) => doneSet.has(l.id)) ? 'Continue' : 'Start'} with lesson {next.position}</Link>}
      </PageHead>
      {s.description && <p className="m-lead">{s.description}</p>}
      {s.overview && (
        <div className="p-card">
          <h2 className="p-card-title">Study guide: how to use this series</h2>
          <p className="p-pre">{s.overview}</p>
          {s.resources?.length > 0 && <Resources list={s.resources} />}
        </div>
      )}
      <div className="p-card">
        <h2 className="p-card-title">Lessons</h2>
        {lessons.length === 0 ? <p className="p-muted">Lessons coming soon.</p> : (
          <ol className="m-lessons">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link to={`/portal/study/${s.id}/${l.id}`}>
                  {doneSet.has(l.id) ? <CheckCircle2 size={18} className="m-done" aria-label="Done" /> : <Circle size={18} className="m-todo" aria-label="Not done" />}
                  <span><strong>{l.position}. {l.title}</strong>{(l.scripture || l.minutes) && <small>{[l.scripture, l.minutes && `${l.minutes} min`].filter(Boolean).join(' · ')}</small>}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
      {s.source_url && <p className="p-muted">This series comes from <a href={s.source_url} target="_blank" rel="noopener noreferrer">{siteName(s.source_url)}</a>. All teaching belongs to the original ministry.</p>}
    </>
  )
}

function Resources({ list }) {
  return (
    <ul className="m-resources">
      {list.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.label} <ExternalLink size={12} /></a></li>)}
    </ul>
  )
}

function Questions({ title, intro, list }) {
  if (!list?.length) return null
  return (
    <div className="m-qs">
      <h3>{title}</h3>
      {intro && <p className="m-qs-intro">{intro}</p>}
      <ol>{list.map((x) => {
        // Questions can end with "(Find it: ...)" telling members where to dig.
        const m = x.match(/^(.*?)\s*\(Find it: (.*)\)\s*$/)
        return <li key={x}>{m ? <>{m[1]}<span className="m-find">Find it: {m[2]}</span></> : x}</li>
      })}</ol>
    </div>
  )
}

export function LessonPage() {
  const { seriesId, lessonId } = useParams()
  const me = useMe()
  const { rows: lessons } = useRows('study_lessons', { order: 'position', ascending: true, filter: (q) => q.eq('series_id', seriesId), deps: [seriesId] })
  const { rows: [s] } = useRows('study_series', { order: null, filter: (q) => q.eq('id', seriesId), deps: [seriesId] })
  const { rows: done, reload } = useRows('lesson_progress', { select: 'lesson_id', order: null, filter: (q) => q.eq('lesson_id', lessonId), deps: [lessonId] })
  const [err, setErr] = useState('')
  const i = lessons.findIndex((l) => l.id === lessonId)
  const l = lessons[i]
  if (!lessons.length) return <p className="p-muted">Loading...</p>
  if (!l) return <Empty>That lesson isn't available. <Link to={`/portal/study/${seriesId}`}>Back to the series</Link></Empty>
  const isDone = done.length > 0
  const embed = l.embed_ok && youtubeEmbed(l.video_url)
  const toggle = async () => {
    const { error } = isDone
      ? await supabase.from('lesson_progress').delete().eq('lesson_id', l.id).eq('user_id', me.profile.id)
      : await supabase.from('lesson_progress').insert({ lesson_id: l.id })
    if (error) setErr(friendlyError(error)); else reload()
  }
  const prev = lessons[i - 1]
  const next = lessons[i + 1]
  return (
    <>
      <Link to={`/portal/study/${seriesId}`} className="m-back"><ChevronLeft size={16} /> {s?.title || 'Series'}</Link>
      <PageHead title={`${l.position}. ${l.title}`} intro={l.scripture} />
      {embed ? (
        <div className="video-frame m-video">
          <iframe src={embed} title={l.title} loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : l.video_url ? (
        <div className="p-card m-watch">
          <p>This lesson plays on {siteName(l.video_url)}.</p>
          <a className="button button-primary" href={l.video_url} target="_blank" rel="noopener noreferrer">Watch on {siteName(l.video_url)} <ExternalLink size={14} /></a>
        </div>
      ) : null}
      {l.video_url && embed && <p className="p-small">Playing from YouTube. <a href={l.video_url} target="_blank" rel="noopener noreferrer">Open on YouTube</a></p>}
      <div className="m-lesson-bar">
        <button className={`button ${isDone ? 'button-secondary' : 'button-primary'}`} onClick={toggle}>{isDone ? <><CheckCircle2 size={16} /> Completed</> : 'Mark as done'}</button>
        <PassageLinks passage={l.scripture} />
      </div>
      {err && <span className="p-error-inline">{err}</span>}
      <div className="p-card m-guide">
        <h2 className="p-card-title">Study guide</h2>
        {l.summary && <p className="p-pre">{l.summary}</p>}
        <Questions title="Observe: what does the passage say?" list={l.observe} />
        <Questions title="Understand: what did it mean then?" list={l.understand} />
        <Questions title="Search the Scriptures" intro="Like the Bereans in Acts 17:11, check it against the whole Bible. Read each passage in its context and let Scripture explain Scripture. Bring what you find to the discussion or to Ask the Pastor." list={l.search} />
        <Questions title="Apply: what does it mean for me today?" list={l.apply} />
        {l.resources?.length > 0 && <><h3>Go deeper</h3><Resources list={l.resources} /></>}
        {!l.summary && !l.observe?.length && !l.understand?.length && !l.search?.length && !l.apply?.length && <p className="p-muted">The study guide for this lesson is coming soon.</p>}
      </div>
      <div className="p-card">
        <h2 className="p-card-title">Discussion</h2>
        <p className="p-muted">Share what stood out to you, or ask the group a question. Only His Place members can see this.</p>
        <Thread table="lesson_comments" fk="lesson_id" parentId={l.id} placeholder="Share a thought or question" />
      </div>
      <div className="m-pager">
        {prev ? <Link to={`/portal/study/${seriesId}/${prev.id}`}><ChevronLeft size={16} /> {prev.position}. {prev.title}</Link> : <span />}
        {next && <Link to={`/portal/study/${seriesId}/${next.id}`}>{next.position}. {next.title} <ChevronRight size={16} /></Link>}
      </div>
    </>
  )
}
