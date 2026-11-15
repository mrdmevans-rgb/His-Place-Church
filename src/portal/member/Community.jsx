import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cake, Heart, Users as UsersIcon } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, fmtDate, fmtDateTime, today, useMe, usePeople, useRows } from '../ui'
import { HideButton, PassageLinks, ReportButton, Thread } from './shared'
import { squareJpeg } from '../pages/Account'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ======================= Prayer wall ======================= */
function PrayerCard({ p, praying, onChange }) {
  const me = useMe()
  const { name } = usePeople()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [answering, setAnswering] = useState(false)
  const ids = praying.filter((x) => x.prayer_id === p.id).map((x) => x.user_id)
  const mine = p.author === me.profile.id
  const iPray = ids.includes(me.profile.id)
  const toggle = async () => {
    const { error } = iPray
      ? await supabase.from('member_praying').delete().eq('prayer_id', p.id).eq('user_id', me.profile.id)
      : await supabase.from('member_praying').insert({ prayer_id: p.id })
    if (!error) onChange()
  }
  const answered = async () => {
    await supabase.from('member_prayers').update({ answered: true, answered_note: note }).eq('id', p.id)
    setAnswering(false); onChange()
  }
  const remove = async () => {
    if (!window.confirm('Delete this prayer request?')) return
    await supabase.from('member_prayers').delete().eq('id', p.id); onChange()
  }
  return (
    <div className={`p-card${p.answered ? ' p-answered' : ''}${p.hidden ? ' m-hidden' : ''}`}>
      <div className="p-item-head">
        <h3>{p.title}</h3>
        <span className="p-badges">{p.pastors_only && <Badge tone="info">Pastors only</Badge>}{p.answered && <Badge tone="success">Answered</Badge>}{p.hidden && <Badge tone="danger">Hidden</Badge>}</span>
      </div>
      {p.body && <p className="p-pre">{p.body}</p>}
      {p.answered && p.answered_note && <Notice tone="success"><strong>Praise report: </strong>{p.answered_note}</Notice>}
      <div className="p-meta">{name(p.author) || 'A member'} · {fmtDateTime(p.created_at)}</div>
      <div className="p-row-actions">
        {!p.pastors_only && <button className={`button ${iPray ? 'button-primary' : 'button-secondary'} p-pray-btn`} onClick={toggle} aria-pressed={iPray}><Heart size={14} /> {iPray ? "I'm praying" : 'I will pray'}{ids.length > 0 && ` (${ids.length})`}</button>}
        {!p.pastors_only && <button className="p-link" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Encourage'}</button>}
        {(mine || me.isPastoral) && !p.answered && <button className="p-link" onClick={() => setAnswering(!answering)}>Mark answered</button>}
        {!mine && <ReportButton table="member_prayers" id={p.id} />}
        <HideButton table="member_prayers" row={p} onChange={onChange} />
        {(mine || me.isPastoral) && <button className="p-link subtle" onClick={remove}>Delete</button>}
      </div>
      {answering && <div className="p-inline-form"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did God answer? (optional)" aria-label="Praise report" /><button className="button button-primary" onClick={answered}>Save</button></div>}
      {open && <Thread table="member_prayer_comments" fk="prayer_id" parentId={p.id} placeholder="Write an encouragement or a prayer" max={2000} />}
    </div>
  )
}

export function MemberPrayer() {
  const [view, setView] = useState('active')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const { rows, loading, reload } = useRows('member_prayers', { filter: (q) => q.eq('answered', view === 'answered'), deps: [view] })
  const { rows: praying, reload: rp } = useRows('member_praying', { order: 'created_at' })
  const refresh = () => { reload(); rp() }
  const create = async (v) => {
    const { error } = await supabase.from('member_prayers').insert({ title: v.title, body: v.body, pastors_only: !!v.pastors_only })
    if (error) return error
    setAdding(false); setMsg(v.pastors_only ? 'Sent to the pastors. They are praying for you.' : 'Shared. Your church family is praying with you.'); refresh(); return null
  }
  return (
    <>
      <PageHead title="Prayer wall" intro="Share prayer needs with your His Place family, and pray for one another. Only members can see this.">
        {!adding && <button className="button button-primary" onClick={() => { setAdding(true); setMsg('') }}>Share a prayer need</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {adding && <div className="p-card"><Form fields={[
        { name: 'title', label: 'Prayer need', required: true, max: 200 },
        { name: 'body', label: 'More details (optional)', type: 'textarea', rows: 3, max: 4000 },
        { name: 'pastors_only', label: 'Send to the pastors only', type: 'checkbox', help: 'For something private. Only pastors will see it.' },
      ]} onSubmit={create} onCancel={() => setAdding(false)} submitLabel="Share" /></div>}
      <div className="p-toolbar">
        <button className={`chip${view === 'active' ? ' active' : ''}`} onClick={() => setView('active')}>Current needs</button>
        <button className={`chip${view === 'answered' ? ' active' : ''}`} onClick={() => setView('answered')}>Answered prayers</button>
      </div>
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>{view === 'active' ? 'No prayer needs right now.' : 'No praise reports yet.'}</Empty>
        : <div className="p-list">{rows.map((p) => <PrayerCard key={p.id} p={p} praying={praying} onChange={refresh} />)}</div>}
    </>
  )
}

/* ======================= Directory ======================= */
function MyListing({ onSaved }) {
  const me = useMe()
  const [d, setD] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const load = async () => {
    const { data } = await supabase.from('member_directory').select('*').eq('profile_id', me.profile.id).maybeSingle()
    setD(data || { listed: false, household: '', about: '', show_phone: false, show_email: false, photo_path: null, birthday_month: null, birthday_day: null, anniversary_month: null, anniversary_day: null, share_celebrations: false })
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (d === undefined) return null
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const save = async (e) => {
    e?.preventDefault()
    setBusy(true)
    const { profile_id: _p, updated_at: _u, ...rest } = d
    const { error } = await supabase.from('member_directory').upsert({ ...rest, profile_id: me.profile.id })
    setBusy(false)
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: 'Saved.' })
    onSaved()
  }
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const blob = await squareJpeg(file, 500)
      const path = `members/${me.profile.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('team-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      if (d.photo_path) await supabase.storage.from('team-photos').remove([d.photo_path])
      setD((x) => ({ ...x, photo_path: path }))
      const { profile_id: _p, updated_at: _u, ...rest } = d
      await supabase.from('member_directory').upsert({ ...rest, photo_path: path, profile_id: me.profile.id })
      setMsg({ tone: 'success', text: 'Photo saved.' }); onSaved()
    } catch (err) { setMsg({ tone: 'error', text: friendlyError(err) }) }
    setBusy(false)
  }
  const photo = d.photo_path ? supabase.storage.from('team-photos').getPublicUrl(d.photo_path).data.publicUrl : null
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  return (
    <form className="p-card p-form" onSubmit={save}>
      <h2 className="p-card-title">My directory listing</h2>
      <p className="p-muted">Only His Place members can see the directory. You decide what to share. Nothing shows until you turn on "List me in the directory."</p>
      <label className="p-check"><input type="checkbox" checked={d.listed} onChange={(e) => set('listed', e.target.checked)} /><span><strong>List me in the directory</strong></span></label>
      <div className="p-bio-edit">
        <div className="p-bio-photo">
          {photo ? <img src={photo} alt="" /> : <div className="p-bio-nophoto">No photo</div>}
          <label className="button button-secondary">{busy ? 'Working...' : photo ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} /></label>
        </div>
        <div className="p-form-grid">
          <div className="p-field"><label htmlFor="dir-house">Household (optional)</label><input id="dir-house" maxLength={200} value={d.household} onChange={(e) => set('household', e.target.value)} placeholder="For example: John, Mary, and the kids" /><small>Please don't include children's ages or schools.</small></div>
          <div className="p-field"><label htmlFor="dir-about">A little about you (optional)</label><textarea id="dir-about" rows={2} maxLength={600} value={d.about} onChange={(e) => set('about', e.target.value)} /></div>
          <label className="p-check"><input type="checkbox" checked={d.show_phone} onChange={(e) => set('show_phone', e.target.checked)} /><span>Show my phone number{me.profile.phone ? ` (${me.profile.phone})` : ' (add one under My account)'}</span></label>
          <label className="p-check"><input type="checkbox" checked={d.show_email} onChange={(e) => set('show_email', e.target.checked)} /><span>Show my email</span></label>
        </div>
      </div>
      <h3 className="p-sub">Celebrations</h3>
      <div className="p-inline-form">
        <label>Birthday <select value={d.birthday_month || ''} onChange={(e) => set('birthday_month', e.target.value ? Number(e.target.value) : null)} aria-label="Birthday month"><option value="">Month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <select value={d.birthday_day || ''} onChange={(e) => set('birthday_day', e.target.value ? Number(e.target.value) : null)} aria-label="Birthday day"><option value="">Day</option>{days.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Anniversary <select value={d.anniversary_month || ''} onChange={(e) => set('anniversary_month', e.target.value ? Number(e.target.value) : null)} aria-label="Anniversary month"><option value="">Month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <select value={d.anniversary_day || ''} onChange={(e) => set('anniversary_day', e.target.value ? Number(e.target.value) : null)} aria-label="Anniversary day"><option value="">Day</option>{days.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <label className="p-check"><input type="checkbox" checked={d.share_celebrations} onChange={(e) => set('share_celebrations', e.target.checked)} /><span>Let members celebrate with me (shows the month and day only, never the year)</span></label>
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
      <div className="p-form-actions"><button className="button button-primary" disabled={busy}>Save my listing</button></div>
    </form>
  )
}

export function Celebrations({ compact = false }) {
  const [list, setList] = useState([])
  useEffect(() => { supabase.rpc('celebrations').then(({ data }) => setList(data || [])) }, [])
  const now = new Date()
  const m = now.getMonth() + 1
  const thisMonth = list.filter((c) => c.month === m).sort((a, b) => a.day - b.day)
  if (compact && !thisMonth.length) return null
  return (
    <div className="p-card">
      <h2 className="p-card-title"><Cake size={18} className="icon-red" /> Celebrating in {MONTHS[m - 1]}</h2>
      {thisMonth.length === 0 ? <p className="p-muted">No birthdays or anniversaries shared for this month yet.</p> : (
        <ul className="p-team-list">{thisMonth.map((c) => <li key={c.id + c.kind}><strong>{MONTHS[m - 1]} {c.day}</strong> · {c.full_name}'s {c.kind}{c.day === now.getDate() ? ' (today!)' : ''}</li>)}</ul>
      )}
    </div>
  )
}

export function Directory() {
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  const load = () => supabase.rpc('directory_list').then(({ data }) => setPeople(data || []))
  useEffect(() => { load() }, [])
  const shown = (people || []).filter((p) => !q || `${p.full_name} ${p.household}`.toLowerCase().includes(q.toLowerCase()))
  const photo = (p) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)
  return (
    <>
      <PageHead title="Member directory" intro="Get to know your church family. Members choose what they share." />
      <Celebrations />
      <div className="p-toolbar"><input className="p-search" type="search" placeholder="Search names" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search names" /></div>
      {people === null ? <p className="p-muted">Loading...</p> : shown.length === 0 ? <Empty>No one is listed yet. Be the first by filling out your listing below.</Empty> : (
        <div className="m-dir-grid">
          {shown.map((p) => (
            <div className="m-dir-card" key={p.id}>
              {photo(p.photo_path) ? <img src={photo(p.photo_path)} alt="" loading="lazy" /> : <div className="m-dir-initials" aria-hidden="true">{p.full_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</div>}
              <div>
                <h3>{p.full_name}</h3>
                {p.household && <div className="p-meta">{p.household}</div>}
                {p.about && <p className="p-small">{p.about}</p>}
                {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}>{p.phone}</a>}
                {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
              </div>
            </div>
          ))}
        </div>
      )}
      <MyListing onSaved={load} />
    </>
  )
}

/* ======================= Care calendar ======================= */
function CarePage({ c, onChange }) {
  const me = useMe()
  const { name } = usePeople()
  const { rows: slots, reload } = useRows('care_slots', { order: 'slot_date', ascending: true, filter: (q) => q.eq('care_id', c.id), deps: [c.id] })
  const [add, setAdd] = useState({ slot_date: '', label: 'Dinner' })
  const [err, setErr] = useState('')
  const manager = me.isPastoral || c.created_by === me.profile.id
  const claim = async (s, mine) => {
    const note = mine ? '' : (window.prompt('Anything the family should know? (what you are bringing, time)', '') ?? null)
    if (note === null) return
    const { error } = await supabase.from('care_slots').update({ taken_by: mine ? null : me.profile.id, note: note || '' }).eq('id', s.id)
    if (error) setErr(friendlyError(error)); else reload()
  }
  const addSlot = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('care_slots').insert({ care_id: c.id, ...add })
    if (error) return setErr(friendlyError(error))
    setAdd({ ...add, slot_date: '' }); reload()
  }
  const close = async () => { await supabase.from('care_pages').update({ status: c.status === 'open' ? 'closed' : 'open' }).eq('id', c.id); onChange() }
  return (
    <div className="p-card">
      <div className="p-item-head"><h3>{c.title}</h3>{c.status === 'closed' && <Badge>Finished</Badge>}</div>
      {c.details && <p className="p-pre">{c.details}</p>}
      {c.drop_off && <p className="p-pre"><strong>Drop off: </strong>{c.drop_off}</p>}
      <div className="p-meta">Organized by {name(c.created_by)}</div>
      <ul className="m-slots">
        {slots.map((s) => {
          const mine = s.taken_by === me.profile.id
          return (
            <li key={s.id} className={s.taken_by ? 'taken' : ''}>
              <span><strong>{fmtDate(s.slot_date)}</strong> · {s.label}</span>
              <span>{s.taken_by ? <>{name(s.taken_by) || 'Taken'}{s.note && <small> · {s.note}</small>}</> : <em>Open</em>}</span>
              {c.status === 'open' && (!s.taken_by || mine) && <button className={`button ${mine ? 'button-secondary' : 'button-primary'}`} onClick={() => claim(s, mine)}>{mine ? "I can't anymore" : 'I can help'}</button>}
              {manager && <button className="p-link subtle" onClick={async () => { await supabase.from('care_slots').delete().eq('id', s.id); reload() }}>Remove</button>}
            </li>
          )
        })}
      </ul>
      {manager && c.status === 'open' && (
        <form className="p-inline-form" onSubmit={addSlot}>
          <input type="date" required min={today()} value={add.slot_date} onChange={(e) => setAdd({ ...add, slot_date: e.target.value })} aria-label="Date" />
          <input value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} aria-label="What is needed" placeholder="Dinner, ride, childcare" />
          <button className="button button-secondary">Add a date</button>
        </form>
      )}
      {manager && <button className="p-link" onClick={close}>{c.status === 'open' ? 'Mark finished' : 'Reopen'}</button>}
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export function Care() {
  const me = useMe()
  const [adding, setAdding] = useState(false)
  const { rows, reload } = useRows('care_pages', { order: 'created_at' })
  const create = async (v) => {
    const { error } = await supabase.from('care_pages').insert({ title: v.title, details: v.details, drop_off: v.drop_off })
    if (error) return error
    setAdding(false); reload(); return null
  }
  const open = rows.filter((c) => c.status === 'open')
  const closed = rows.filter((c) => c.status === 'closed')
  return (
    <>
      <PageHead title="Care calendar" intro="When a family has a new baby, surgery, or loss, sign up to bring a meal or help.">
        {me.isStaff && !adding && <button className="button button-primary" onClick={() => setAdding(true)}>Start a care calendar</button>}
      </PageHead>
      {!me.isStaff && <p className="p-muted">Know a family who could use help? <Link to="/portal/ask">Let the pastor know</Link> and a leader will set one up.</p>}
      {adding && <div className="p-card"><Form fields={[
        { name: 'title', label: 'Title', required: true, placeholder: 'Meals for the Smith family' },
        { name: 'details', label: 'What is happening and what helps', type: 'textarea', rows: 3, help: 'Include allergies or preferences. Share only what the family is comfortable with.' },
        { name: 'drop_off', label: 'Drop-off instructions', help: 'Address or meeting spot, and best times. Only members can see this.' },
      ]} onSubmit={create} onCancel={() => setAdding(false)} submitLabel="Create" /></div>}
      {open.length === 0 ? <Empty>No families need meals right now.</Empty> : <div className="p-list">{open.map((c) => <CarePage key={c.id} c={c} onChange={reload} />)}</div>}
      {closed.length > 0 && <details className="m-older"><summary>Finished care calendars ({closed.length})</summary><div className="p-list">{closed.map((c) => <CarePage key={c.id} c={c} onChange={reload} />)}</div></details>}
    </>
  )
}

/* ======================= Help board ======================= */
export function HelpBoard() {
  const me = useMe()
  const { name } = usePeople()
  const [kind, setKind] = useState('all')
  const [adding, setAdding] = useState(null)
  const [openId, setOpenId] = useState(null)
  const { rows, reload } = useRows('help_posts', { filter: (q) => { let x = q.eq('status', 'open'); if (kind !== 'all') x = x.eq('kind', kind); return x }, deps: [kind] })
  const create = async (v) => {
    const { error } = await supabase.from('help_posts').insert({ kind: adding, title: v.title, body: v.body })
    if (error) return error
    setAdding(null); reload(); return null
  }
  return (
    <>
      <PageHead title="Help board" intro="Need a ride, an extra pair of hands, or have something to give away? Ask and offer here. Bearing one another's burdens.">
        {!adding && <><button className="button button-primary" onClick={() => setAdding('need')}>I need help</button><button className="button button-secondary" onClick={() => setAdding('offer')}>I can offer</button></>}
      </PageHead>
      {adding && <div className="p-card"><h2 className="p-card-title">{adding === 'need' ? 'Ask for help' : 'Offer something'}</h2><Form fields={[
        { name: 'title', label: adding === 'need' ? 'What do you need?' : 'What can you offer?', required: true, placeholder: adding === 'need' ? 'Ride to church Sunday from Amelia' : 'Free crib, good condition' },
        { name: 'body', label: 'Details', type: 'textarea', rows: 3, help: "Don't post your home address here. Share it privately with the person who replies." },
      ]} onSubmit={create} onCancel={() => setAdding(null)} submitLabel="Post" /></div>}
      <div className="p-toolbar">{[['all', 'Everything'], ['need', 'Needs'], ['offer', 'Offers']].map(([v, l]) => <button key={v} className={`chip${kind === v ? ' active' : ''}`} onClick={() => setKind(v)}>{l}</button>)}</div>
      {rows.length === 0 ? <Empty>Nothing posted right now.</Empty> : (
        <div className="p-list">{rows.map((h) => (
          <div className={`p-card${h.hidden ? ' m-hidden' : ''}`} key={h.id}>
            <div className="p-item-head"><h3>{h.title}</h3><Badge tone={h.kind === 'need' ? 'warn' : 'success'}>{h.kind === 'need' ? 'Need' : 'Offer'}</Badge></div>
            {h.body && <p className="p-pre">{h.body}</p>}
            <div className="p-meta">{name(h.author) || 'A member'} · {fmtDate(h.created_at)}</div>
            <div className="p-row-actions">
              <button className="p-link" onClick={() => setOpenId(openId === h.id ? null : h.id)}>{openId === h.id ? 'Hide replies' : 'Reply'}</button>
              {h.author === me.profile.id && <button className="p-link" onClick={async () => { await supabase.from('help_posts').update({ status: 'done' }).eq('id', h.id); reload() }}>{h.kind === 'need' ? 'My need is met' : 'No longer available'}</button>}
              {h.author !== me.profile.id && <ReportButton table="help_posts" id={h.id} />}
              <HideButton table="help_posts" row={h} onChange={reload} />
            </div>
            {openId === h.id && <Thread table="help_replies" fk="post_id" parentId={h.id} placeholder="Offer to help or ask a question" max={1000} />}
          </div>
        ))}</div>
      )}
    </>
  )
}

/* ======================= Gatherings ======================= */
export function Gatherings() {
  const me = useMe()
  const { name } = usePeople()
  const [adding, setAdding] = useState(false)
  const { rows, reload } = useRows('gatherings', { order: 'starts_at', ascending: true, filter: (q) => q.gte('starts_at', new Date(Date.now() - 4 * 3600e3).toISOString()) })
  const { rows: rsvps, reload: rr } = useRows('gathering_rsvps', { order: null })
  const refresh = () => { reload(); rr() }
  const create = async (v) => {
    const { error } = await supabase.from('gatherings').insert({ title: v.title, starts_at: v.starts_at, location: v.location, details: v.details, bring: v.bring, capacity: v.capacity || null })
    if (error) return error
    setAdding(false); refresh(); return null
  }
  const answer = async (g, a) => {
    const guests = a === 'yes' ? Number(window.prompt('How many people are coming besides you? (0 if just you)', '0') ?? 0) || 0 : 0
    await supabase.from('gathering_rsvps').upsert({ gathering_id: g.id, user_id: me.profile.id, answer: a, guests: Math.min(20, Math.max(0, guests)) })
    rr()
  }
  return (
    <>
      <PageHead title="Gatherings" intro="Potlucks, park days, game nights, and dinners in each other's homes. Anyone can host. Life together happens between Sundays too.">
        {!adding && <button className="button button-primary" onClick={() => setAdding(true)}>Host a gathering</button>}
      </PageHead>
      {adding && <div className="p-card"><Form fields={[
        { name: 'title', label: 'What is it?', required: true, placeholder: 'Potluck and game night' },
        { name: 'starts_at', label: 'When?', type: 'datetime', required: true, half: true },
        { name: 'capacity', label: 'Room for how many? (optional)', type: 'number', min: 1, half: true },
        { name: 'location', label: 'Where?', help: 'Only members can see this. For a home, you can say "address shared with those who RSVP" instead.' },
        { name: 'bring', label: 'What to bring (optional)' },
        { name: 'details', label: 'Details', type: 'textarea', rows: 3 },
      ]} onSubmit={create} onCancel={() => setAdding(false)} submitLabel="Post gathering" /></div>}
      {rows.length === 0 ? <Empty>Nothing planned yet. Why not host something?</Empty> : (
        <div className="p-list">{rows.map((g) => {
          const list = rsvps.filter((r) => r.gathering_id === g.id)
          const yes = list.filter((r) => r.answer === 'yes')
          const count = yes.reduce((n, r) => n + 1 + r.guests, 0)
          const mine = list.find((r) => r.user_id === me.profile.id)
          const full = g.capacity && count >= g.capacity && mine?.answer !== 'yes'
          return (
            <div className={`p-card${g.hidden ? ' m-hidden' : ''}`} key={g.id}>
              <div className="p-item-head"><h3>{g.title}</h3><Badge tone="info"><UsersIcon size={12} /> {count} going{g.capacity ? ` of ${g.capacity}` : ''}</Badge></div>
              <div className="p-meta strong">{fmtDateTime(g.starts_at)}{g.location && ` · ${g.location}`}</div>
              {g.details && <p className="p-pre">{g.details}</p>}
              {g.bring && <p className="p-pre"><strong>Bring: </strong>{g.bring}</p>}
              <div className="p-meta">Hosted by {name(g.host) || 'a member'}{yes.length > 0 && ` · Going: ${yes.map((r) => name(r.user_id)).filter(Boolean).join(', ')}`}</div>
              <div className="p-row-actions">
                {['yes', 'maybe', 'no'].map((a) => <button key={a} disabled={a === 'yes' && full} className={`chip${mine?.answer === a ? ' active' : ''}`} onClick={() => answer(g, a)}>{a === 'yes' ? (full ? 'Full' : "I'm going") : a === 'maybe' ? 'Maybe' : "Can't make it"}</button>)}
                {g.host !== me.profile.id && <ReportButton table="gatherings" id={g.id} />}
                <HideButton table="gatherings" row={g} onChange={refresh} />
                {(g.host === me.profile.id || me.isPastoral) && <button className="p-link subtle" onClick={async () => { if (window.confirm('Cancel this gathering?')) { await supabase.from('gatherings').delete().eq('id', g.id); refresh() } }}>Cancel gathering</button>}
              </div>
            </div>
          )
        })}</div>
      )}
    </>
  )
}

/* ======================= Weekly reading ======================= */
const mondayOf = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10) }

export function Reading() {
  const me = useMe()
  const { name } = usePeople()
  const { rows, reload } = useRows('reading_weeks', { order: 'week_of' })
  const { rows: done, reload: rd } = useRows('reading_done', { order: null })
  const [adding, setAdding] = useState(false)
  const current = rows.find((w) => w.week_of <= today()) || null
  const upcoming = rows.filter((w) => w.week_of > today()).reverse()
  const past = rows.filter((w) => current && w.week_of < current.week_of)
  const create = async (v) => {
    const { error } = await supabase.from('reading_weeks').insert({ week_of: v.week_of, passage: v.passage, note: v.note, question: v.question })
    if (error) return /duplicate/.test(error.message) ? 'That week already has a reading.' : error
    setAdding(false); reload(); return null
  }
  const Week = ({ w, big }) => {
    const readers = done.filter((x) => x.week_id === w.id)
    const iDid = readers.some((x) => x.user_id === me.profile.id)
    const toggle = async () => {
      if (iDid) await supabase.from('reading_done').delete().eq('week_id', w.id).eq('user_id', me.profile.id)
      else await supabase.from('reading_done').insert({ week_id: w.id })
      rd()
    }
    return (
      <div className="p-card">
        <div className="p-item-head"><h3>{big ? 'This week: ' : `Week of ${fmtDate(w.week_of)}: `}{w.passage}</h3><Badge tone="info">{readers.length} read it</Badge></div>
        {w.note && <p className="p-pre">{w.note}</p>}
        {w.question && <Notice tone="info"><strong>Think about: </strong>{w.question}</Notice>}
        <div className="m-lesson-bar">
          <button className={`button ${iDid ? 'button-secondary' : 'button-primary'}`} onClick={toggle}>{iDid ? "I've read it" : 'Mark as read'}</button>
          <PassageLinks passage={w.passage} />
        </div>
        {readers.length > 0 && <div className="p-meta">Read by {readers.map((r) => name(r.user_id)).filter(Boolean).join(', ')}</div>}
        {big && <><h4 className="p-sub">What stood out to you?</h4><Thread table="reading_comments" fk="week_id" parentId={w.id} placeholder="Share what stood out to you" /></>}
      </div>
    )
  }
  return (
    <>
      <PageHead title="Read together" intro="One passage a week, read by the whole church. Read it, mark it done, and share what God showed you.">
        {me.isStaff && !adding && <button className="button button-secondary" onClick={() => setAdding(true)}>Plan a week</button>}
      </PageHead>
      {adding && <div className="p-card"><Form fields={[
        { name: 'week_of', label: 'Week starting (Monday)', type: 'date', required: true, default: mondayOf(), half: true },
        { name: 'passage', label: 'Passage', required: true, half: true, placeholder: 'John 1' },
        { name: 'note', label: 'A short introduction (optional)', type: 'textarea', rows: 2 },
        { name: 'question', label: 'A question to think about (optional)' },
      ]} onSubmit={create} onCancel={() => setAdding(false)} submitLabel="Save" /></div>}
      {current ? <Week w={current} big /> : <Empty>No reading planned yet.{me.isStaff ? ' Use "Plan a week" to start.' : ''}</Empty>}
      {me.isStaff && upcoming.length > 0 && <p className="p-muted">Coming up: {upcoming.map((w) => `${fmtDate(w.week_of)} ${w.passage}`).join(' · ')}</p>}
      {past.length > 0 && <details className="m-older"><summary>Past weeks</summary><div className="p-list">{past.map((w) => <Week key={w.id} w={w} />)}</div></details>}
    </>
  )
}
