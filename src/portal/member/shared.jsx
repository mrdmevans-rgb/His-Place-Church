import { useEffect, useState } from 'react'
import { Flag, EyeOff, Eye, Heart, HandHeart, Reply, Smile, ThumbsUp } from 'lucide-react'
import { supabase, friendlyError, notify } from '../supabase'
import { fmtDateTime, useMe, usePeople, useRows } from '../ui'

// Open a passage in the NASB 1995 on Bible Gateway, or study it on Blue Letter Bible.
export const gatewayUrl = (passage) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage)}&version=NASB1995`
export const blbUrl = (passage) => `https://www.blueletterbible.org/search/preSearch.cfm?Criteria=${encodeURIComponent(passage)}&t=NASB95`

export function PassageLinks({ passage }) {
  if (!passage) return null
  return (
    <span className="m-passage-links">
      <a href={gatewayUrl(passage)} target="_blank" rel="noopener noreferrer">Read {passage}</a>
      <a href={blbUrl(passage)} target="_blank" rel="noopener noreferrer">Study on Blue Letter Bible</a>
    </span>
  )
}

export function ReportButton({ table, id }) {
  const [done, setDone] = useState(false)
  const report = async () => {
    const reason = window.prompt('Let a pastor know what concerns you about this post (optional):', '')
    if (reason === null) return
    const { error } = await supabase.from('content_reports').insert({ item_table: table, item_id: id, reason })
    if (!error) { setDone(true); notify('report') } // email the pastors
  }
  return done
    ? <span className="p-small">Reported. A pastor will look at it.</span>
    : <button className="p-link subtle" onClick={report} title="Report this post to a pastor"><Flag size={13} /> Report</button>
}

export function HideButton({ table, row, onChange }) {
  const me = useMe()
  if (!me.isPastoral) return null
  const toggle = async () => {
    if (!row.hidden && !window.confirm('Hide this post from members? The author will still see it.')) return
    const { error } = await supabase.from(table).update({ hidden: !row.hidden }).eq('id', row.id)
    if (error) window.alert(friendlyError(error)); else onChange()
  }
  return <button className="p-link subtle" onClick={toggle}>{row.hidden ? <><Eye size={13} /> Show</> : <><EyeOff size={13} /> Hide</>}</button>
}

// Ways to acknowledge a comment.
export const REACTIONS = [
  ['amen', 'Amen', ThumbsUp],
  ['love', 'Love this', Heart],
  ['thanks', 'Thank you', Smile],
  ['praying', 'Praying', HandHeart],
]
export const REACTION_WORDS = { amen: 'said Amen to', love: 'loved', thanks: 'thanked you for', praying: 'is praying about' }

// "Mary", "Mary and Joe", "Mary, Joe, and Ann", "Mary, Joe, and 3 others"
export const nameList = (names) => names.length <= 1 ? (names[0] || '')
  : names.length === 2 ? `${names[0]} and ${names[1]}`
  : names.length === 3 ? `${names[0]}, ${names[1]}, and ${names[2]}`
  : `${names[0]}, ${names[1]}, and ${names.length - 2} others`

function Reactions({ table, c, mine, list, onChange }) {
  const { name } = usePeople()
  const [busy, setBusy] = useState(false)
  const react = async (kind, on) => {
    setBusy(true)
    if (on) await supabase.from('comment_reactions').delete().eq('item_table', table).eq('item_id', c.id).eq('user_id', mine).eq('kind', kind)
    else await supabase.from('comment_reactions').insert({ item_table: table, item_id: c.id, kind })
    await onChange()
    setBusy(false)
  }
  const own = c.author === mine
  const people = [...new Set(list.map((r) => r.user_id))].map((id) => (id === mine ? 'You' : name(id) || 'A member'))
  return (
    <>
      <div className="m-react" role="group" aria-label="Acknowledge this comment">
        {REACTIONS.map(([kind, label, Icon]) => {
          const who = list.filter((r) => r.kind === kind)
          const on = who.some((r) => r.user_id === mine)
          if (own && !who.length) return null
          return (
            <button key={kind} type="button" className={`m-react-btn${on ? ' on' : ''}`} disabled={own || busy} aria-pressed={on}
              title={who.length ? who.map((r) => (r.user_id === mine ? 'You' : name(r.user_id))).join(', ') : label}
              onClick={() => react(kind, on)}>
              <Icon size={14} aria-hidden="true" /> <span>{label}</span>{who.length > 0 && <span className="m-react-n">{who.length}</span>}
            </button>
          )
        })}
      </div>
      {people.length > 0 && <div className="p-small m-react-who">Appreciated by {nameList(people)}</div>}
    </>
  )
}

