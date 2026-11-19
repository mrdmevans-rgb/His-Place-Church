import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, ClipboardList, Heart, FolderOpen, CalendarDays, ListOrdered, Users, Music,
  Wrench, Baby, FileWarning, ShieldCheck, UserCog, LogOut, Menu, X, KeyRound,
  Home, BookOpen, BookMarked, HeartHandshake, MessageCircleQuestion, CalendarHeart, Soup, HandHelping, Contact, Library as LibraryIcon, Flag, NotebookPen, Sprout, Sparkles, UserPlus,
} from 'lucide-react'
import { supabase, portalConfigured, friendlyError, roleLabel, toAccountEmail, pendingJoinCount } from './supabase'
import { PortalContext, Notice, useMe } from './ui'
import { usePortalAppTags } from './install'
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
import MemberHome, { ConductGate, Moderation } from './member/MemberHome'
import Library, { SeriesPage, LessonPage } from './member/Library'
import LibraryManage from './member/LibraryManage'
import AskPastor from './member/AskPastor'
import { MemberPrayer, Directory, Care, HelpBoard, Gatherings, Reading } from './member/Community'
import { SermonNotes } from './member/Sermon'
import Praise from './member/Praise'
import Visitors from './pages/Visitors'
import { MyDiscipleship, DiscipleshipLeaders, CoursePreview } from './member/Discipleship'

const NAV = [
  { group: 'Members', show: (m) => m.isMember },
  { to: '/portal/home', label: 'Member home', icon: Home, show: (m) => m.isMember },
  { to: '/portal/study', label: 'Bible study library', icon: BookOpen, show: (m) => m.isMember },
  { to: '/portal/read', label: 'Read together', icon: BookMarked, show: (m) => m.isMember },
  { to: '/portal/notes', label: 'Sermon notes', icon: NotebookPen, show: (m) => m.isMember },
  { to: '/portal/discipleship', label: 'Discipleship', icon: Sprout, show: (m) => m.isMember && m.hasDiscipleship },
  { to: '/portal/pray', label: 'Prayer wall', icon: HeartHandshake, show: (m) => m.isMember },
  { to: '/portal/praise', label: 'Praise reports', icon: Sparkles, show: (m) => m.isMember },
  { to: '/portal/ask', label: 'Ask the Pastor', icon: MessageCircleQuestion, show: (m) => m.isMember },
  { to: '/portal/gatherings', label: 'Gatherings', icon: CalendarHeart, show: (m) => m.isMember },
  { to: '/portal/care', label: 'Care calendar', icon: Soup, show: (m) => m.isMember },
  { to: '/portal/help', label: 'Help board', icon: HandHelping, show: (m) => m.isMember },
  { to: '/portal/directory', label: 'Directory', icon: Contact, show: (m) => m.isMember },
  { group: 'Leaders', show: (m) => m.isStaff },
  { to: '/portal', label: 'Leader dashboard', icon: LayoutDashboard, show: (m) => m.isStaff, end: true },
  { to: '/portal/visitors', label: 'Visitors', icon: UserPlus, show: (m) => m.isStaff },
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
  { to: '/portal/discipleship-leaders', label: 'Discipleship paths', icon: Sprout, show: (m) => m.isStaff },
  { to: '/portal/library-manage', label: 'Manage library', icon: LibraryIcon, show: (m) => m.isPastoral },
  { to: '/portal/reports', label: 'Reported posts', icon: Flag, show: (m) => m.isPastoral },
  { to: '/portal/admin', label: 'Admin', icon: UserCog, show: (m) => m.isAdmin },
  { group: 'Account', show: (m) => !!m.role },
  { to: '/portal/safety', label: 'Safety team', icon: ShieldCheck, show: (m) => !!m.role },
  { to: '/portal/account', label: 'My account', icon: KeyRound, show: (m) => !!m.role },
]

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    document.title = 'Portal | His Place Community Church'
    return () => m.remove()
  }, [])
}

