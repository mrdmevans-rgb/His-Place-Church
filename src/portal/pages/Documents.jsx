import { useState } from 'react'
import { supabase, FILE_BUCKET, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, useMe, usePeople, useRows } from '../ui'

const FOLDERS = ['General', 'Worship', 'Sound', 'Camera and Media', "Children's Ministry", 'Safety Team', 'Outreach', 'Policies', 'Pastors']
const MAX_MB = 50
const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function Upload({ onDone }) {
  const me = useMe()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [folder, setFolder] = useState('General')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const folders = FOLDERS.filter((f) => f !== 'Pastors' || me.isPastoral)

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return setErr('Choose a file.')
    if (file.size > MAX_MB * 1048576) return setErr(`Please keep files under ${MAX_MB} MB.`)
    setBusy(true)
    setErr('')
    const path = `docs/${me.profile.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from(FILE_BUCKET).upload(path, file)
    if (upErr) { setBusy(false); return setErr(friendlyError(upErr)) }
    const { error } = await supabase.from('documents').insert({
      title: title || file.name, description, folder, storage_path: path, file_name: file.name, file_size: file.size,
      status: me.isAdmin ? 'approved' : 'pending',
    })
    setBusy(false)
    if (error) {
      await supabase.storage.from(FILE_BUCKET).remove([path])
      return setErr(friendlyError(error))
    }
    onDone(me.isAdmin ? 'Uploaded and shared.' : 'Uploaded. An admin will review it before it is shared with everyone.')
  }

  return (
    <form className="p-form p-card" onSubmit={submit}>
      <h2 className="p-card-title">Share a document</h2>
      <div className="p-form-grid">
        <div className="p-field"><label htmlFor="doc-file">File *</label><input id="doc-file" type="file" required onChange={(e) => { setFile(e.target.files[0]); if (!title && e.target.files[0]) setTitle(e.target.files[0].name.replace(/\.[^.]+$/, '')) }} /><small>Up to {MAX_MB} MB. PDFs, Word, slides, images, and spreadsheets all work.</small></div>
        <div className="p-field half"><label htmlFor="doc-title">Title *</label><input id="doc-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="p-field half"><label htmlFor="doc-folder">Folder</label><select id="doc-folder" value={folder} onChange={(e) => setFolder(e.target.value)}>{folders.map((f) => <option key={f}>{f}</option>)}</select></div>
        <div className="p-field"><label htmlFor="doc-desc">Description</label><textarea id="doc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      {!me.isAdmin && <Notice tone="info">An admin approves each document before other leaders can see it.</Notice>}
      <Notice tone="error">{err}</Notice>
      <div className="p-form-actions">
        <button className="button button-primary" disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</button>
        <button type="button" className="button button-secondary" onClick={() => onDone('')}>Cancel</button>
      </div>
    </form>
  )
}

export default function Documents() {
  const me = useMe()
  const { name } = usePeople()
  const [folder, setFolder] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [rejectNote, setRejectNote] = useState({})
  const { rows, loading, error, reload } = useRows('documents', { filter: (q) => (folder === 'all' ? q : q.eq('folder', folder)), deps: [folder] })
  const pending = rows.filter((d) => d.status === 'pending')
  const shown = rows.filter((d) => d.status === 'approved' || d.uploaded_by === me.profile.id)

  const open = async (d) => {
    const { data, error: err } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(d.storage_path, 300, { download: d.file_name })
    if (err) return setMsg(friendlyError(err))
    window.open(data.signedUrl, '_blank', 'noopener')
  }
  const review = async (d, status) => {
    const { error: err } = await supabase.from('documents').update({ status, review_note: rejectNote[d.id] || '' }).eq('id', d.id)
    setMsg(err ? friendlyError(err) : status === 'approved' ? `"${d.title}" is now shared.` : `"${d.title}" was not approved.`)
    reload()
  }
  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.title}"?`)) return
    const { error: err } = await supabase.from('documents').delete().eq('id', d.id)
    if (!err) await supabase.storage.from(FILE_BUCKET).remove([d.storage_path])
    setMsg(err ? friendlyError(err) : 'Deleted.')
    reload()
  }

  const Item = ({ d, admin }) => (
    <div className="p-card">
      <div className="p-item-head">
        <h3>{d.title}</h3>
        <span className="p-badges">
          <Badge>{d.folder}</Badge>
          {d.status === 'pending' && <Badge tone="warn">Waiting for approval</Badge>}
          {d.status === 'rejected' && <Badge tone="danger">Not approved</Badge>}
        </span>
      </div>
      {d.description && <p className="p-pre">{d.description}</p>}
      {d.status === 'rejected' && d.review_note && <Notice tone="error">{d.review_note}</Notice>}
      <div className="p-meta">{d.file_name} · {size(d.file_size)} · {name(d.uploaded_by)} · {fmtDate(d.created_at)}</div>
      <div className="p-row-actions">
        <button className="p-link" onClick={() => open(d)}>Open</button>
        {admin && (
          <>
            <button className="button button-primary" onClick={() => review(d, 'approved')}>Approve and share</button>
            <input className="p-note-input" placeholder="Reason if not approving" value={rejectNote[d.id] || ''} onChange={(e) => setRejectNote({ ...rejectNote, [d.id]: e.target.value })} aria-label="Reason" />
            <button className="button button-secondary" onClick={() => review(d, 'rejected')}>Don't approve</button>
          </>
        )}
        {(me.isAdmin || (d.uploaded_by === me.profile.id && d.status !== 'approved')) && <button className="p-link danger" onClick={() => remove(d)}>Delete</button>}
      </div>
    </div>
  )

  return (
    <>
      <PageHead title="Documents" intro="Private documents for leaders. Admins approve every document before it is shared.">
        {!uploading && <button className="button button-primary" onClick={() => { setUploading(true); setMsg('') }}>Share a document</button>}
      </PageHead>
      <Notice tone="success">{msg}</Notice>
      {uploading && <Upload onDone={(m) => { setUploading(false); if (m) { setMsg(m); reload() } }} />}
      {me.isAdmin && pending.length > 0 && (
        <section className="p-section">
          <h2 className="p-section-title">Waiting for your approval ({pending.length})</h2>
          <div className="p-list">{pending.map((d) => <Item key={d.id} d={d} admin />)}</div>
        </section>
      )}
      <div className="p-toolbar">
        <select className="p-select-small" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder">
          <option value="all">All folders</option>
          {FOLDERS.filter((f) => f !== 'Pastors' || me.isPastoral).map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      <Notice tone="error">{error}</Notice>
      {loading ? <p className="p-muted">Loading...</p> : shown.length === 0 ? <Empty>No documents in this folder yet.</Empty> : (
        <div className="p-list">{shown.filter((d) => !(me.isAdmin && d.status === 'pending')).map((d) => <Item key={d.id} d={d} />)}</div>
      )}
    </>
  )
}
