import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { fmtDateTime, useMe, usePeople, usePortal } from '../ui'
import { REACTION_WORDS } from './shared'

// "For you": who replied to or appreciated what you shared lately.
export default function ForYou() {
  const me = useMe()
  const { name } = usePeople()
  const { reloadProfile } = usePortal()
  const [items, setItems] = useState(null)
  useEffect(() => { supabase.rpc('my_activity').then(({ data }) => setItems(data || [])) }, [])
  if (!items || !items.length) return null
  const seen = me.profile.activity_seen_at ? new Date(me.profile.activity_seen_at) : null
  const fresh = items.filter((i) => !seen || new Date(i.at) > seen)
  const shown = (fresh.length ? fresh : items).slice(0, 8)
  const markSeen = async () => {
    await supabase.from('profiles').update({ activity_seen_at: new Date().toISOString() }).eq('id', me.profile.id)
    reloadProfile()
  }
  const quote = (t) => `"${t.length > 80 ? `${t.slice(0, 80).trim()}...` : t}"`
  return (
    <div className="p-card m-foryou">
      <h2 className="p-card-title">For you{fresh.length > 0 && <span className="m-foryou-n">{fresh.length} new</span>}</h2>
      {!fresh.length && <p className="p-small">Nothing new since you last looked. Here's what people said recently.</p>}
      <ul className="m-foryou-list">
        {shown.map((i) => (
          <li key={`${i.what}-${i.actor}-${i.comment_id}-${i.at}`} className={!seen || new Date(i.at) > seen ? 'new' : ''}>
            <Link to={i.link}>
              <strong>{name(i.actor) || 'A member'}</strong>{' '}
              {i.what === 'reply' ? <>replied to your comment {quote(i.my_text)}: <em>{i.reply_text}</em></> : <>{REACTION_WORDS[i.what] || 'appreciated'} your comment {quote(i.my_text)}</>}
            </Link>
            <span className="p-meta"> {fmtDateTime(i.at)}</span>
          </li>
        ))}
      </ul>
      {fresh.length > 0 && <button type="button" className="p-link" onClick={markSeen}>Mark all as seen</button>}
    </div>
  )
}
