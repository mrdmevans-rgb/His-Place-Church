import { useState } from 'react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Form, Notice, PageHead, daysUntil, fmtDate, fmtDateTime, useMe, usePeople, useRows } from '../ui'

const PERMITS = [
  ['ohio_chl', 'Ohio concealed handgun license (CHL)'],
  ['other_state', 'Concealed carry license from another state'],
  ['none', 'No license (Ohio permitless carry, age 21 or older)'],
]
const permitLabel = (p) => PERMITS.find(([v]) => v === p)?.[1] || p
const STATUS = { pending: ['Waiting for review', 'warn'], approved: ['Approved', 'success'], denied: ['Not approved', 'danger'], revoked: ['Revoked', 'danger'] }

// The church can change these to match its written safety team policy.
const POLICY_POINTS = [
  'I am at least 21 years old and legally allowed to own and carry a firearm under federal and Ohio law.',
  'I will carry only while approved, and only as allowed by the His Place safety team policy.',
  'I will keep my firearm concealed and under my control at all times while on church property.',
  'I will follow the directions of the safety team leaders and pastors.',
  'I will tell a safety team leader right away if my license, legal eligibility, or health changes in a way that affects carrying.',
  'I understand that approval is a privilege that leaders may deny or revoke at any time.',
]

const appFields = [
  { name: 'full_name', label: 'Full legal name', required: true, max: 120 },
  { name: 'phone', label: 'Phone', type: 'tel', half: true, max: 40 },
  { name: 'email', label: 'Email', type: 'email', half: true, max: 200 },
  { name: 'permit_type', label: 'Carry license', type: 'select', required: true, default: 'ohio_chl', options: PERMITS },
  { name: 'issuing_place', label: 'Issuing county or state', half: true, hidden: (v) => v.permit_type === 'none', placeholder: 'For example: Clermont County' },
  { name: 'license_last4', label: 'Last 4 characters of license number', half: true, max: 4, pattern: '[0-9A-Za-z]{4}', hidden: (v) => v.permit_type === 'none', help: 'Only the last 4. Never enter the full number. A leader will look at your physical license in person.' },
  { name: 'license_expires', label: 'License expiration date', type: 'date', half: true, hidden: (v) => v.permit_type === 'none' },
  { name: 'training_course', label: 'Firearms training completed', half: true, placeholder: 'Course name and instructor' },
  { name: 'training_date', label: 'Training date', type: 'date', half: true },
  { name: 'applicant_note', label: 'Anything else the safety team should know?', type: 'textarea', rows: 3 },
  { name: 'safety_policy_ack', label: 'I have read and agree to everything listed above.', type: 'checkbox', required: true },
  { name: 'signature_name', label: 'Type your full name as your signature', required: true, max: 120 },
]

function MyApplication({ app, reload }) {
  const me = useMe()
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const save = async (v) => {
    const payload = {
      full_name: v.full_name, phone: v.phone, email: v.email, permit_type: v.permit_type,
      issuing_place: v.permit_type === 'none' ? '' : v.issuing_place || '',
      license_last4: v.permit_type === 'none' ? '' : (v.license_last4 || '').toUpperCase(),
      license_expires: v.permit_type === 'none' ? null : v.license_expires,
      training_course: v.training_course, training_date: v.training_date, applicant_note: v.applicant_note,
      safety_policy_ack: !!v.safety_policy_ack, signature_name: v.signature_name,
    }
    const { error } = app
      ? await supabase.from('carry_applications').update(payload).eq('id', app.id)
      : await supabase.from('carry_applications').insert(payload)
    if (error) return error
    setEditing(false)
    setMsg(app ? 'Your changes were saved and sent to the safety team for review.' : 'Your application was submitted. A safety team leader will contact you to look at your license in person.')
    reload()
    return null
  }

  const policy = (
    <div className="p-policy">
      <h3>Before you apply</h3>
      <ul>{POLICY_POINTS.map((p) => <li key={p}>{p}</li>)}</ul>
      <p className="p-muted">Please also read the full safety team policy in Documents, under Policies, or ask a leader for a copy.</p>
    </div>
  )

  if (!app || editing) {
    return (
      <div className="p-card">
        <h2 className="p-card-title">{app ? 'Update my application' : 'Apply to carry'}</h2>
        {policy}
        {app && <Notice tone="info">Saving changes sends your application back to the safety team for review.</Notice>}
        <Form
          fields={appFields}
          initial={app ? { ...app, safety_policy_ack: false, signature_name: '' } : { full_name: me.profile.full_name, email: me.profile.email, phone: me.profile.phone }}
          onSubmit={save}
          onCancel={app ? () => setEditing(false) : undefined}
          submitLabel={app ? 'Save and resubmit' : 'Submit application'}
        />
      </div>
    )
  }
  const [label, tone] = STATUS[app.status]
  return (
    <div className="p-card">
      <Notice tone="success">{msg}</Notice>
      <div className="p-item-head"><h2 className="p-card-title">My carry application</h2><Badge tone={tone}>{label}</Badge></div>
      <dl className="p-dl">
        <dt>License</dt><dd>{permitLabel(app.permit_type)}{app.license_last4 && ` ending in ${app.license_last4}`}</dd>
        {app.license_expires && <><dt>License expires</dt><dd>{fmtDate(app.license_expires)}</dd></>}
        {app.training_course && <><dt>Training</dt><dd>{app.training_course}{app.training_date && `, ${fmtDate(app.training_date)}`}</dd></>}
        <dt>Signed</dt><dd>{app.signature_name}, {fmtDateTime(app.signed_at)}</dd>
        {app.status === 'approved' && app.approval_expires && <><dt>Approved until</dt><dd>{fmtDate(app.approval_expires)}</dd></>}
        {['denied', 'revoked'].includes(app.status) && app.decision_reason && <><dt>Reason</dt><dd>{app.decision_reason}</dd></>}
      </dl>
      {app.status === 'pending' && <Notice tone="info">A safety team leader will reach out to see your license in person and review your application.</Notice>}
      {app.status !== 'revoked' && <button className="button button-secondary" onClick={() => { setEditing(true); setMsg('') }}>Update my information</button>}
      {app.status === 'revoked' && <Notice tone="info">Please talk with a pastor or safety team leader if you have questions.</Notice>}
    </div>
  )
}

