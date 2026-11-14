import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, ClipboardList, Heart, FolderOpen, CalendarDays, ListOrdered, Users, Music,
  Wrench, Baby, FileWarning, ShieldCheck, UserCog, LogOut, Menu, X, KeyRound,
} from 'lucide-react'
import { supabase, portalConfigured, friendlyError, roleLabel } from './supabase'
import { PortalContext, Notice, useMe } from './ui'
import './portal.css'
import Dashboard from './pages/Dashboard'
import Requests from './pages/Requests'
import Prayer from './pages/Prayer'
import Documents from './pages/Documents'
import Carry from './pages/Carry'
import Admin from './pages/Admin'
import Services from './pages/Services'
import Schedule from './pages/Schedule'
import Account from './pages/Account'
import { Announcements, Calendar, Songs, Equipment, KidsClearances, Incidents } from './pages/Simple'

const NAV = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, show: (m) => m.isStaff, end: true },
  { to: '/portal/announcements', label: 'Announcements', icon: Megaphone, show: (m) => m.isStaff },
  { to: '/portal/requests', label: 'Requests', icon: ClipboardList, show: (m) => m.isStaff },
  { to: '/portal/prayer', label: 'Leader prayer', icon: Heart, show: (m) => m.isStaff },
  { to: '/portal/documents', label: 'Documents', icon: FolderOpen, show: (m) => m.isStaff },
  { to: '/portal/calendar', label: 'Calendar', icon: CalendarDays, show: (m) => m.isStaff },
  { to: '/portal/services', label: 'Sunday run sheets', icon: ListOrdered, show: (m) => m.isStaff },
  { to: '/portal/schedule', label: 'Volunteer schedule', icon: Users, show: (m) => m.isStaff },
  { to: '/portal/songs', label: 'Song library', icon: Music, show: (m) => m.isStaff },
  { to: '/portal/equipment', label: 'Equipment issues', icon: Wrench, show: (m) => m.isStaff },
  { to: '/portal/kids', label: "Kids clearances", icon: Baby, show: (m) => m.isPastoral || m.onTeam('children') },
  { to: '/portal/incidents', label: 'Incident reports', icon: FileWarning, show: (m) => m.isStaff },
  { to: '/portal/safety', label: 'Safety team', icon: ShieldCheck, show: (m) => !!m.role },
  { to: '/portal/admin', label: 'Admin', icon: UserCog, show: (m) => m.isAdmin },
  { to: '/portal/account', label: 'My account', icon: KeyRound, show: (m) => !!m.role },
]

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    document.title = 'Leader Portal | His Place Community Church'
    return () => m.remove()
  }, [])
}

export default function PortalApp() {
  useNoIndex()
  const [session, setSession] = useState(undefined)
  const [recovering, setRecovering] = useState(false)
  const [profile, setProfile] = useState(null)
  const [people, setPeople] = useState({})
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!portalConfigured) return undefined
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!session) { setProfile(null); setPeople({}); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (error) { setLoadError(friendlyError(error)); return }
    setProfile(data)
    const { data: all } = await supabase.from('profiles').select('id, full_name, email, phone, role, teams, active')
    setPeople(Object.fromEntries((all || []).map((p) => [p.id, p])))
  }, [session])
  useEffect(() => { loadProfile() }, [loadProfile])

  if (!portalConfigured) {
    return (
      <PortalShellPlain>
        <h1>Leader Portal</h1>
        <p>The portal is being set up and will be available soon.</p>
        <Link to="/">Back to the website</Link>
      </PortalShellPlain>
    )
  }
  if (session === undefined) return <PortalShellPlain><p>Loading...</p></PortalShellPlain>
  if (!session) return <Login />
  if (recovering) return <SetPassword onDone={() => setRecovering(false)} />
  if (!profile) return <PortalShellPlain>{loadError ? <Notice tone="error">{loadError}</Notice> : <p>Loading...</p>}</PortalShellPlain>
  if (!profile.active) {
    return (
      <PortalShellPlain>
        <h1>Your account isn't active</h1>
        <p>Please contact a church admin to turn on your access.</p>
        <button className="button button-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </PortalShellPlain>
    )
  }
  return (
    <PortalContext.Provider value={{ session, profile, people, reloadProfile: loadProfile }}>
      <Layout />
    </PortalContext.Provider>
  )
}

function PortalShellPlain({ children }) {
  return (
    <div className="p-plain">
      <div className="p-plain-card">
        <Link to="/" className="p-plain-brand">His Place Community Church</Link>
        {children}
      </div>
    </div>
  )
}

