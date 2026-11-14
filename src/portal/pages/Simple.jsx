import { useState } from 'react'
import { supabase, FILE_BUCKET, TEAMS, teamLabel, friendlyError } from '../supabase'
import { Badge, Collection, fmtDate, fmtDateTime, useMe, usePeople, daysUntil, Notice } from '../ui'

const teamOptions = TEAMS
const withTeam = (t) => (t ? <Badge>{teamLabel(t)}</Badge> : <Badge>Everyone</Badge>)

/* ---------------- Announcements ---------------- */
export function Announcements() {
  const me = useMe()
  const { name } = usePeople()
  return (
    <Collection
      table="announcements"
      title="Leader announcements"
      intro="Updates for all leaders or for one team. Pinned posts stay at the top."
      addLabel="Post an announcement"
      order="pinned"
      fields={[
        { name: 'title', label: 'Title', required: true, max: 200 },
        { name: 'body', label: 'Message', type: 'textarea' },
        { name: 'team', label: 'For', type: 'select', options: teamOptions, placeholder: 'All leaders', half: true },
        ...(me.isPastoral ? [{ name: 'pinned', label: 'Pin to the top', type: 'checkbox' }] : []),
      ]}
      prepare={(v) => ({ title: v.title, body: v.body, team: v.team || null, ...(me.isPastoral ? { pinned: !!v.pinned } : {}) })}
      canEdit={(r) => r.author === me.profile.id || me.isPastoral}
      canDelete={(r) => r.author === me.profile.id || me.isPastoral}
      emptyText="No announcements yet."
      renderItem={(r) => (
        <>
          <div className="p-item-head">
            <h3>{r.pinned && <span className="p-pin">Pinned </span>}{r.title}</h3>
            {withTeam(r.team)}
          </div>
          {r.body && <p className="p-pre">{r.body}</p>}
          <div className="p-meta">{name(r.author)} · {fmtDateTime(r.created_at)}</div>
        </>
      )}
    />
  )
}

