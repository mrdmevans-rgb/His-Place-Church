import { useEffect, useState } from 'react'
import { supabase, roleLabel, teamLabel, friendlyError } from '../supabase'
import { Badge, Form, Notice, PageHead, useMe, usePortal } from '../ui'

// Crop to a centered square and shrink to 800px so every team photo matches.
async function squareJpeg(file, size = 800) {
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
      const blob = await squareJpeg(file)
      const path = `${me.profile.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('team-photos').upload(path, blob, { contentType: 'image/jpeg' })
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

function Password() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 10) return setMsg({ tone: 'error', text: 'Please use at least 10 characters.' })
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPw('')
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: 'Password saved. You can now sign in with your email and password, or keep using email links.' })
  }
  return (
    <form className="p-card p-form" onSubmit={save}>
      <h2 className="p-card-title">Password</h2>
      <p className="p-muted">Optional. You can always sign in with an emailed link instead.</p>
      <div className="p-inline-form">
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (10+ characters)" aria-label="New password" />
        <button className="button button-secondary">Set password</button>
      </div>
      <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
    </form>
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
      <PageHead title="My account" intro={`${me.profile.email} · ${roleLabel(me.role)}${(me.profile.teams || []).length ? ` · ${me.profile.teams.map(teamLabel).join(', ')}` : ''}`} />
      <div className="p-card">
        <h2 className="p-card-title">Contact information</h2>
        <Notice tone="success">{msg}</Notice>
        <Form fields={[{ name: 'full_name', label: 'Full name', required: true, half: true }, { name: 'phone', label: 'Mobile phone', type: 'tel', half: true }]} initial={me.profile} onSubmit={save} />
        <p className="p-muted">To change your email, role, or teams, ask a church admin.</p>
      </div>
      {me.isStaff && <BioEditor />}
      <Password />
    </>
  )
}
