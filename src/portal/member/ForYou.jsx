import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../supabase'
import { fmtDateTime, useMe, usePeople, usePortal } from '../ui'
import { REACTION_WORDS } from './shared'

// "For you": who replied to or appreciated what you shared lately.
// Each notice can be hidden with its X, or the whole list cleared. Hiding only tidies
// your own list; the reply or reaction itself stays where it was posted.
const keyOf = (i) => `${i.what}|${i.actor}|${i.comment_id}|${i.at}`

export default function ForYou() {
  const me = useMe()
  const { name } = usePeople()
  const { reloadProfile } = usePortal()
  const [items, setItems] = useState(null)
  const [hidden, setHidden] = useState(() => new Set(me.profile.activity_hidden || []))
  const [undo, setUndo] = useState(null) // what to put back if they tap Undo
  const load = () => supabase.rpc('my_activity').then(({ data }) => setItems(data || []))
  useEffect(() => { load() }, [])

  const save = async (fields) => {
    await supabase.from('profiles').update(fields).eq('id', me.profile.id)
    reloadProfile()
  }
  const hideOne = (i) => {
    const next = new Set(hidden); next.add(keyOf(i))
    setHidden(next)
    // Only keep keys for notices still in the list, so the saved list stays small.
    const live = new Set((items || []).map(keyOf))
    save({ activity_hidden: [...next].filter((k) => live.has(k)).slice(-200) })
  }
  const clearAll = async () => {
    const before = { activity_cleared_at: me.profile.activity_cleared_at ?? null, activity_seen_at: me.profile.activity_seen_at ?? null, activity_hidden: [...hidden] }
    const now = new Date().toISOString()
    setUndo(before)
    setItems([])
    setHidden(new Set())
    await save({ activity_cleared_at: now, activity_seen_at: now, activity_hidden: [] })
  }
  const undoClear = async () => {
    const before = undo
    setUndo(null)
    setHidden(new Set(before.activity_hidden))
    await save(before)
    load()
  }

  if (undo) {
    return (
      <div className="p-card m-foryou">
        <h2 className="p-card-title">For you</h2>
        <p className="p-small">Cleared. New replies and reactions will show up here. <button type="button" className="p-link" onClick={undoClear}>Undo</button></p>
      </div>
    )
  }
  const visible = (items || []).filter((i) => !hidden.has(keyOf(i)))
  if (!visible.length) return null
  const seen = me.profile.activity_seen_at ? new Date(me.profile.activity_seen_at) : null
  const isNew = (i) => !seen || new Date(i.at) > seen
  const fresh = visible.filter(isNew)
  const shown = (fresh.length ? fresh : visible).slice(0, 8)
  const markSeen = () => save({ activity_seen_at: new Date().toISOString() })
  const quote = (t) => `"${t.length > 80 ? `${t.slice(0, 80).trim()}...` : t}"`
  return (
    <div className="p-card m-foryou">
      <h2 className="p-card-title">For you{fresh.length > 0 && <span className="m-foryou-n">{fresh.length} new</span>}</h2>
      {!fresh.length && <p className="p-small">Nothing new since you last looked. Here's what people said recently.</p>}
      <ul className="m-foryou-list">
        {shown.map((i) => (
          <li key={keyOf(i)} className={isNew(i) ? 'new' : ''}>
            <div className="m-foryou-text">
              <Link to={i.link}>
                <strong>{name(i.actor) || 'A member'}</strong>{' '}
                {i.what === 'welcome' ? <>welcomed you to the portal{i.reply_text && <>: <em>{i.reply_text}</em></>}</>
                  : i.what === 'prayed_name' ? <>prayed for you by name</>
                  : i.what === 'reply' ? <>replied to your comment {quote(i.my_text)}: <em>{i.reply_text}</em></>
                  : <>{REACTION_WORDS[i.what] || 'appreciated'} your comment {quote(i.my_text)}</>}
              </Link>
              <span className="p-meta"> {fmtDateTime(i.at)}</span>
            </div>
            <button type="button" className="m-foryou-hide" onClick={() => hideOne(i)} aria-label="Hide this notice" title="Hide this notice"><X size={16} aria-hidden="true" /></button>
          </li>
        ))}
      </ul>
      <div className="m-foryou-actions">
        {fresh.length > 0 && <button type="button" className="p-link" onClick={markSeen}>Mark all as seen</button>}
        <button type="button" className="p-link" onClick={clearAll}>Clear all</button>
      </div>
    </div>
  )
}
