import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, teamLabel } from '../supabase'
import { Badge, PageHead, daysUntil, fmtDate, fmtDateTime, today, useMe, usePeople } from '../ui'

function useDashboard(me) {
  const [d, setD] = useState(null)
  useEffect(() => {
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
    const count = (q) => q.then((r) => r.count || 0)
    const rows = (q) => q.then((r) => r.data || [])
    Promise.all([
      rows(supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)),
      rows(supabase.from('assignments').select('*').eq('person_id', me.profile.id).gte('serve_date', today()).order('serve_date').limit(4)),
      rows(supabase.from('services').select('*').gte('service_date', today()).order('service_date').limit(1)),
      rows(supabase.from('events').select('*').gte('starts_at', new Date().toISOString()).order('starts_at').limit(4)),
      count(supabase.from('requests').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'in_progress'])),
      count(supabase.from('prayers').select('id', { count: 'exact', head: true }).eq('answered', false)),
      count(supabase.from('carry_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending').neq('applicant_id', me.profile.id)),
      rows(supabase.from('carry_applications').select('full_name, approval_expires, license_expires').eq('status', 'approved')),
      count(supabase.from('equipment_issues').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('urgency', 'high')),
      me.isAdmin ? count(supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'pending')) : 0,
      me.isAdmin ? count(supabase.from('team_bios').select('profile_id', { count: 'exact', head: true }).eq('status', 'pending')) : 0,
      me.isPastoral || me.onTeam('children') ? count(supabase.from('kids_clearances').select('id', { count: 'exact', head: true }).or(`background_expires.lte.${in60},training_expires.lte.${in60}`)) : 0,
      me.isPastoral ? count(supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'submitted')) : 0,
      count(supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'swap_requested').gte('serve_date', today())),
    ]).then(([ann, mine, svc, events, openReq, prayers, carryPending, approved, urgent, docsPending, biosPending, kidsExp, newReq, swaps]) => {
      const expiring = approved.filter((a) => { const x = a.approval_expires || a.license_expires; return x && x <= in30 })
      setD({ ann, mine, svc: svc[0], events, openReq, prayers, carryPending, expiring, urgent, docsPending, biosPending, kidsExp, newReq, swaps })
    })
  }, [me.profile.id, me.isAdmin, me.isPastoral]) // eslint-disable-line react-hooks/exhaustive-deps
  return d
}

