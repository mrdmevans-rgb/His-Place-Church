import { useEffect, useState } from 'react'
import { supabase, roleLabel, teamLabel, friendlyError, callAdmin, isLoginId, loginIdOf, contactLabel } from '../supabase'
import { Badge, Form, Notice, PageHead, useMe, usePortal } from '../ui'
import { deviceKind, useInstall } from '../install'

// Crop to a centered square and shrink to 800px so every team photo matches.
export async function squareJpeg(file, size = 800) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("That file couldn't be read as a photo. Try a JPG or PNG."))
    i.src = URL.createObjectURL(file)
  })
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  // Bias toward the top third, where faces usually are.
  const sx = (img.naturalWidth - s) / 2
  const sy = Math.max(0, Math.min(img.naturalHeight - s, (img.naturalHeight - s) * 0.3))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, s)
  canvas.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

function BioEditor() {
  const me = useMe()
  const [bio, setBio] = useState(undefined)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const load = async () => {
    const { data } = await supabase.from('team_bios').select('*').eq('profile_id', me.profile.id).maybeSingle()
    setBio(data || null)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const photoUrl = bio?.photo_path ? supabase.storage.from('team-photos').getPublicUrl(bio.photo_path).data.publicUrl : null

  const save = async (v) => {
    const payload = { display_name: v.display_name, title: v.title, bio: v.bio }
    const { error } = bio
      ? await supabase.from('team_bios').update(payload).eq('profile_id', me.profile.id)
      : await supabase.from('team_bios').insert({ ...payload, profile_id: me.profile.id })
    if (error) return error
    setMsg({ tone: 'success', text: 'Saved. An admin will review it before it shows on the website.' })
    load()
    return null
  }
  const upload = async (file) => {
    if (!file) return
    if (!bio) return setMsg({ tone: 'error', text: 'Save your name and bio first, then add a photo.' })
    setPhotoBusy(true)
    try {
      // 480px is sharp on phones at the 160px the Team page shows.
      const blob = await squareJpeg(file, 480)
      const path = `${me.profile.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('team-photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw error
      const old = bio.photo_path
      const { error: e2 } = await supabase.from('team_bios').update({ photo_path: path }).eq('profile_id', me.profile.id)
      if (e2) throw e2
      if (old) await supabase.storage.from('team-photos').remove([old])
      setMsg({ tone: 'success', text: 'Photo uploaded. An admin will review it before it shows on the website.' })
      load()
    } catch (e) {
      setMsg({ tone: 'error', text: friendlyError(e) })
    }
    setPhotoBusy(false)
  }

  if (bio === undefined) return null
  const status = !bio ? null : bio.status === 'approved' ? ['On the website', 'success'] : bio.status === 'pending' ? ['Waiting for admin approval', 'warn'] : ['Not on the website', 'neutral']
  return (
    <div className="p-card">
      <div className="p-item-head"><h2 className="p-card-title">My website bio</h2>{status && <Badge tone={status[1]}>{status[0]}</Badge>}</div>
      <p className="p-muted">This appears on the public Meet the Team page after an admin approves it. Write it for someone visiting His Place for the first time.</p>
      {bio?.review_note && bio.status !== 'approved' && <Notice tone="info"><strong>Note from admin: </strong>{bio.review_note}</Notice>}
      <div className="p-bio-edit">
        <div className="p-bio-photo">
          {photoUrl ? <img src={photoUrl} alt="Your team photo" /> : <div className="p-bio-nophoto">No photo yet</div>}
          <label className="button button-secondary">{photoBusy ? 'Uploading...' : photoUrl ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
          </label>
          <small className="p-muted">A friendly, well lit photo from the shoulders up works best. We crop it square for you.</small>
        </div>
        <div>
          <Form
            key={bio?.updated_at || 'new'}
            fields={[
              { name: 'display_name', label: 'Name as it should appear', required: true, max: 120 },
              { name: 'title', label: 'Role or title', max: 120, placeholder: 'For example: Worship Leader' },
              { name: 'bio', label: 'Bio', type: 'textarea', rows: 7, max: 3000, help: 'A few sentences about you, your family, how you came to faith, and what you love about serving at His Place.' },
            ]}
            initial={bio || { display_name: me.profile.full_name }}
            onSubmit={save}
            submitLabel={bio ? 'Save changes' : 'Save bio'}
          />
        </div>
      </div>
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
    </div>
  )
}

function EmailCard() {
  const me = useMe()
  const { reloadProfile } = usePortal()
  const noEmail = isLoginId(me.profile.email)
  const [email, setEmail] = useState(noEmail ? '' : me.profile.email)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const save = async (e) => {
    e.preventDefault()
    if (email.trim().toLowerCase() === me.profile.email) return
    setBusy(true)
    try {
      await callAdmin({ action: 'set-email', email })
      setMsg({ tone: 'success', text: `Saved. From now on, sign in with ${email.trim().toLowerCase()}. Your password stays the same.` })
      reloadProfile()
    } catch (err) { setMsg({ tone: 'error', text: err.message }) }
    setBusy(false)
  }
  return (
    <form className="p-card p-form" onSubmit={save}>
      <h2 className="p-card-title">{noEmail ? 'Add your email' : 'Email'}</h2>
      {noEmail
        ? <p className="p-muted">You sign in with your login ID <strong>{loginIdOf(me.profile.email)}</strong>. Add an email anytime, and you'll sign in with your email instead. Your password stays the same.</p>
        : <p className="p-muted">You sign in with this email. Your password stays the same if you change it.</p>}
      <div className="p-inline-form">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" autoComplete="email" />
        <button className="button button-secondary" disabled={busy}>{busy ? 'Saving...' : noEmail ? 'Add email' : 'Change email'}</button>
      </div>
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
    </form>
  )
}

function Password() {
  const me = useMe()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 10) return setMsg({ tone: 'error', text: 'Please use at least 10 characters.' })
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPw('')
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: isLoginId(me.profile.email) ? `Password saved. Sign in with your login ID ${loginIdOf(me.profile.email)} and this password.` : 'Password saved. You can now sign in with your email and password, or keep using email links.' })
  }
  return (
    <form className="p-card p-form" onSubmit={save}>
      <h2 className="p-card-title">Password</h2>
      <p className="p-muted">{isLoginId(me.profile.email) ? 'Set a password so you can sign in anytime with your login ID.' : 'Optional. You can always sign in with an emailed link instead.'}</p>
      <div className="p-inline-form">
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (10+ characters)" aria-label="New password" />
        <button className="button button-secondary">Set password</button>
      </div>
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
    </form>
  )
}


// Members choose which automatic emails they get. Stored in email_prefs (only they can see it).
export const EMAIL_CHOICES = [
  ['pastor_answers', 'When the pastor answers my question', 'Sent right away. Only you see your question and the answer.'],
  ['weekly_reading', "This week's Read together plan", 'Monday morning: the week’s five readings and the question to think about.'],
  ['discussions', 'New Bible study and reading discussions', 'In the morning email: which lessons and readings have new comments.'],
  ['help_board', 'New needs and offers on the Help board', 'In the morning email: titles of new posts.'],
  ['prayer_wall', 'New prayer requests', 'In the morning email: titles only. Requests sent to the pastors only are never emailed.'],
  ['gatherings', 'New gatherings', 'In the morning email: what, when, and a link to RSVP.'],
  ['care', 'New care calendars', 'In the morning email: when a family could use meals or help.'],
]
// Pastors and admins also get these, sent right away. On unless turned off.
export const PASTOR_CHOICES = [
  ['new_questions', 'New Ask the Pastor questions', 'Sent right away, with the question and who asked.'],
  ['private_prayers', 'Private prayer requests', 'Sent right away when someone sends a request to the pastors only.'],
  ['reported_posts', 'Reported posts', 'Sent right away when someone reports a post for a pastor to look at.'],
]

function EmailUpdates() {
  const me = useMe()
  const [prefs, setPrefs] = useState(null)
  const [saved, setSaved] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const noEmail = isLoginId(me.profile.email)
  useEffect(() => {
    supabase.from('email_prefs').select('*').eq('profile_id', me.profile.id).maybeSingle().then(({ data }) => {
      setSaved(!!data)
      setPrefs(data || { pastor_answers: true, weekly_reading: false, discussions: false, help_board: false, prayer_wall: false, gatherings: false, care: false, new_questions: true, private_prayers: true, reported_posts: true })
    })
    if (window.location.hash === '#email-updates') setTimeout(() => document.getElementById('email-updates')?.scrollIntoView({ behavior: 'smooth' }), 300)
  }, [me.profile.id])
  if (!me.isMember || !prefs) return null
  const toggle = (k) => setPrefs({ ...prefs, [k]: !prefs[k] })
  const save = async (e) => {
    e.preventDefault()
    const row = Object.fromEntries([...EMAIL_CHOICES, ...(me.isPastoral ? PASTOR_CHOICES : [])].map(([k]) => [k, !!prefs[k]]))
    const { error } = saved
      ? await supabase.from('email_prefs').update(row).eq('profile_id', me.profile.id)
      : await supabase.from('email_prefs').insert(row)
    if (error) return setMsg({ tone: 'error', text: friendlyError(error) })
    setSaved(true)
    setMsg({ tone: 'success', text: 'Saved. You can change these anytime.' })
  }
  const all = (on) => setPrefs({ ...prefs, ...Object.fromEntries([...EMAIL_CHOICES, ...(me.isPastoral ? PASTOR_CHOICES : [])].map(([k]) => [k, on])) })
  return (
    <form className="p-card p-form" id="email-updates" onSubmit={save}>
      <h2 className="p-card-title">Email updates</h2>
      {noEmail
        ? <Notice tone="warn">Add an email address above to get email updates.</Notice>
        : <p className="p-muted">Choose what you'd like emailed to {me.profile.email}. Everything except pastor answers comes in one short morning email, and only on days there's something new.</p>}
      <div className="m-email-choices">
        {EMAIL_CHOICES.map(([k, label, help]) => (
          <label className="p-check" key={k}>
            <input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} disabled={noEmail} />
            <span>{label}<small>{help}</small></span>
          </label>
        ))}
      </div>
      {me.isPastoral && (
        <>
          <h3 className="p-sub">For pastors</h3>
          <div className="m-email-choices">
            {PASTOR_CHOICES.map(([k, label, help]) => (
              <label className="p-check" key={k}>
                <input type="checkbox" checked={prefs[k] !== false} onChange={() => setPrefs({ ...prefs, [k]: prefs[k] === false })} disabled={noEmail} />
                <span>{label}<small>{help}</small></span>
              </label>
            ))}
          </div>
        </>
      )}
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
      <div className="p-form-actions">
        <button className="button button-primary" disabled={noEmail}>Save email choices</button>
        <button type="button" className="p-link" onClick={() => all(true)} disabled={noEmail}>Select all</button>
        <button type="button" className="p-link" onClick={() => all(false)} disabled={noEmail}>Turn all off</button>
      </div>
    </form>
  )
}

// Optional. Each person decides whether to add the portal to their phone or computer.
function AppCard() {
  const app = useInstall()
  const [done, setDone] = useState('')
  const kind = deviceKind()
  const signInTip = <p className="p-muted">Tip: inside the app, sign in with your password. Sign-in links from email open in your web browser, not the app. If you haven't set a password yet, you can do it below.</p>
  return (
    <div className="p-card" id="app">
      <h2 className="p-card-title">Use the portal like an app (optional)</h2>
      {app.installed ? (
        <p>You're using the portal as an app on this device. To remove it, delete the His Place icon like any other app.</p>
      ) : (
        <>
          <p>If you'd like, you can put a His Place icon on your home screen. It opens the portal full screen, like an app. Nothing to download from an app store, and it's completely up to you. The portal works exactly the same in your web browser.</p>
          {done && <Notice tone="success">{done}</Notice>}
          {app.canInstall ? (
            <button className="button button-primary" onClick={async () => { if (await app.install()) setDone('Added. Look for the His Place icon on your home screen.') }}>Add the His Place app</button>
          ) : kind === 'ios' ? (
            <ol className="p-steps">
              <li>Open this page in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> button (the square with an arrow pointing up).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
            </ol>
          ) : kind === 'android' ? (
            <ol className="p-steps">
              <li>Open this page in <strong>Chrome</strong>.</li>
              <li>Tap the <strong>menu</strong> (three dots, top right).</li>
              <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
            </ol>
          ) : (
            <p className="p-muted">On a computer, Chrome and Edge show an install button at the right side of the address bar. On a phone, open this page there and you'll see the steps.</p>
          )}
          {kind === 'ios' && signInTip}
        </>
      )}
    </div>
  )
}

export default function Account() {
  const me = useMe()
  const { reloadProfile } = usePortal()
  const [msg, setMsg] = useState('')
  const save = async (v) => {
    const { error } = await supabase.from('profiles').update({ full_name: v.full_name, phone: v.phone }).eq('id', me.profile.id)
    if (error) return error
    setMsg('Saved.')
    reloadProfile()
    return null
  }
  return (
    <>
      <PageHead title="My account" intro={`${contactLabel(me.profile.email)} · ${roleLabel(me.role)}${(me.profile.teams || []).length ? ` · ${me.profile.teams.map(teamLabel).join(', ')}` : ''}`} />
      <div className="p-card">
        <h2 className="p-card-title">Contact information</h2>
        <Notice tone="success">{msg}</Notice>
        <Form fields={[{ name: 'full_name', label: 'Full name', required: true, half: true }, { name: 'phone', label: 'Mobile phone', type: 'tel', half: true }]} initial={me.profile} onSubmit={save} />
        <p className="p-muted">To change your role or teams, ask a church admin.</p>
      </div>
      <EmailCard />
      <EmailUpdates />
      <AppCard />
      {me.isStaff && <BioEditor />}
      <Password />
    </>
  )
}