function History({ id }) {
  const { name } = usePeople()
  const { rows } = useRows('carry_history', { order: 'at', ascending: true, filter: (q) => q.eq('application_id', id), deps: [id] })
  return (
    <ul className="p-history">
      {rows.map((h) => <li key={h.id}><strong>{h.action}</strong> by {name(h.actor) || 'applicant'} · {fmtDateTime(h.at)}{h.reason && ` · "${h.reason}"`}</li>)}
    </ul>
  )
}

function Review({ a, onDone }) {
  const me = useMe()
  const { name } = usePeople()
  const [seen, setSeen] = useState(!!a.license_seen_by)
  const [expires, setExpires] = useState(a.approval_expires || a.license_expires || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const own = a.applicant_id === me.profile.id
  const needsLicense = a.permit_type !== 'none'

  const decide = async (status) => {
    setErr('')
    if (['denied', 'revoked'].includes(status) && !reason.trim()) return setErr('Please give a reason.')
    if (status === 'revoked' && !window.confirm(`Revoke carry approval for ${a.full_name}?`)) return
    const patch = { status, decision_reason: reason.trim() }
    if (status === 'approved') {
      patch.approval_expires = expires || null
      if (needsLicense && !seen) return setErr('Check the box to confirm you saw the physical license.')
      if (needsLicense && !a.license_seen_by) patch.license_seen_by = me.profile.id
    }
    const { error } = await supabase.from('carry_applications').update(patch).eq('id', a.id)
    if (error) return setErr(friendlyError(error))
    onDone(`${a.full_name}: ${STATUS[status][0].toLowerCase()}.`)
  }

  const exp = a.approval_expires || a.license_expires
  const left = daysUntil(exp)
  const [label, tone] = STATUS[a.status]
  return (
    <div className="p-card">
      <div className="p-item-head">
        <h3>{a.full_name}</h3>
        <span className="p-badges">
          <Badge tone={tone}>{label}</Badge>
          {a.status === 'approved' && left != null && left <= 30 && <Badge tone={left < 0 ? 'danger' : 'warn'}>{left < 0 ? 'Expired' : `Expires in ${left} days`}</Badge>}
        </span>
      </div>
      <dl className="p-dl">
        <dt>License</dt><dd>{permitLabel(a.permit_type)}{a.issuing_place && `, ${a.issuing_place}`}{a.license_last4 && `, ending ${a.license_last4}`}</dd>
        {a.license_expires && <><dt>License expires</dt><dd>{fmtDate(a.license_expires)}</dd></>}
        <dt>Training</dt><dd>{a.training_course || 'Not listed'}{a.training_date && `, ${fmtDate(a.training_date)}`}</dd>
        <dt>Contact</dt><dd>{[a.phone, a.email].filter(Boolean).join(' · ') || 'Not listed'}</dd>
        <dt>Signed policy</dt><dd>{a.signature_name}, {fmtDateTime(a.signed_at)}</dd>
        {a.license_seen_by && <><dt>License seen by</dt><dd>{name(a.license_seen_by)}, {fmtDate(a.license_seen_at)}</dd></>}
        {a.decided_by && <><dt>Decision</dt><dd>{name(a.decided_by)}, {fmtDate(a.decided_at)}{a.decision_reason && `: ${a.decision_reason}`}</dd></>}
        {a.status === 'approved' && a.approval_expires && <><dt>Approved until</dt><dd>{fmtDate(a.approval_expires)}</dd></>}
        {a.applicant_note && <><dt>Applicant note</dt><dd className="p-pre">{a.applicant_note}</dd></>}
      </dl>
      {own ? <Notice tone="info">This is your own application. Another leader needs to review it.</Notice> : (
        <div className="p-review">
          {a.status !== 'approved' && (
            <>
              {needsLicense && (
                <label className="p-check"><input type="checkbox" checked={seen} disabled={!!a.license_seen_by} onChange={(e) => setSeen(e.target.checked)} />
                  <span>I have seen this person's physical license in person, and it matches the information above.</span></label>
              )}
              <div className="p-inline-form">
                <label>Approved until <input type="date" value={expires || ''} onChange={(e) => setExpires(e.target.value)} /></label>
              </div>
            </>
          )}
          <div className="p-inline-form">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={a.status === 'approved' ? 'Reason (required to revoke)' : 'Reason (required if not approving)'} aria-label="Reason" />
            {a.status !== 'approved' && <button className="button button-primary" onClick={() => decide('approved')}>Approve</button>}
            {a.status === 'pending' && <button className="button button-secondary" onClick={() => decide('denied')}>Don't approve</button>}
            {a.status === 'approved' && <button className="button button-secondary danger" onClick={() => decide('revoked')}>Revoke</button>}
          </div>
          <Notice tone="error">{err}</Notice>
        </div>
      )}
      <button className="p-link" onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Hide history' : 'Show history'}</button>
      {showHistory && <History id={a.id} />}
    </div>
  )
}

export default function Carry() {
  const me = useMe()
  const [tab, setTab] = useState(me.isStaff ? 'roster' : 'mine')
  const [msg, setMsg] = useState('')
  const { rows, loading, error, reload } = useRows('carry_applications', { order: 'full_name', ascending: true })
  const mine = rows.find((a) => a.applicant_id === me.profile.id)
  const approved = rows.filter((a) => a.status === 'approved')
  const pending = rows.filter((a) => a.status === 'pending' && a.applicant_id !== me.profile.id)
  const other = rows.filter((a) => ['denied', 'revoked'].includes(a.status))
  const expiring = approved.filter((a) => { const d = daysUntil(a.approval_expires || a.license_expires); return d != null && d <= 30 })
  const done = (m) => { setMsg(m); reload() }

  if (!me.isStaff) {
    return (
      <>
        <PageHead title="Safety team carry application" intro="Apply to carry a concealed firearm on church property as part of the His Place safety plan. Your information is private and only seen by church leaders." />
        <Notice tone="error">{error}</Notice>
        {loading ? <p className="p-muted">Loading...</p> : <MyApplication app={mine} reload={reload} />}
      </>
    )
  }

  return (
    <>
      <PageHead title="Safety team" intro="Concealed carry applications and the approved roster. Private to leaders, pastors, and admins. Every decision is recorded." />
      <Notice tone="success">{msg}</Notice>
      <Notice tone="error">{error}</Notice>
      {expiring.length > 0 && <Notice tone="warn">{expiring.length} approved {expiring.length === 1 ? 'person needs' : 'people need'} renewal within 30 days: {expiring.map((a) => a.full_name).join(', ')}.</Notice>}
      <div className="p-toolbar">
        {[['roster', `Approved roster (${approved.length})`], ['pending', `Waiting for review (${pending.length})`], ['other', `Not approved or revoked (${other.length})`], ['mine', 'My application']].map(([v, l]) => (
          <button key={v} className={`chip${tab === v ? ' active' : ''}`} onClick={() => { setTab(v); setMsg('') }}>{l}</button>
        ))}
      </div>
      {loading ? <p className="p-muted">Loading...</p> : (
        <>
          {tab === 'roster' && (approved.length === 0 ? <Empty>No one is approved yet.</Empty> : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead><tr><th>Name</th><th>License</th><th>Approved until</th><th>Phone</th></tr></thead>
                <tbody>
                  {approved.map((a) => {
                    const left = daysUntil(a.approval_expires || a.license_expires)
                    return (
                      <tr key={a.id}>
                        <td><strong>{a.full_name}</strong></td>
                        <td>{a.permit_type === 'none' ? 'Permitless (21+)' : `${a.permit_type === 'ohio_chl' ? 'Ohio CHL' : 'Other state'}${a.license_last4 ? ` ...${a.license_last4}` : ''}`}</td>
                        <td>{fmtDate(a.approval_expires) || 'No end date'}{left != null && left <= 30 && <> <Badge tone={left < 0 ? 'danger' : 'warn'}>{left < 0 ? 'Expired' : `${left} days`}</Badge></>}</td>
                        <td>{a.phone ? <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>{a.phone}</a> : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="p-muted">To revoke someone, open "Approved roster" details below.</p>
              <div className="p-list">{approved.map((a) => <Review key={a.id} a={a} onDone={done} />)}</div>
            </div>
          ))}
          {tab === 'pending' && (pending.length === 0 ? <Empty>No applications waiting.</Empty> : <div className="p-list">{pending.map((a) => <Review key={a.id} a={a} onDone={done} />)}</div>)}
          {tab === 'other' && (other.length === 0 ? <Empty>None.</Empty> : <div className="p-list">{other.map((a) => <Review key={a.id} a={a} onDone={done} />)}</div>)}
          {tab === 'mine' && <MyApplication app={mine} reload={reload} />}
        </>
      )}
    </>
  )
}