export default function PortalApp() {
  useNoIndex()
  usePortalAppTags()
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
    // Does this person have a discipleship path? (Shows the Discipleship menu item.)
    const { data: paths } = await supabase.from('disciple_assignments').select('course').eq('member_id', session.user.id)
    setProfile({ ...data, hasDiscipleship: (paths || []).length > 0 })
    const { data: all } = await supabase.from('profiles').select('id, full_name, email, phone, role, teams, active')
    const map = Object.fromEntries((all || []).map((p) => [p.id, p]))
    if (data.active && ['admin', 'pastor', 'leader', 'member'].includes(data.role)) {
      // Members can't read other profiles, but can see fellow members' names.
      const { data: names } = await supabase.rpc('member_names')
      for (const n of names || []) if (!map[n.id]) map[n.id] = { id: n.id, full_name: n.full_name, active: true, role: 'member' }
    }
    setPeople(map)
  }, [session])
  useEffect(() => { loadProfile() }, [loadProfile])

  if (!portalConfigured) {
    return (
      <PortalShellPlain>
        <h1>His Place Portal</h1>
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
    const account = toAccountEmail(email)
    if (mode !== 'password' && !email.includes('@')) {
      setBusy(false)
      return setMsg({ tone: 'info', text: 'Login IDs can\'t receive email. Use "Use a password," or ask a church admin to text you a new sign-in link.' })
    }
    if (mode === 'link') {
      ({ error } = await supabase.auth.signInWithOtp({ email: account, options: { shouldCreateUser: false, emailRedirectTo: redirect } }))
      if (!error) setMsg({ tone: 'success', text: 'Check your email for a sign-in link. It may take a minute to arrive.' })
    } else if (mode === 'password') {
      ({ error } = await supabase.auth.signInWithPassword({ email: account, password }))
    } else {
      ({ error } = await supabase.auth.resetPasswordForEmail(account, { redirectTo: redirect }))
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
      <h1>Member and leader sign in</h1>
      <p className="p-muted">For His Place members, leaders, and safety team applicants. Not a member yet? <Link to="/join">Request member access</Link>.</p>
      <div className="p-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>Email me a link</button>
        <button role="tab" aria-selected={mode === 'password'} className={mode === 'password' ? 'active' : ''} onClick={() => setMode('password')}>Use a password</button>
      </div>
      <form className="p-form" onSubmit={submit}>
        <div className="p-field">
          <label htmlFor="login-email">{mode === 'password' ? 'Email or login ID' : 'Email'}</label>
          <input id="login-email" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode === 'password' && <small className="p-muted">No email? Use the login ID your admin gave you, like john.smith</small>}
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
  // Count people waiting to join so admins see it right away.
  const [joinWaiting, setJoinWaiting] = useState(0)
  useEffect(() => { if (me.isAdmin) pendingJoinCount().then(setJoinWaiting) }, [me.isAdmin, location.pathname, location.search])
  const items = NAV.filter((n) => n.show(me))
  const portalName = me.isStaff ? 'Leader Portal' : me.isMember ? 'Member Portal' : 'Portal'
  const home = me.isStaff ? '/portal' : me.isMember ? '/portal/home' : '/portal/safety'

  return (
    <div className="p-shell">
      <aside className={`p-side${open ? ' open' : ''}`} aria-label="Portal menu">
        <div className="p-side-head">
          <Link to={home} className="p-brand">His Place<span>{portalName}</span></Link>
          <button className="p-side-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon, end, group }) => group ? (
            <div key={group} className="p-nav-group">{group}</div>
          ) : (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `p-nav${isActive ? ' active' : ''}`}>
              <Icon size={17} aria-hidden="true" /> {label}
              {to === '/portal/admin' && joinWaiting > 0 && <span className="p-nav-count" aria-label={`${joinWaiting} waiting to join`}>{joinWaiting}</span>}
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
          <button className="p-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} />{joinWaiting > 0 && <span className="p-menu-dot" aria-hidden="true" />}</button>
          <span className="p-top-title">{portalName}</span>
        </header>
        <main className={`p-content${me.profile.text_size && me.profile.text_size !== 'normal' ? ` p-text-${me.profile.text_size}` : ''}`} id="main">
          <ConductGate>
          <Routes>
            <Route index element={me.isStaff ? <Dashboard /> : <Navigate to={home} replace />} />
            {me.isMember && (
              <>
                <Route path="home" element={<MemberHome />} />
                <Route path="study" element={<Library />} />
                <Route path="study/:seriesId" element={<SeriesPage />} />
                <Route path="study/:seriesId/:lessonId" element={<LessonPage />} />
                <Route path="read" element={<Reading />} />
                <Route path="notes" element={<SermonNotes />} />
                <Route path="praise" element={<Praise />} />
                <Route path="discipleship" element={<MyDiscipleship />} />
                <Route path="discipleship/:n" element={<MyDiscipleship />} />
                <Route path="pray" element={<MemberPrayer />} />
                <Route path="ask" element={<AskPastor />} />
                <Route path="gatherings" element={<Gatherings />} />
                <Route path="care" element={<Care />} />
                <Route path="help" element={<HelpBoard />} />
                <Route path="directory" element={<Directory />} />
              </>
            )}
            {me.isPastoral && (
              <>
                <Route path="library-manage" element={<LibraryManage />} />
                <Route path="reports" element={<Moderation />} />
              </>
            )}
            {me.isStaff && (
              <>
                <Route path="announcements" element={<Announcements />} />
                <Route path="visitors" element={<Visitors />} />
                <Route path="discipleship-leaders" element={<DiscipleshipLeaders />} />
                <Route path="discipleship-leaders/:memberId" element={<DiscipleshipLeaders />} />
                <Route path="discipleship-preview" element={<CoursePreview />} />
                <Route path="discipleship-preview/:n" element={<CoursePreview />} />
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
          </ConductGate>
        </main>
      </div>
    </div>
  )
}
