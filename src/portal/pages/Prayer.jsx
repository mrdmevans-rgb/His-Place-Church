import { useState } from 'react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, fmtDateTime, useMe, usePeople, useRows } from '../ui'

function PrayerCard({ p, praying, onChange }) {
  const me = useMe()
  const { name } = usePeople()
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [answering, setAnswering] = useState(false)
  const [answerNote, setAnswerNote] = useState('')
  const [err, setErr] = useState('')
  const { rows: comments, reload } = useRows('prayer_comments', { order: 'created_at', ascending: true, filter: (q) => q.eq('prayer_id', p.id), deps: [p.id, showComments] })
  const prayingIds = praying.filter((x) => x.prayer_id === p.id).map((x) => x.user_id)
  const iAmPraying = prayingIds.includes(me.profile.id)
  const mine = p.author === me.profile.id

  const togglePraying = async () => {
    const { error } = iAmPraying
      ? await supabase.from('prayer_praying').delete().eq('prayer_id', p.id).eq('user_id', me.profile.id)
      : await supabase.from('prayer_praying').insert({ prayer_id: p.id })
    if (error) setErr(friendlyError(error)); else onChange()
  }
  const addComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    const { error } = await supabase.from('prayer_comments').insert({ prayer_id: p.id, body: comment.trim() })
    if (error) return setErr(friendlyError(error))
    setComment('')
    reload()
  }
  const markAnswered = async () => {
    const { error } = await supabase.from('prayers').update({ answered: true, answered_note: answerNote }).eq('id', p.id)
    if (error) return setErr(friendlyError(error))
    setAnswering(false)
    onChange()
  }
  const remove = async () => {
    if (!window.confirm('Delete this prayer request?')) return
    const { error } = await supabase.from('prayers').delete().eq('id', p.id)
    if (error) setErr(friendlyError(error)); else onChange()
  }

  return (
    <div className={`p-card${p.answered ? ' p-answered' : ''}`}>
      <div className="p-item-head">
        <h3>{p.title}</h3>
        <span className="p-badges">
          {p.pastors_only && <Badge tone="info">Pastors only</Badge>}
          {p.answered && <Badge tone="success">Answered</Badge>}
        </span>
      </div>
      {p.body && <p className="p-pre">{p.body}</p>}
      {p.answered && p.answered_note && <Notice tone="success"><strong>Praise report: </strong>{p.answered_note}</Notice>}
      <div className="p-meta">{name(p.author)} · {fmtDateTime(p.created_at)}</div>
      <div className="p-row-actions">
        <button className={`button ${iAmPraying ? 'button-primary' : 'button-secondary'} p-pray-btn`} onClick={togglePraying} aria-pressed={iAmPraying}>
          {iAmPraying ? "I'm praying" : 'I will pray'}{prayingIds.length > 0 && ` (${prayingIds.length})`}
        </button>
        <button className="p-link" onClick={() => setShowComments(!showComments)}>{showComments ? 'Hide' : 'Encourage'}{comments.length ? ` (${comments.length})` : ''}</button>
        {(mine || me.isPastoral) && !p.answered && <button className="p-link" onClick={() => setAnswering(!answering)}>Mark answered</button>}
        {(mine || me.isAdmin) && <button className="p-link danger" onClick={remove}>Delete</button>}
      </div>
      {prayingIds.length > 0 && <div className="p-meta">Praying: {prayingIds.map(name).join(', ')}</div>}
      {answering && (
        <div className="p-inline-form">
          <input value={answerNote} onChange={(e) => setAnswerNote(e.target.value)} placeholder="Share how God answered (optional)" aria-label="Praise report" />
          <button className="button button-primary" onClick={markAnswered}>Save</button>
        </div>
      )}
      {showComments && (
        <div className="p-comments">
          {comments.map((c) => <div key={c.id} className="p-comment"><strong>{name(c.author)}</strong> <span className="p-meta">{fmtDateTime(c.created_at)}</span><p className="p-pre">{c.body}</p></div>)}
          <form className="p-comment-form" onSubmit={addComment}>
            <label className="sr-only" htmlFor={`pc-${p.id}`}>Encouragement</label>
            <input id={`pc-${p.id}`} value={comment} maxLength={4000} placeholder="Write an encouragement or a prayer" onChange={(e) => setComment(e.target.value)} />
            <button className="button button-secondary">Post</button>
          </form>
        </div>
      )}
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export default function Prayer() {
  const [view, setView] = useState('active')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const { rows, loading, error, reload } = useRows('prayers', { filter: (q) => q.eq('answered', view === 'answered'), deps: [view] })
  const { rows: praying, reload: reloadPraying } = useRows('prayer_praying', { order: 'created_at' })
  const refresh = () => { reload(); reloadPraying() }

  const create = async (v) => {
    const { error: err } = await supabase.from('prayers').insert({ title: v.title, body: v.body, pastors_only: !!v.pastors_only })
    if (err) return err
    setAdding(false)
    setMsg('Shared with the leaders. They are praying with you.')
    refresh()
    return null
  }

  return (
    <>
      <PageHead title="Leader prayer" intro="Share prayer needs privately with the other leaders. Only leaders, pastors, and admins can see this page.">
        {!adding && <button className="button button-primary" onClick={() => { setAdding(true); setMsg('') }}>Share a prayer need</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {adding && (
        <div className="p-card">
          <h2 className="p-card-title">Share a prayer need</h2>
          <Form
            fields={[
              { name: 'title', label: 'Prayer need', required: true, max: 200 },
              { name: 'body', label: 'More details (optional)', type: 'textarea', rows: 4 },
              { name: 'pastors_only', label: 'Share with pastors only', type: 'checkbox', help: 'For something more personal. Only pastors and admins will see it.' },
            ]}
            onSubmit={create}
            onCancel={() => setAdding(false)}
            submitLabel="Share"
          />
        </div>
      )}
      <div className="p-toolbar">
        <button className={`chip${view === 'active' ? ' active' : ''}`} onClick={() => setView('active')}>Current needs</button>
        <button className={`chip${view === 'answered' ? ' active' : ''}`} onClick={() => setView('answered')}>Answered prayers</button>
      </div>
      <Notice tone="error">{error}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>{view === 'active' ? 'No prayer needs right now.' : 'No answered prayers recorded yet.'}</Empty> : (
        <div className="p-list">{rows.map((p) => <PrayerCard key={p.id} p={p} praying={praying} onChange={refresh} />)}</div>
      )}
    </>
  )
}
