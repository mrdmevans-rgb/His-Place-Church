import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, friendlyError } from '../supabase'
import { Empty, Notice, PageHead, fmtDate, useMe, usePeople } from '../ui'
import { MemberAnswers, useCourse } from './Discipleship'

// Walk With Me: newer believers ask for a mentor; mature believers volunteer to walk with someone.
// Leaders pair them (Leader Portal > Discipleship paths).
export default function WalkWithMe() {
  const me = useMe()
  const { name } = usePeople()
  const { memberId } = useParams()
  const course = useCourse('rooted')
  const [mine, setMine] = useState(undefined)
  const [vol, setVol] = useState(undefined)
  const [walking, setWalking] = useState([])
  const [progress, setProgress] = useState({})
  const [note, setNote] = useState('')
  const [volNote, setVolNote] = useState('')
  const [msg, setMsg] = useState({ tone: 'success', text: '' })
  const load = async () => {
    const [{ data: r }, { data: v }, { data: w }, { data: a }] = await Promise.all([
      supabase.from('mentor_requests').select('*').eq('member_id', me.profile.id).neq('status', 'closed').maybeSingle(),
      supabase.from('mentor_volunteers').select('*').eq('profile_id', me.profile.id).maybeSingle(),
      supabase.from('mentor_requests').select('*').eq('mentor_id', me.profile.id).eq('status', 'paired'),
      supabase.from('disciple_assignments').select('member_id').eq('mentor_id', me.profile.id).eq('course', 'rooted'),
    ])
    setMine(r || null); setVol(v || null); setVolNote(v?.note || '')
    setWalking(w || [])
    const ids = (a || []).map((x) => x.member_id)
    if (ids.length) {
      const { data: work } = await supabase.from('disciple_work').select('member_id, done_at').eq('course', 'rooted').in('member_id', ids)
      const p = Object.fromEntries(ids.map((id) => [id, 0]))
      for (const x of work || []) if (x.done_at) p[x.member_id]++
      setProgress(p)
    } else setProgress({})
  }
  useEffect(() => { load() }, [me.profile.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (memberId) return <MemberAnswers memberId={memberId} course={course} backTo="/portal/walk-with-me" backLabel="Walk With Me" />
  if (mine === undefined || vol === undefined) return <p className="p-muted">Loading...</p>
  const ask = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('mentor_requests').insert({ note: note.trim() })
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: "Thank you! A leader will pair you with someone soon, and you'll get an email when they do." })
    if (!error) { setNote(''); load() }
  }
  const cancel = async () => { await supabase.from('mentor_requests').update({ status: 'closed' }).eq('id', mine.id); load() }
  const volunteer = async (on) => {
    const { error } = vol
      ? await supabase.from('mentor_volunteers').update({ active: on, note: volNote.trim() }).eq('profile_id', me.profile.id)
      : await supabase.from('mentor_volunteers').insert({ note: volNote.trim() })
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: on ? 'Thank you for being willing! A leader will reach out when someone needs you.' : "You're no longer on the volunteer list." })
    load()
  }
  const total = course?.lessons.length || 13
  return (
    <>
      <PageHead title="Walk With Me" intro="Nobody grows alone. Ask for someone who's followed Jesus a while to walk alongside you, or offer to walk with someone newer in the faith." />
      <Notice tone={msg.tone}>{msg.text}</Notice>

      <div className="p-card">
        <h2 className="p-card-title">I'd like someone to walk with me</h2>
        {mine?.status === 'paired' ? (
          <p><strong>{name(mine.mentor_id) || 'Your mentor'}</strong> is walking with you{mine.paired_at ? ` (since ${fmtDate(mine.paired_at)})` : ''}. Meet when you can, pray together, and open God's Word together. {course && <Link to="/portal/discipleship">Your Rooted path</Link>}</p>
        ) : mine?.status === 'waiting' ? (
          <>
            <p>You asked on {fmtDate(mine.created_at)}. A leader is finding the right person for you, and you'll get an email when you're paired.</p>
            <button className="p-link subtle" onClick={cancel}>Cancel my request</button>
          </>
        ) : (
          <form onSubmit={ask} className="p-form">
            <p>A mentor is a more mature believer who meets with you, prays with you, answers questions, and helps you grow. Many pairs work through Rooted together.</p>
            <div className="p-field">
              <label htmlFor="wm-note">Anything that would help us pick someone? (optional)</label>
              <textarea id="wm-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: new to faith, best times to meet, what you'd like help with" />
            </div>
            <div className="p-form-actions"><button className="button button-primary">Ask for a mentor</button></div>
          </form>
        )}
      </div>

      <div className="p-card">
        <h2 className="p-card-title">I'd like to walk with someone</h2>
        <p>Have you followed Jesus a while? Some of the deepest growth comes from helping someone else grow. You don't need all the answers. Love them, pray with them, and open the Word together.</p>
        <div className="p-field">
          <label htmlFor="wm-vol">When can you meet, or what should leaders know? (optional)</label>
          <input id="wm-vol" maxLength={500} value={volNote} onChange={(e) => setVolNote(e.target.value)} placeholder="For example: Tuesday evenings, happy to meet over coffee" />
        </div>
        <div className="p-form-actions">
          {vol?.active
            ? <><button className="button button-secondary" onClick={() => volunteer(true)}>Save</button><button className="p-link subtle" onClick={() => volunteer(false)}>Take me off the list</button><span className="p-small">You're on the volunteer list. Thank you!</span></>
            : <button className="button button-primary" onClick={() => volunteer(true)}>Count me in</button>}
        </div>
      </div>

      {walking.length > 0 && (
        <div className="p-card">
          <h2 className="p-card-title">People you're walking with</h2>
          <ul className="p-team-list">
            {walking.map((w) => (
              <li key={w.id}>
                <strong>{name(w.member_id) || 'A member'}</strong> <span className="p-meta">since {fmtDate(w.paired_at || w.created_at)}</span>
                {w.member_id in progress
                  ? <div className="p-small">Rooted: {progress[w.member_id]} of {total} sessions finished. <Link to={`/portal/walk-with-me/${w.member_id}`}>Read their answers</Link></div>
                  : <div className="p-small">Not working through Rooted yet. Ask a leader if you'd like to start it together.</div>}
              </li>
            ))}
          </ul>
          <p className="p-small">Tips: reach out every week, even with a short text. Ask how they're really doing, pray together, and read a passage together. If something comes up that's more than you can help with, bring in a pastor.</p>
        </div>
      )}
      {walking.length === 0 && !vol?.active && mine?.status !== 'paired' && <Empty>Walking with someone, or being walked with, is one of the best ways to grow. Pick whichever fits you above.</Empty>}
    </>
  )
}
