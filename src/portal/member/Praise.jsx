import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, today, useMe, usePeople } from '../ui'
import { HideButton, Reactions, ReportButton, Thread } from './shared'

// Praise reports: members share what God has done. Pastors can pick ones to read on Sunday.
function ShareForm({ onDone, onCancel, fromPrayer }) {
  const me = useMe()
  const [mine, setMine] = useState([])
  const [v, setV] = useState({ title: '', body: fromPrayer?.answered_note || '', prayer_id: fromPrayer?.id || '', ok_to_share: false })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.from('member_prayers').select('id, title, answered_note').eq('author', me.profile.id).eq('answered', true).order('created_at', { ascending: false })
      .then(({ data }) => setMine(data || []))
  }, [me.profile.id])
  const submit = async (e) => {
    e.preventDefault()
    if (!v.title.trim()) return setErr('Give it a short title.')
    setBusy(true)
    const { error } = await supabase.from('praise_reports').insert({ title: v.title.trim(), body: v.body.trim(), prayer_id: v.prayer_id || null, ok_to_share: v.ok_to_share })
    setBusy(false)
    if (error) return setErr(friendlyError(error))
    onDone()
  }
  return (
    <form className="p-card p-form" onSubmit={submit}>
      <h2 className="p-card-title">Share what God has done</h2>
      <div className="p-field">
        <label htmlFor="pr-title">In a few words <span aria-hidden="true">*</span></label>
        <input id="pr-title" maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder={fromPrayer ? `God answered: ${fromPrayer.title}` : 'For example: My surgery went well'} />
      </div>
      <div className="p-field">
        <label htmlFor="pr-body">Tell the story</label>
        <textarea id="pr-body" rows={5} maxLength={4000} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="What happened, and how did you see God in it?" />
      </div>
      {mine.length > 0 && (
        <div className="p-field">
          <label htmlFor="pr-prayer">Is this an answer to one of your prayer requests? (optional)</label>
          <select id="pr-prayer" value={v.prayer_id} onChange={(e) => setV({ ...v, prayer_id: e.target.value })}>
            <option value="">No</option>
            {mine.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      )}
      <label className="p-check"><input type="checkbox" checked={v.ok_to_share} onChange={(e) => setV({ ...v, ok_to_share: e.target.checked })} /><span>It's OK for a pastor to share this on Sunday<small>Only if you're comfortable. Members can always read it here.</small></span></label>
      {err && <span className="p-error-inline">{err}</span>}
      <div className="p-form-actions">
        <button className="button button-primary" disabled={busy}>{busy ? 'Sharing...' : 'Share'}</button>
        <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function PraiseCard({ r, reactions, onChange, onReact }) {
  const me = useMe()
  const { name } = usePeople()
  const [open, setOpen] = useState(false)
  const mine = r.author === me.profile.id
  const markShared = async () => { await supabase.from('praise_reports').update({ shared_on: r.shared_on ? null : today() }).eq('id', r.id); onChange() }
  return (
    <div className={`p-card m-praise${r.hidden ? ' m-hidden' : ''}`} id={`praise-${r.id}`}>
      <div className="p-item-head">
        <h3>{r.title}</h3>
        <span className="p-badges">
          {r.prayer_id && <Badge tone="success">Answered prayer</Badge>}
          {me.isPastoral && r.ok_to_share && !r.shared_on && <Badge tone="info">OK to share Sunday</Badge>}
          {r.shared_on && <Badge>Shared on {fmtDate(r.shared_on)}</Badge>}
          {r.hidden && <Badge tone="danger">Hidden</Badge>}
        </span>
      </div>
      <div className="p-meta">{mine ? 'You' : name(r.author) || 'A member'}, {fmtDate(r.created_at)}</div>
      {r.body && <p className="p-pre">{r.body}</p>}
      <Reactions table="praise_reports" c={r} mine={me.profile.id} list={reactions} onChange={onReact} />
      <div className="m-actions">
        <button className="p-link" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide comments' : 'Celebrate with them'}</button>
        {me.isPastoral && <button className="p-link" onClick={markShared}>{r.shared_on ? 'Not shared yet' : 'Mark shared on Sunday'}</button>}
        {!mine && <ReportButton table="praise_reports" id={r.id} />}
        <HideButton table="praise_reports" row={r} onChange={onChange} />
        {(mine || me.isPastoral) && <button className="p-link subtle" onClick={async () => { if (window.confirm('Delete this praise report?')) { await supabase.from('praise_reports').delete().eq('id', r.id); onChange() } }}>Delete</button>}
      </div>
      {open && <Thread table="praise_comments" fk="report_id" parentId={r.id} placeholder="Praise God with them" max={2000} />}
    </div>
  )
}

export default function Praise() {
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState(null)
  const [reactions, setReactions] = useState([])
  const [view, setView] = useState('all')
  const [sharing, setSharing] = useState(false)
  const [fromPrayer, setFromPrayer] = useState(null)
  const [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('praise_reports').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    const ids = (data || []).map((r) => r.id)
    if (ids.length) setReactions((await supabase.from('comment_reactions').select('item_id, user_id, kind').eq('item_table', 'praise_reports').in('item_id', ids)).data || [])
  }
  const reloadReactions = async () => {
    const ids = (rows || []).map((r) => r.id)
    if (ids.length) setReactions((await supabase.from('comment_reactions').select('item_id, user_id, kind').eq('item_table', 'praise_reports').in('item_id', ids)).data || [])
  }
  useEffect(() => { load() }, [])
  // Coming from "Share it as a praise report" on an answered prayer.
  useEffect(() => {
    const pid = params.get('prayer')
    if (!pid) return
    supabase.from('member_prayers').select('id, title, answered_note').eq('id', pid).eq('author', me.profile.id).maybeSingle()
      .then(({ data }) => { setFromPrayer(data || null); setSharing(true); setParams({}, { replace: true }) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <p className="p-muted">Loading...</p>
  const shown = view === 'sunday' ? rows.filter((r) => r.ok_to_share && !r.shared_on) : rows
  return (
    <>
      <PageHead title="Praise reports" intro="Answered prayers, healings, baptisms, new jobs, quiet faithfulness. Share what God has done so we can rejoice with you.">
        {!sharing && <button className="button button-primary" onClick={() => { setSharing(true); setMsg('') }}>Share a praise report</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {sharing && <ShareForm fromPrayer={fromPrayer} onCancel={() => { setSharing(false); setFromPrayer(null) }} onDone={() => { setSharing(false); setFromPrayer(null); setMsg('Thank you for sharing! Your church family will rejoice with you.'); load() }} />}
      {me.isPastoral && (
        <div className="p-toolbar">
          <button className={`chip${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}>All</button>
          <button className={`chip${view === 'sunday' ? ' active' : ''}`} onClick={() => setView('sunday')}>For Sunday ({rows.filter((r) => r.ok_to_share && !r.shared_on).length})</button>
        </div>
      )}
      {shown.length === 0 ? <Empty>{view === 'sunday' ? 'No praise reports are waiting to be shared on Sunday.' : 'No praise reports yet. Has God answered a prayer or done something you want to celebrate? Be the first to share.'}</Empty>
        : <div className="p-list">{shown.map((r) => <PraiseCard key={r.id} r={r} reactions={reactions.filter((x) => x.item_id === r.id)} onChange={load} onReact={reloadReactions} />)}</div>}
    </>
  )
}