function Login() {
  const [mode, setMode] = useState('link') // link | password | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const redirect = `${window.location.origin}/portal`

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg({ tone: '', text: '' })
    let error
    if (mode === 'link') {
      ({ error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect } }))
      if (!error) setMsg({ tone: 'success', text: 'Check your email for a sign-in link. It may take a minute to arrive.' })
    } else if (mode === 'password') {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }))
    } else {
      ({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect }))
      if (!error) setMsg({ tone: 'success', text: 'If that email has an account, we sent a link to set a new password.' })
    }
    if (error) {
      const m = /Signups not allowed|not found|Invalid login/i.test(error.message)
        ? (mode === 'password' ? 'That email and password did not match.' : "We couldn't find an account for that email. Ask a church admin for an invitation.")
        : friendlyError(error)
      setMsg({ tone: 'error', text: m })
    }
    setBusy(false)
  }

  return (
    <PortalShellPlain>
      <h1>Leader and safety team sign in</h1>
      <p className="p-muted">For church leaders and approved safety team applicants. Accounts are by invitation.</p>
      <div className="p-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>Email me a link</button>
        <button role="tab" aria-selected={mode === 'password'} className={mode === 'password' ? 'active' : ''} onClick={() => setMode('password')}>Use a password</button>
      </div>
      <form className="p-form" onSubmit={submit}>
        <div className="p-field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === 'password' && (
          <div className="p-field">
            <label htmlFor="login-pass">Password</label>
            <input id="login-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
        <button className="button button-primary full-width" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'link' ? 'Send sign-in link' : mode === 'password' ? 'Sign in' : 'Send reset link'}
        </button>
      </form>
      <div className="p-login-foot">
        {mode !== 'forgot'
          ? <button className="p-link" onClick={() => setMode('forgot')}>Forgot or need to set a password?</button>
          : <button className="p-link" onClick={() => setMode('password')}>Back to sign in</button>}
        <Link to="/">Back to the website</Link>
      </div>
    </PortalShellPlain>
  )
}

export function SetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 10) return setMsg({ tone: 'error', text: 'Please use at least 10 characters.' })
    if (pw !== pw2) return setMsg({ tone: 'error', text: "Those passwords don't match." })
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setMsg({ tone: 'error', text: friendlyError(error) })
    setMsg({ tone: 'success', text: 'Your password is set.' })
    setTimeout(onDone, 800)
  }
  return (
    <PortalShellPlain>
      <h1>Set your password</h1>
      <form className="p-form" onSubmit={submit}>
        <div className="p-field"><label htmlFor="np1">New password</label><input id="np1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
        <div className="p-field"><label htmlFor="np2">Type it again</label><input id="np2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
        <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
        <button className="button button-primary full-width">Save password</button>
      </form>
    </PortalShellPlain>
  )
}

function Layout() {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [location.pathname])
  const items = NAV.filter((n) => n.show(me))
  const home = me.isStaff ? '/portal' : '/portal/safety'

  return (
    <div className="p-shell">
      <aside className={`p-side${open ? ' open' : ''}`} aria-label="Portal menu">
        <div className="p-side-head">
          <Link to={home} className="p-brand">His Place<span>Leader Portal</span></Link>
          <button className="p-side-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `p-nav${isActive ? ' active' : ''}`}>
              <Icon size={17} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-side-foot">
          <div className="p-who">{me.profile.full_name || me.profile.email}<small>{roleLabel(me.role)}</small></div>
          <button className="p-nav" onClick={async () => { await supabase.auth.signOut(); navigate('/portal') }}><LogOut size={17} /> Sign out</button>
          <Link to="/" className="p-nav">Back to website</Link>
        </div>
      </aside>
      {open && <div className="p-scrim" onClick={() => setOpen(false)} />}
      <div className="p-main">
        <header className="p-top">
          <button className="p-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="p-top-title">Leader Portal</span>
        </header>
        <main className="p-content" id="main">
          <Routes>
            <Route index element={me.isStaff ? <Dashboard /> : <Navigate to="/portal/safety" replace />} />
            {me.isStaff && (
              <>
                <Route path="announcements" element={<Announcements />} />
                <Route path="requests" element={<Requests />} />
                <Route path="prayer" element={<Prayer />} />
                <Route path="documents" element={<Documents />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="services" element={<Services />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="songs" element={<Songs />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="incidents" element={<Incidents />} />
              </>
            )}
            {(me.isPastoral || me.onTeam('children')) && <Route path="kids" element={<KidsClearances />} />}
            {me.isAdmin && <Route path="admin" element={<Admin />} />}
            <Route path="safety" element={<Carry />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