// A discussion under any item: comments, replies, and reactions.
export function Thread({ table, fk, parentId, placeholder = 'Add a comment', max = 3000 }) {
  const me = useMe()
  const { name } = usePeople()
  const { rows, reload } = useRows(table, { order: 'created_at', ascending: true, filter: (q) => q.eq(fk, parentId), deps: [parentId] })
  const [reactions, setReactions] = useState([])
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [reply, setReply] = useState('')
  const [err, setErr] = useState('')
  const ids = rows.map((c) => c.id).join(',')
  const loadReactions = async () => {
    if (!ids) return setReactions([])
    const { data } = await supabase.from('comment_reactions').select('item_id, user_id, kind').eq('item_table', table).in('item_id', ids.split(','))
    setReactions(data || [])
  }
  useEffect(() => { loadReactions() }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  const send = async (text, parent) => {
    const { error } = await supabase.from(table).insert({ [fk]: parentId, body: text.trim(), ...(parent ? { parent_id: parent } : {}) })
    if (error) { setErr(friendlyError(error)); return false }
    setErr(''); reload(); return true
  }
  const post = async (e) => {
    e.preventDefault()
    if (body.trim() && await send(body)) setBody('')
  }
  const postReply = async (e, parent) => {
    e.preventDefault()
    if (reply.trim() && await send(reply, parent)) { setReply(''); setReplyTo(null) }
  }
  const remove = async (c) => {
    if (!window.confirm(rows.some((r) => r.parent_id === c.id) ? 'Delete this comment and its replies?' : 'Delete this comment?')) return
    await supabase.from(table).delete().eq('id', c.id)
    reload()
  }
  const top = rows.filter((c) => !c.parent_id || !rows.some((r) => r.id === c.parent_id))
  const repliesTo = (id) => rows.filter((r) => r.parent_id === id)
  const Comment = ({ c, isReply, threadId }) => (
    <div className={`p-comment${isReply ? ' m-reply' : ''}${c.hidden ? ' m-hidden' : ''}`} id={`c-${c.id}`}>
      <strong>{c.author === me.profile.id ? 'You' : name(c.author) || 'A member'}</strong> <span className="p-meta">{fmtDateTime(c.created_at)}</span>
      {c.hidden && <span className="p-small"> (hidden from members)</span>}
      <p className="p-pre">{c.body}</p>
      <Reactions table={table} c={c} mine={me.profile.id} list={reactions.filter((r) => r.item_id === c.id)} onChange={loadReactions} />
      <div className="m-actions">
        <button type="button" className="p-link subtle" onClick={() => { setReplyTo(replyTo === threadId ? null : threadId); setReply(isReply && c.author !== me.profile.id ? `${(name(c.author) || '').split(' ')[0]}, ` : '') }}><Reply size={13} aria-hidden="true" /> Reply</button>
        {c.author !== me.profile.id && <ReportButton table={table} id={c.id} />}
        <HideButton table={table} row={c} onChange={reload} />
        {(c.author === me.profile.id || me.isPastoral) && <button className="p-link subtle" onClick={() => remove(c)}>Delete</button>}
      </div>
    </div>
  )
  return (
    <div className="p-comments">
      {top.map((c) => (
        <div key={c.id} className="m-thread">
          <Comment c={c} threadId={c.id} />
          {repliesTo(c.id).map((r) => <Comment key={r.id} c={r} isReply threadId={c.id} />)}
          {replyTo === c.id && (
            <form className="p-comment-form m-reply-form" onSubmit={(e) => postReply(e, c.id)}>
              <label className="sr-only" htmlFor={`r-${c.id}`}>Reply to {name(c.author) || 'this comment'}</label>
              <input id={`r-${c.id}`} autoFocus value={reply} maxLength={max} placeholder={`Reply to ${c.author === me.profile.id ? 'this' : (name(c.author) || 'them').split(' ')[0]}`} onChange={(e) => setReply(e.target.value)} />
              <button className="button button-secondary">Reply</button>
              <button type="button" className="p-link subtle" onClick={() => setReplyTo(null)}>Cancel</button>
            </form>
          )}
        </div>
      ))}
      <form className="p-comment-form" onSubmit={post}>
        <label className="sr-only" htmlFor={`t-${table}-${parentId}`}>{placeholder}</label>
        <input id={`t-${table}-${parentId}`} value={body} maxLength={max} placeholder={placeholder} onChange={(e) => setBody(e.target.value)} />
        <button className="button button-secondary">Post</button>
      </form>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

// Lines of text <-> list. Resources use "Label | https://link" per line.
export const toLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : '')
export const fromLines = (text) => (text || '').split('\n').map((s) => s.trim()).filter(Boolean)
export const resourcesToText = (arr) => (Array.isArray(arr) ? arr.map((r) => `${r.label} | ${r.url}`).join('\n') : '')
export const textToResources = (text) => fromLines(text).map((line) => {
  const [label, url] = line.split('|').map((x) => x.trim())
  return url ? { label, url } : { label: label.replace(/^https?:\/\//, ''), url: label }
}).filter((r) => /^https?:\/\//.test(r.url))