export default function Dashboard() {
  const me = useMe()
  const { name } = usePeople()
  const d = useDashboard(me)
  const first = (me.profile.full_name || '').split(' ')[0]
  if (!d) return <p className="p-muted">Loading...</p>

  const todos = [
    me.isAdmin && d.docsPending > 0 && { to: '/portal/documents', text: `${d.docsPending} document${d.docsPending > 1 ? 's' : ''} waiting for your approval`, tone: 'warn' },
    me.isAdmin && d.biosPending > 0 && { to: '/portal/admin', text: `${d.biosPending} website bio${d.biosPending > 1 ? 's' : ''} waiting for approval`, tone: 'warn' },
    me.isPastoral && d.newReq > 0 && { to: '/portal/requests', text: `${d.newReq} new request${d.newReq > 1 ? 's' : ''} to review`, tone: 'warn' },
    d.carryPending > 0 && { to: '/portal/safety', text: `${d.carryPending} carry application${d.carryPending > 1 ? 's' : ''} waiting for review`, tone: 'warn' },
    d.expiring.length > 0 && { to: '/portal/safety', text: `Carry approval renewal due soon: ${d.expiring.map((a) => a.full_name).join(', ')}`, tone: 'danger' },
    d.kidsExp > 0 && { to: '/portal/kids', text: `${d.kidsExp} children's volunteer clearance${d.kidsExp > 1 ? 's' : ''} expiring within 60 days or missing`, tone: 'warn' },
    d.urgent > 0 && { to: '/portal/equipment', text: `${d.urgent} urgent equipment issue${d.urgent > 1 ? 's' : ''}`, tone: 'danger' },
    d.swaps > 0 && { to: '/portal/schedule', text: `${d.swaps} volunteer swap request${d.swaps > 1 ? 's' : ''}`, tone: 'warn' },
  ].filter(Boolean)

  return (
    <>
      <PageHead title={`Welcome${first ? `, ${first}` : ''}`} intro="Here's what's happening for His Place leaders." />
      {todos.length > 0 && (
        <div className="p-card p-todos">
          <h2 className="p-card-title">Needs attention</h2>
          <ul>{todos.map((t) => <li key={t.text}><Link to={t.to}><Badge tone={t.tone}>!</Badge> {t.text}</Link></li>)}</ul>
        </div>
      )}
      <div className="p-dash-grid">
        <div className="p-card">
          <h2 className="p-card-title">This Sunday</h2>
          {d.svc ? (
            <>
              <p><strong>{fmtDate(d.svc.service_date)}</strong>{d.svc.sermon_title && ` · "${d.svc.sermon_title}"`}</p>
              {d.svc.scripture && <p className="p-meta">{d.svc.scripture}</p>}
              {d.svc.slides_due && <p className="p-meta">Slides due {fmtDate(d.svc.slides_due)}{daysUntil(d.svc.slides_due) <= 2 && daysUntil(d.svc.slides_due) >= 0 && ' (soon)'}</p>}
              <Link to="/portal/services">Open the run sheet</Link>
            </>
          ) : <p className="p-muted">Not planned yet. <Link to="/portal/services">Plan it</Link></p>}
        </div>
        <div className="p-card">
          <h2 className="p-card-title">My serving dates</h2>
          {d.mine.length ? <ul className="p-team-list">{d.mine.map((a) => <li key={a.id}>{fmtDate(a.serve_date)} · {teamLabel(a.team)}{a.position && `, ${a.position}`} {a.status === 'confirmed' ? <Badge tone="success">Confirmed</Badge> : a.status === 'swap_requested' ? <Badge tone="warn">Swap requested</Badge> : <Badge>Please confirm</Badge>}</li>)}</ul>
            : <p className="p-muted">You're not scheduled right now.</p>}
          <Link to="/portal/schedule">Volunteer schedule</Link>
        </div>
        <div className="p-card">
          <h2 className="p-card-title">Coming up</h2>
          {d.events.length ? <ul className="p-team-list">{d.events.map((e) => <li key={e.id}><strong>{e.title}</strong><br /><span className="p-meta">{fmtDateTime(e.starts_at)}{e.location && ` · ${e.location}`}</span></li>)}</ul>
            : <p className="p-muted">Nothing on the calendar.</p>}
          <Link to="/portal/calendar">Calendar</Link>
        </div>
        <div className="p-card">
          <h2 className="p-card-title">At a glance</h2>
          <ul className="p-stats">
            <li><Link to="/portal/prayer"><strong>{d.prayers}</strong> prayer needs</Link></li>
            <li><Link to="/portal/requests"><strong>{d.openReq}</strong> open requests</Link></li>
          </ul>
        </div>
      </div>
      <div className="p-card">
        <div className="p-item-head"><h2 className="p-card-title">Announcements</h2><Link to="/portal/announcements">All announcements</Link></div>
        {d.ann.length ? d.ann.map((a) => (
          <div key={a.id} className="p-ann">
            <strong>{a.pinned && 'Pinned: '}{a.title}</strong> {a.team && <Badge>{teamLabel(a.team)}</Badge>}
            {a.body && <p className="p-pre">{a.body.length > 280 ? `${a.body.slice(0, 280)}...` : a.body}</p>}
            <div className="p-meta">{name(a.author)} · {fmtDate(a.created_at)}</div>
          </div>
        )) : <p className="p-muted">No announcements yet.</p>}
      </div>
    </>
  )
}