/* ---------------- Calendar ---------------- */
export function Calendar() {
  const me = useMe()
  const { name } = usePeople()
  const [past, setPast] = useState(false)
  return (
    <Collection
      key={past ? 'past' : 'up'}
      table="events"
      title="Leader calendar"
      intro="Rehearsals, meetings, trainings, and events for leaders."
      addLabel="Add an event"
      order="starts_at"
      ascending={!past}
      filter={(q) => (past ? q.lt('starts_at', new Date().toISOString()) : q.gte('starts_at', new Date(Date.now() - 6 * 3600e3).toISOString()))}
      toolbar={<div className="p-toolbar"><button className={`chip${!past ? ' active' : ''}`} onClick={() => setPast(false)}>Upcoming</button><button className={`chip${past ? ' active' : ''}`} onClick={() => setPast(true)}>Past</button></div>}
      fields={[
        { name: 'title', label: 'Event', required: true },
        { name: 'starts_at', label: 'Starts', type: 'datetime', required: true, half: true },
        { name: 'ends_at', label: 'Ends', type: 'datetime', half: true },
        { name: 'location', label: 'Location', half: true },
        { name: 'team', label: 'Team', type: 'select', options: teamOptions, placeholder: 'All leaders', half: true },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      prepare={(v) => ({ title: v.title, starts_at: v.starts_at, ends_at: v.ends_at || null, location: v.location, team: v.team || null, notes: v.notes })}
      canEdit={(r) => r.created_by === me.profile.id || me.isPastoral}
      canDelete={(r) => r.created_by === me.profile.id || me.isPastoral}
      emptyText={past ? 'No past events.' : 'Nothing on the calendar yet.'}
      renderItem={(r) => (
        <>
          <div className="p-item-head"><h3>{r.title}</h3>{withTeam(r.team)}</div>
          <div className="p-meta strong">{fmtDateTime(r.starts_at)}{r.ends_at ? ` to ${fmtDateTime(r.ends_at)}` : ''}{r.location ? ` · ${r.location}` : ''}</div>
          {r.notes && <p className="p-pre">{r.notes}</p>}
          <div className="p-meta">Added by {name(r.created_by)}</div>
        </>
      )}
    />
  )
}

/* ---------------- Songs ---------------- */
function ChartButtons({ song, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const open = async () => {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(song.chart_path, 300)
    if (error) return setErr(friendlyError(error))
    window.open(data.signedUrl, '_blank', 'noopener')
  }
  const upload = async (file) => {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) return setErr('Please keep files under 20 MB.')
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `songs/${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file)
    if (!error) {
      const { error: e2 } = await supabase.from('songs').update({ chart_path: path, chart_name: file.name }).eq('id', song.id)
      if (e2) setErr(friendlyError(e2)); else onChange()
    } else setErr(friendlyError(error))
    setBusy(false)
  }
  return (
    <div className="p-row-actions">
      {song.chart_path && <button className="p-link" onClick={open}>Open chart ({song.chart_name})</button>}
      <label className="p-link">{busy ? 'Uploading...' : song.chart_path ? 'Replace chart' : 'Upload chord chart'}
        <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.pro,.chopro" onChange={(e) => upload(e.target.files[0])} />
      </label>
      {err && <span className="p-error-inline">{err}</span>}
    </div>
  )
}

export function Songs() {
  const me = useMe()
  const [q, setQ] = useState('')
  return (
    <Collection
      table="songs"
      title="Song library"
      intro="Keys, tempos, CCLI numbers, and chord charts for the worship team."
      addLabel="Add a song"
      order="title"
      ascending
      deps={[q]}
      filter={(query) => (q ? query.or(`title.ilike.%${q.replace(/[%,()]/g, '')}%,artist.ilike.%${q.replace(/[%,()]/g, '')}%`) : query)}
      toolbar={<div className="p-toolbar"><input className="p-search" type="search" placeholder="Search songs or artists" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
      fields={[
        { name: 'title', label: 'Song title', required: true },
        { name: 'artist', label: 'Artist', half: true },
        { name: 'song_key', label: 'Key we sing it in', half: true, placeholder: 'For example: G' },
        { name: 'tempo', label: 'Tempo (BPM)', half: true },
        { name: 'ccli', label: 'CCLI song number', half: true },
        { name: 'notes', label: 'Notes (arrangement, who leads, etc.)', type: 'textarea', rows: 3 },
      ]}
      prepare={(v) => ({ title: v.title, artist: v.artist, song_key: v.song_key, tempo: v.tempo, ccli: v.ccli, notes: v.notes })}
      canEdit={() => true}
      canDelete={(r) => r.created_by === me.profile.id || me.isPastoral}
      emptyText="No songs yet. Add the songs your team sings."
      renderItem={(r, reload) => (
        <>
          <div className="p-item-head"><h3>{r.title}</h3>{r.song_key && <Badge tone="info">Key of {r.song_key}</Badge>}</div>
          <div className="p-meta">{[r.artist, r.tempo && `${r.tempo} BPM`, r.ccli && `CCLI ${r.ccli}`].filter(Boolean).join(' · ')}</div>
          {r.notes && <p className="p-pre">{r.notes}</p>}
          <ChartButtons song={r} onChange={reload} />
        </>
      )}
    />
  )
}

/* ---------------- Equipment ---------------- */
const STATUS_TONE = { open: 'warn', in_progress: 'info', fixed: 'success' }
const STATUS_LABEL = { open: 'Open', in_progress: 'Being fixed', fixed: 'Fixed' }
export function Equipment() {
  const me = useMe()
  const { name } = usePeople()
  const [showFixed, setShowFixed] = useState(false)
  return (
    <Collection
      key={showFixed ? 'all' : 'open'}
      table="equipment_issues"
      title="Equipment issues"
      intro="Report anything broken or acting up: soundboard, mics, cameras, cables, projectors, the building."
      addLabel="Report an issue"
      filter={(q) => (showFixed ? q : q.neq('status', 'fixed'))}
      toolbar={<div className="p-toolbar"><label className="p-check inline"><input type="checkbox" checked={showFixed} onChange={(e) => setShowFixed(e.target.checked)} /><span>Show fixed items</span></label></div>}
      fields={[
        { name: 'item', label: 'What needs attention?', required: true, placeholder: 'For example: Channel 4 on the soundboard crackles' },
        { name: 'area', label: 'Area', type: 'select', required: true, default: 'sound', options: [['sound', 'Sound'], ['media', 'Camera and media'], ['worship', 'Worship instruments'], ['children', "Children's area"], ['building', 'Building'], ['other', 'Other']], half: true },
        { name: 'urgency', label: 'How urgent?', type: 'select', required: true, default: 'normal', options: [['low', 'Low'], ['normal', 'Normal'], ['high', 'High, needed before Sunday']], half: true },
        { name: 'description', label: 'Details', type: 'textarea', rows: 3 },
        { name: 'status', label: 'Status', type: 'select', required: true, default: 'open', options: [['open', 'Open'], ['in_progress', 'Being fixed'], ['fixed', 'Fixed']], half: true },
        { name: 'fix_note', label: 'What was done', type: 'textarea', rows: 2, hidden: (v) => v.status === 'open' },
      ]}
      prepare={(v) => ({ item: v.item, area: v.area, urgency: v.urgency, description: v.description, status: v.status, fix_note: v.fix_note || '' })}
      canEdit={() => true}
      canDelete={(r) => me.isAdmin || r.reported_by === me.profile.id}
      emptyText="No open issues. Everything is working!"
      renderItem={(r) => (
        <>
          <div className="p-item-head">
            <h3>{r.item}</h3>
            <span className="p-badges">{r.urgency === 'high' && <Badge tone="danger">Urgent</Badge>}<Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge></span>
          </div>
          {r.description && <p className="p-pre">{r.description}</p>}
          {r.fix_note && <p className="p-pre"><strong>Fix: </strong>{r.fix_note}</p>}
          <div className="p-meta">Reported by {name(r.reported_by)} · {fmtDate(r.created_at)}</div>
        </>
      )}
    />
  )
}

/* ---------------- Kids clearances ---------------- */
function expiryBadge(d, label) {
  if (!d) return <Badge tone="warn">{label}: not on file</Badge>
  const n = daysUntil(d)
  if (n < 0) return <Badge tone="danger">{label} expired {fmtDate(d)}</Badge>
  if (n <= 60) return <Badge tone="warn">{label} expires {fmtDate(d)}</Badge>
  return <Badge tone="success">{label} good until {fmtDate(d)}</Badge>
}
export function KidsClearances() {
  return (
    <Collection
      table="kids_clearances"
      title="Children's ministry clearances"
      intro="Track background checks and child safety training for everyone who serves with kids. Only pastors, admins, and the children's team can see this."
      addLabel="Add a volunteer"
      order="person_name"
      ascending
      fields={[
        { name: 'person_name', label: 'Volunteer name', required: true },
        { name: 'profile_id', label: 'Portal account (optional)', type: 'person', placeholder: 'Not a portal user' },
        { name: 'background_check_date', label: 'Background check completed', type: 'date', half: true },
        { name: 'background_expires', label: 'Background check expires', type: 'date', half: true },
        { name: 'training_date', label: 'Safety training completed', type: 'date', half: true },
        { name: 'training_expires', label: 'Training expires', type: 'date', half: true },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, help: "Don't store background check results here, only dates." },
      ]}
      prepare={(v) => ({ person_name: v.person_name, profile_id: v.profile_id || null, background_check_date: v.background_check_date, background_expires: v.background_expires, training_date: v.training_date, training_expires: v.training_expires, notes: v.notes })}
      canEdit={() => true}
      canDelete={() => true}
      emptyText="No volunteers added yet."
      renderItem={(r) => (
        <>
          <div className="p-item-head"><h3>{r.person_name}</h3></div>
          <div className="p-badges wrap">{expiryBadge(r.background_expires, 'Background check')}{expiryBadge(r.training_expires, 'Training')}</div>
          {r.notes && <p className="p-pre">{r.notes}</p>}
        </>
      )}
    />
  )
}

/* ---------------- Incident reports ---------------- */
export function Incidents() {
  const me = useMe()
  const { name } = usePeople()
  return (
    <>
      <Collection
        table="incident_reports"
        title="Incident reports"
        intro={me.isPastoral
          ? 'All incident reports. Only pastors and admins can see every report.'
          : 'File a report for any injury, safety concern, or incident. Only you, pastors, and admins can see it.'}
        addLabel="File a report"
        order="occurred_at"
        fields={[
          { name: 'occurred_at', label: 'When did it happen?', type: 'datetime', required: true, half: true },
          { name: 'area', label: 'Area', type: 'select', required: true, default: 'children', options: [['children', "Children's ministry"], ['service', 'Sunday service'], ['building', 'Building or parking lot'], ['outreach', 'Outreach event'], ['other', 'Other']], half: true },
          { name: 'location', label: 'Where exactly?', half: true },
          { name: 'people_involved', label: 'People involved', half: true, help: "For children, first name and last initial is enough." },
          { name: 'description', label: 'What happened?', type: 'textarea', required: true },
          { name: 'action_taken', label: 'What was done?', type: 'textarea', rows: 3 },
          { name: 'parent_notified', label: 'A parent or guardian was notified', type: 'checkbox' },
          ...(me.isPastoral ? [{ name: 'follow_up', label: 'Pastoral follow up', type: 'textarea', rows: 3 }] : []),
        ]}
        prepare={(v, editing) => {
          const base = { occurred_at: v.occurred_at, area: v.area, location: v.location, people_involved: v.people_involved, description: v.description, action_taken: v.action_taken, parent_notified: !!v.parent_notified }
          return me.isPastoral && editing !== 'new' ? { ...base, follow_up: v.follow_up || '' } : base
        }}
        canEdit={() => me.isPastoral}
        canDelete={() => me.isAdmin}
        emptyText="No incident reports."
        renderItem={(r) => (
          <>
            <div className="p-item-head"><h3>{fmtDateTime(r.occurred_at)}{r.location ? ` · ${r.location}` : ''}</h3>{r.parent_notified ? <Badge tone="success">Parent notified</Badge> : r.area === 'children' ? <Badge tone="warn">Parent not yet notified</Badge> : null}</div>
            <p className="p-pre">{r.description}</p>
            {r.people_involved && <p className="p-pre"><strong>Involved: </strong>{r.people_involved}</p>}
            {r.action_taken && <p className="p-pre"><strong>Action taken: </strong>{r.action_taken}</p>}
            {r.follow_up && <p className="p-pre"><strong>Follow up: </strong>{r.follow_up}</p>}
            <div className="p-meta">Filed by {name(r.reported_by)} · {fmtDate(r.created_at)}</div>
          </>
        )}
      />
      <Notice tone="info">In an emergency, call 911 first. Report suspected child abuse or neglect to Clermont County Children's Protective Services at 513-732-7765, or Ohio's 24/7 hotline at 855-642-4453.</Notice>
    </>
  )
}

