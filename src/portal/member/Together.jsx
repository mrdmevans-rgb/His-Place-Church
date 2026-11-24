import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HandHeart, PartyPopper, UserPlus } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Notice, useMe, usePortal } from '../ui'

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'friend'

// "Say welcome": members who joined the portal in the last 21 days, until you've welcomed them.
export function NewMembers() {
  const [people, setPeople] = useState(null)
  const [open, setOpen] = useState('')
  const [text, setText] = useState('')
  const [sent, setSent] = useState({})
  const [err, setErr] = useState('')
  useEffect(() => { supabase.rpc('new_members').then(({ data }) => setPeople(data || [])) }, [])
  if (!people) return null
  const waiting = people.filter((p) => !p.welcomed || sent[p.id])
  if (!waiting.length) return null
  const start = (p) => { setOpen(p.id); setErr(''); setText(`Welcome, ${firstName(p.full_name)}! We're so glad you're here.`) }
  const send = async (p) => {
    const { error } = await supabase.from('member_welcomes').insert({ to_id: p.id, message: text.trim().slice(0, 500) })
    if (error) return setErr(friendlyError(error))
    setSent({ ...sent, [p.id]: true }); setOpen('')
  }
  return (
    <div className="p-card m-welcome">
      <h2 className="p-card-title"><PartyPopper size={18} aria-hidden="true" /> New to the portal</h2>
      <p className="p-small">A quick hello from church family goes a long way.</p>
      <ul className="m-welcome-list">
        {waiting.slice(0, 6).map((p) => (
          <li key={p.id}>
            <div className="m-welcome-row">
              <span><strong>{p.full_name}</strong>{p.welcome_count + (sent[p.id] && !p.welcomed ? 1 : 0) > 0 && <span className="p-meta"> · welcomed by {p.welcome_count + (sent[p.id] && !p.welcomed ? 1 : 0)}</span>}</span>
              {sent[p.id] ? <span className="m-welcome-done">Welcome sent</span>
                : open !== p.id && <button type="button" className="button button-secondary" onClick={() => start(p)}>Say welcome</button>}
            </div>
            {open === p.id && (
              <form className="m-welcome-form" onSubmit={(e) => { e.preventDefault(); send(p) }}>
                <label className="sr-only" htmlFor={`welcome-${p.id}`}>Your welcome to {p.full_name}</label>
                <input id={`welcome-${p.id}`} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
                <button className="button button-primary" type="submit">Send</button>
                <button className="p-link" type="button" onClick={() => setOpen('')}>Cancel</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <Notice tone="error">{err}</Notice>
    </div>
  )
}

// "Pray for one person today": one member who said yes, a different one each day.
export function PrayForOne() {
  const me = useMe()
  const { reloadProfile } = usePortal()
  const [pick, setPick] = useState(undefined)
  const [prayed, setPrayed] = useState(false)
  const [listed, setListed] = useState(!!me.profile.pray_listed)
  const [err, setErr] = useState('')
  useEffect(() => {
    supabase.rpc('prayer_pick').then(({ data }) => { const p = (data || [])[0] || null; setPick(p); setPrayed(!!p?.prayed) })
  }, [])
  if (pick === undefined) return null
  const tap = async () => {
    setErr('')
    const next = !prayed
    setPrayed(next) // feels instant; undone below if it fails
    const { error } = next
      ? await supabase.from('member_prayed_name').insert({ for_id: pick.id })
      : await supabase.from('member_prayed_name').delete().eq('for_id', pick.id).eq('by_id', me.profile.id).eq('day', easternToday())
    if (error) { setPrayed(!next); setErr(friendlyError(error)) }
  }
  const setList = async (on) => {
    setErr('')
    const { error } = await supabase.from('profiles').update({ pray_listed: on }).eq('id', me.profile.id)
    if (error) return setErr(friendlyError(error))
    setListed(on); reloadProfile()
  }
  const optIn = listed
    ? <p className="p-small m-pray-opt">You're on the list, so others can pray for you by name. <button type="button" className="p-link" onClick={() => setList(false)}>Take me off</button></p>
    : <p className="p-small m-pray-opt">Want your church family to pray for you by name? <button type="button" className="p-link" onClick={() => setList(true)}>Add me to the list</button></p>
  return (
    <div className="p-card m-pray-one">
      <h2 className="p-card-title"><HandHeart size={18} aria-hidden="true" /> Pray for one person today</h2>
      {pick ? (
        <>
          <p className="m-pray-name">{pick.full_name}</p>
          <p className="p-small">Take a minute and pray for {firstName(pick.full_name)} by name. Ask God to bless them, strengthen them, and draw them closer to Jesus this week.</p>
          <button type="button" className={`button ${prayed ? 'button-secondary' : 'button-primary'}`} aria-pressed={prayed} onClick={tap}>
            {prayed ? `You prayed for ${firstName(pick.full_name)} today` : 'I prayed'}
          </button>
          {prayed && <p className="p-small">{firstName(pick.full_name)} will see that you prayed for them. Tap again if you meant to undo it.</p>}
        </>
      ) : <p className="p-small">No one has added their name yet. Be the first, and someone will pray for you by name.</p>}
      {optIn}
      <Notice tone="error">{err}</Notice>
    </div>
  )
}

const easternToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

// A small nudge on the home page to invite someone.
export function InviteNudge() {
  return (
    <div className="p-card m-invite-nudge">
      <UserPlus size={20} aria-hidden="true" />
      <span>Know someone from church who isn't on here yet? <Link to="/portal/invite">Invite them</Link></span>
    </div>
  )
}
