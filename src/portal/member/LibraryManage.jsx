import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, useRows } from '../ui'
import { STYLES, styleLabel, youtubeEmbed } from './Library'
import { fromLines, resourcesToText, textToResources, toLines } from './shared'

const guideHelp = 'One question per line. To point members to the answer, end a question with (Find it: verse 6, or the video).'
const resHelp = 'One per line: Label | https://link'

function Teachers() {
  const { rows, reload } = useRows('teachers', { order: 'sort_order', ascending: true })
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const fields = [
    { name: 'name', label: 'Teacher', required: true, half: true },
    { name: 'ministry', label: 'Ministry', half: true, placeholder: 'For example: Enduring Word' },
    { name: 'website', label: 'Official website', type: 'url', half: true },
    { name: 'sort_order', label: 'Order', type: 'number', half: true, default: 100 },
    { name: 'about', label: 'About (shown to members)', type: 'textarea', rows: 2 },
  ]
  const save = async (v) => {
    const payload = { name: v.name, ministry: v.ministry, website: v.website, about: v.about, sort_order: v.sort_order ?? 100 }
    const { error } = editing === 'new' ? await supabase.from('teachers').insert(payload) : await supabase.from('teachers').update(payload).eq('id', editing.id)
    if (error) return error
    setEditing(null); setMsg('Saved.'); reload(); return null
  }
  return (
    <div className="p-card">
      <div className="p-item-head"><h2 className="p-card-title">Teachers</h2>{editing !== 'new' && <button className="button button-secondary" onClick={() => setEditing('new')}>Add a teacher</button>}</div>
      <Notice tone="success">{msg}</Notice>
      {editing && <Form fields={fields} initial={editing === 'new' ? {} : editing} onSubmit={save} onCancel={() => setEditing(null)} />}
      <ul className="p-team-list">{rows.map((t) => <li key={t.id}><strong>{t.name}</strong>{t.ministry && `, ${t.ministry}`} <button className="p-link" onClick={() => setEditing(t)}>Edit</button></li>)}</ul>
    </div>
  )
}

function LessonEditor({ series, onClose }) {
  const { rows, reload } = useRows('study_lessons', { order: 'position', ascending: true, filter: (q) => q.eq('series_id', series.id), deps: [series.id] })
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const fields = [
    { name: 'position', label: 'Lesson number', type: 'number', half: true, min: 1 },
    { name: 'title', label: 'Lesson title', required: true, half: true },
    { name: 'scripture', label: 'Scripture', half: true, placeholder: 'Romans 1:1-17' },
    { name: 'minutes', label: 'Length (minutes)', type: 'number', half: true, min: 1 },
    { name: 'video_url', label: 'Video link (from the official channel)', type: 'url', help: 'YouTube links play on our site. Other links open on the ministry\'s site.' },
    { name: 'embed_ok', label: 'Play this video on our site (uncheck if the ministry does not allow embedding)', type: 'checkbox' },
    { name: 'summary', label: 'Lesson summary', type: 'textarea', rows: 3 },
    { name: 'observe', label: 'Observe questions', type: 'textarea', rows: 3, help: guideHelp },
    { name: 'understand', label: 'Understand questions', type: 'textarea', rows: 3, help: guideHelp },
    { name: 'search', label: 'Search the Scriptures questions', type: 'textarea', rows: 3, help: 'Cross references to compare, especially where Bible teachers differ. ' + guideHelp },
    { name: 'apply', label: 'Apply questions', type: 'textarea', rows: 3, help: guideHelp },
    { name: 'resources', label: 'Go deeper links', type: 'textarea', rows: 3, help: resHelp },
  ]
  const toForm = (l) => ({ ...l, observe: toLines(l.observe), understand: toLines(l.understand), search: toLines(l.search), apply: toLines(l.apply), resources: resourcesToText(l.resources) })
  const save = async (v) => {
    const payload = {
      series_id: series.id, position: v.position || (rows.length + 1), title: v.title, scripture: v.scripture, minutes: v.minutes || null,
      video_url: v.video_url, embed_ok: !!v.embed_ok, summary: v.summary,
      observe: fromLines(v.observe), understand: fromLines(v.understand), search: fromLines(v.search), apply: fromLines(v.apply), resources: textToResources(v.resources),
    }
    const { error } = editing === 'new' ? await supabase.from('study_lessons').insert(payload) : await supabase.from('study_lessons').update(payload).eq('id', editing.id)
    if (error) return error
    setEditing(null); setMsg('Lesson saved.'); reload(); return null
  }
  const move = async (i, dir) => {
    const a = rows[i]; const b = rows[i + dir]
    if (!b) return
    await supabase.from('study_lessons').update({ position: b.position }).eq('id', a.id)
    await supabase.from('study_lessons').update({ position: a.position }).eq('id', b.id)
    reload()
  }
  const remove = async (l) => {
    if (!window.confirm(`Delete lesson "${l.title}"?`)) return
    const { error } = await supabase.from('study_lessons').delete().eq('id', l.id)
    setMsg(error ? friendlyError(error) : 'Deleted.'); reload()
  }
  return (
    <div className="p-card m-lesson-editor">
      <div className="p-item-head"><h3>Lessons in "{series.title}"</h3><button className="p-link" onClick={onClose}>Close</button></div>
      <Notice tone="success">{msg}</Notice>
      {editing ? (
        <Form key={editing === 'new' ? 'new' : editing.id} fields={fields} initial={editing === 'new' ? { position: rows.length + 1, embed_ok: true } : toForm(editing)} onSubmit={save} onCancel={() => setEditing(null)} submitLabel="Save lesson" />
      ) : <button className="button button-secondary" onClick={() => { setEditing('new'); setMsg('') }}>Add a lesson</button>}
      <ol className="m-lessons manage">
        {rows.map((l, i) => (
          <li key={l.id}>
            <span><strong>{l.position}. {l.title}</strong><small>{[l.scripture, l.video_url ? (youtubeEmbed(l.video_url) && l.embed_ok ? 'plays on our site' : 'opens on ministry site') : 'no video yet', l.observe?.length || l.apply?.length ? 'guide written' : 'no guide yet'].filter(Boolean).join(' · ')}</small></span>
            <span className="p-run-actions">
              <button onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
              <button onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
              <button className="p-link" onClick={() => setEditing(l)}>Edit</button>
              <button className="p-link danger" onClick={() => remove(l)}>Delete</button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function LibraryManage() {
  const { rows, reload } = useRows('study_series', { order: 'sort_order', ascending: true })
  const { rows: teachers } = useRows('teachers', { order: 'sort_order', ascending: true })
  const [editing, setEditing] = useState(null)
  const [lessonsFor, setLessonsFor] = useState(null)
  const [msg, setMsg] = useState('')
  const fields = [
    { name: 'title', label: 'Series title', required: true },
    { name: 'teacher_id', label: 'Teacher', type: 'select', options: teachers.map((t) => [t.id, t.name]), half: true },
    { name: 'book', label: 'Book of the Bible (or topic)', half: true, placeholder: 'Romans' },
    { name: 'style', label: 'Style', type: 'select', required: true, default: 'verse_by_verse', options: STYLES, half: true },
    { name: 'sort_order', label: 'Order in library', type: 'number', half: true, default: 100 },
    { name: 'description', label: 'Short description', type: 'textarea', rows: 2 },
    { name: 'overview', label: 'Study guide overview (how to use this series)', type: 'textarea', rows: 4 },
    { name: 'source_url', label: 'Official source (playlist or ministry page)', type: 'url' },
    { name: 'resources', label: 'Series resources', type: 'textarea', rows: 3, help: resHelp },
  ]
  const save = async (v) => {
    const payload = { title: v.title, teacher_id: v.teacher_id || null, book: v.book, style: v.style, sort_order: v.sort_order ?? 100, description: v.description, overview: v.overview, source_url: v.source_url, resources: textToResources(v.resources) }
    const { error } = editing === 'new' ? await supabase.from('study_series').insert(payload) : await supabase.from('study_series').update(payload).eq('id', editing.id)
    if (error) return error
    setEditing(null); setMsg('Series saved. It stays a draft until you publish it.'); reload(); return null
  }
  const publish = async (s, status) => {
    const { error } = await supabase.from('study_series').update({ status }).eq('id', s.id)
    setMsg(error ? friendlyError(error) : status === 'published' ? `"${s.title}" is now in the member library.` : `"${s.title}" is back to draft.`); reload()
  }
  const remove = async (s) => {
    if (!window.confirm(`Delete the series "${s.title}" and all its lessons?`)) return
    const { error } = await supabase.from('study_series').delete().eq('id', s.id)
    setMsg(error ? friendlyError(error) : 'Deleted.'); reload()
  }
  return (
    <>
      <PageHead title="Manage the library" intro="Add series from trusted teachers, write study guides, and publish when ready. Drafts are visible only to pastors and admins.">
        <Link className="button button-secondary" to="/portal/study">View as members see it</Link>
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      <Teachers />
      <div className="p-card">
        <div className="p-item-head"><h2 className="p-card-title">Series</h2>{!editing && <button className="button button-primary" onClick={() => { setEditing('new'); setMsg('') }}>Add a series</button>}</div>
        {editing && <Form key={editing === 'new' ? 'new' : editing.id} fields={fields} initial={editing === 'new' ? {} : { ...editing, resources: resourcesToText(editing.resources) }} onSubmit={save} onCancel={() => setEditing(null)} submitLabel="Save series" />}
      </div>
      {rows.length === 0 ? <Empty>No series yet.</Empty> : (
        <div className="p-list">
          {rows.map((s) => (
            <div className="p-card" key={s.id}>
              <div className="p-item-head">
                <h3>{s.title}</h3>
                <Badge tone={s.status === 'published' ? 'success' : 'warn'}>{s.status === 'published' ? 'Published' : 'Draft'}</Badge>
              </div>
              <div className="p-meta">{[teachers.find((t) => t.id === s.teacher_id)?.name, s.book, styleLabel(s.style)].filter(Boolean).join(' · ')}</div>
              <div className="p-row-actions">
                <button className="p-link" onClick={() => setLessonsFor(lessonsFor === s.id ? null : s.id)}>{lessonsFor === s.id ? 'Hide lessons' : 'Lessons and study guides'}</button>
                <button className="p-link" onClick={() => { setEditing(s); window.scrollTo(0, 0) }}>Edit details</button>
                <Link className="p-link" to={`/portal/study/${s.id}`}>Preview</Link>
                {s.status === 'draft'
                  ? <button className="button button-primary" onClick={() => publish(s, 'published')}>Publish to members</button>
                  : <button className="button button-secondary" onClick={() => publish(s, 'draft')}>Unpublish</button>}
                <button className="p-link danger" onClick={() => remove(s)}>Delete</button>
              </div>
              {lessonsFor === s.id && <LessonEditor series={s} onClose={() => setLessonsFor(null)} />}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
