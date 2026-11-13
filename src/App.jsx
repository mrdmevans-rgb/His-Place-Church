import {
  Heart,
  CalendarDays,
  Users,
  HandHeart,
  ChevronRight,
  ChevronLeft,
  Mail,
  MapPin,
  Clock,
  Cross,
  BookOpen,
  Send,
  Menu,
  X,
  PlayCircle,
  Phone,
  Radio,
  CalendarPlus,
  Smile,
  Shield,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import logoSrc from './assets/logo.jpg'
import hisKidsLogoSrc from './assets/his-kids-logo.jpg'
import { knowJesus } from './knowJesusContent'
import { resources, resourceCategories, RESOURCES_CHECKED } from './resourcesContent'
import ResourceCard from './ResourceCard'
import HelperChat from './HelperChat'
import mensLogoSrc from './assets/mens-ministry-logo.jpg'
import womensLogoSrc from './assets/womens-ministry-logo.jpg'

/* ------------------------------------------------------------------
   Site settings. Change these in one place and the whole site updates.
------------------------------------------------------------------- */
const SITE_URL = 'https://www.hpcchurch.church'
const GIVING_URL = 'https://his-place-community-church-533980.churchcenter.com/giving'
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61583261639613'
const CHURCH_ADDRESS = '523 Cincinnati-Batavia Pike, Cincinnati, Ohio 45244'
const SUNDAY_SERVICE_TIME = 'Sundays at 11:00 AM'
const CONTACT_EMAIL = 'info@hpcchurch.church'
// The church phone number. It appears in the footer, on Plan Your Visit,
// His Kids, and Serve. Clear it ('') to hide it everywhere.
const CHURCH_PHONE = '(513) 374-9799'

// Where people watch the Sunday livestream. Right now that's the church
// Facebook page. During Sunday service a "We're live" banner appears at the
// top of every page linking here.
const LIVESTREAM_URL = FACEBOOK_URL
const LIVE_WINDOW = { day: 0, startMinutes: 10 * 60 + 45, endMinutes: 12 * 60 + 45 } // Sunday 10:45 AM to 12:45 PM Eastern

// Pastor's welcome video for the home page. Paste a Facebook video or reel
// link, a YouTube link, or the path to a small .mp4 in the public folder
// (like '/welcome.mp4'). Leave '' to hide the section.
const WELCOME_VIDEO = 'https://www.facebook.com/reel/1788289135656515/'

const SHEET_BASE = 'https://opensheet.elk.sh/1tEU8YmbBWc3Xp6rw4KP8TuSdGZDbcNeRGCFUOMi3m74'
const EVENTS_SHEET_URL = `${SHEET_BASE}/Events`
const ANNOUNCEMENTS_URL = `${SHEET_BASE}/Announcements`
const SERMONS_URL = `${SHEET_BASE}/Sermons`

const mailto = (subject) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CHURCH_ADDRESS)}`

/* ------------------------------------------------------------------
   Photos. Every image in src/assets/gallery is loaded automatically and
   shown on the Photos page. To add pictures, upload them to that folder.
   Optional: add a caption below using the file name (without .jpg).
------------------------------------------------------------------- */
const photoCaptions = {
  'sunday-full-room': 'A full room on a Sunday morning',
  'worship-hands-raised': 'Lifting our hands in worship',
  'worship-eyes-closed': 'Singing to Jesus with everything we have',
  'worship-with-the-band': 'Worship with the band',
  'it-is-well': 'It is well with my soul',
  'preaching-open-arms': 'Opening up the Word on a Sunday morning',
  'preaching-with-passion': 'Preaching with passion',
  'praying-over-one-another': 'Praying over one another',
  'listening-together': 'Leaning in to the message',
  'child-dedication-family': 'A child dedication Sunday',
  'welcome-hug': 'Hugs are part of the welcome here',
  'big-hugs': 'Big hugs from little ones',
  'embrace-after-service': 'Holding on to one another',
  'smiles-after-service': 'Smiles after service',
  'you-belong-here-friends': 'You belong here',
  'his-kids-you-belong-here': 'His Kids in their You Belong Here shirts',
  'nursery-smiles': 'Happy little ones in the nursery',
  'toddlers-dancing': 'Toddlers dancing in His Kids',
  'nursery-play-time': 'Play time in the nursery',
  'nursery-building-blocks': 'Building blocks and big imaginations',
  'kids-fruit-of-the-spirit-craft': 'Learning the fruit of the Spirit',
  'kids-table-grins': 'Grins around the His Kids table',
  'back-to-school-prayer-circle': 'Praying together at the Back to School outreach',
  'back-to-school-supplies': 'School supplies ready for families',
  'back-to-school-notebooks': 'Stacks of notebooks for the new school year',
  'back-to-school-haircuts': 'Fresh haircuts for back to school',
  'fall-cookout': 'Sharing a meal together outside',
  'worship-together': 'Worshiping together on a Sunday morning',
  'worship-leader-singing': 'Leading the church in worship',
  'praying-together': 'Praying for one another',
  'newborn-blessing': 'Welcoming the newest member of the family',
  'moment-to-respond': 'A moment to respond to the message',
  'upside-down-kingdom': 'Upside Down Kingdom: a series in the Beatitudes',
  'pastor-dave-teaching': 'Pastor Dave teaching from the Word',
  'worship-singer': 'Singing praise to Jesus',
  'kids-snuggle': 'Little ones in the arms of our church family',
  'little-one-smiling': 'All smiles on Sunday',
  'welcoming-little-ones': 'Every generation is welcome here',
  'porch-welcome': 'Catching up on the porch after service',
  'sunday-gathering': 'Sunday worship gathering',
  'stone-wall-gathering': 'Gathered for worship',
  'pastor-preaching': 'Pastor Dave preaching on a Sunday morning',
  'pastor-family': 'Pastor Dave Evans and his wife',
  'fellowship-chat': 'Fellowship after service',
  'kids-ministry': 'His Kids ministry activities',
  'worship-music': 'Worship and music',
}

const galleryModules = import.meta.glob('./assets/gallery/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  import: 'default',
})

const captionOrder = Object.keys(photoCaptions)
const photos = Object.entries(galleryModules)
  .map(([path, src]) => {
    const key = path.split('/').pop().replace(/\.[^.]+$/, '')
    const fallback = key.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    return { key, src, alt: photoCaptions[key] || fallback }
  })
  .sort((a, b) => {
    const ia = captionOrder.indexOf(a.key)
    const ib = captionOrder.indexOf(b.key)
    // Photos without a caption entry (newly uploaded) show first.
    return (ia === -1 ? -1 : ia) - (ib === -1 ? -1 : ib) || a.key.localeCompare(b.key)
  })

const photo = (key) => photos.find((p) => p.key === key) || { src: '', alt: '' }

function Photo({ name, className, style }) {
  const p = photo(name)
  if (!p.src) return null
  return <img src={p.src} alt={p.alt} className={className} style={style} loading="lazy" decoding="async" />
}

/* ------------------------------------------------------------------
   Navigation
------------------------------------------------------------------- */
const navItems = [
  { to: '/', label: 'Home' },
  { to: '/visit', label: 'Plan Your Visit' },
  { to: '/know-jesus', label: 'Know Jesus' },
  { to: '/about', label: 'About' },
  { to: '/sermons', label: 'Sermons' },
  { to: '/kids', label: 'His Kids' },
  { to: '/groups', label: 'Groups & Events' },
  { to: '/photos', label: 'Photos' },
  { to: '/prayer', label: 'Prayer' },
  { to: '/resources', label: 'Find Help' },
]

const footerItems = [
  ...navItems.slice(0, 3),
  { to: '/faith', label: 'Statement of Faith' },
  ...navItems.slice(3),
  { to: '/announcements', label: 'Announcements' },
  { to: '/serve', label: 'Serve With Us' },
]

const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`

/* ------------------------------------------------------------------
   Fallback content (shown if the Google Sheet cannot be reached)
------------------------------------------------------------------- */
const fallbackEvents = [
  {
    title: 'Sunday Worship Gathering',
    time: SUNDAY_SERVICE_TIME,
    location: CHURCH_ADDRESS,
    description:
      'Join us for worship, biblical preaching, prayer, and authentic community every Sunday morning.',
  },
]

const fallbackAnnouncements = [
  {
    title: 'Welcome to His Place',
    date: 'Join Us This Sunday',
    text: `We would love to welcome you this Sunday at 11:00 AM at ${CHURCH_ADDRESS}.`,
  },
]

const fallbackSermons = [
  {
    title: 'Latest Sermon Coming Soon',
    speaker: 'Pastor Dave Evans',
    date: '',
    youtube: '',
  },
]

const faithItems = [
  {
    title: 'The Bible',
    text:
      'We believe the Bible is the inspired, trustworthy, and authoritative Word of God. It reveals who God is, the truth about humanity, and the good news of salvation through Jesus Christ.',
  },
  {
    title: 'God',
    text:
      'We believe there is one true God who eternally exists as Father, Son, and Holy Spirit. He is holy, loving, sovereign, and worthy of all worship.',
  },
  {
    title: 'Jesus Christ',
    text:
      'We believe Jesus Christ is fully God and fully man. He was born of a virgin, lived a sinless life, died on the cross for our sins, rose bodily from the grave, and will return in power and glory.',
  },
  {
    title: 'Salvation',
    text:
      'We believe salvation is by grace alone through faith in Jesus Christ alone. No one can earn forgiveness. We are redeemed by the finished work of Christ.',
  },
  {
    title: 'The Holy Spirit',
    text:
      'We believe the Holy Spirit convicts, regenerates, indwells, empowers, and leads believers into a life of holiness, witness, and spiritual growth.',
  },
  {
    title: 'The Church',
    text:
      'We believe the church is the body of Christ, called to worship God, make disciples, love one another, serve the world, and proclaim the gospel.',
  },
  {
    title: 'Baptism and Communion',
    text:
      'We believe baptism and communion are ordinances given by Christ to the church as visible testimonies of the gospel and reminders of His saving work.',
  },
  {
    title: 'Eternity',
    text:
      'We believe every person will spend eternity either in the presence of God through faith in Christ or separated from Him by rejecting the gospel.',
  },
]

const visitFaqs = [
  { title: 'How long is the service?', text: 'About 75 minutes, including worship, teaching, and prayer.' },
  { title: 'What should I wear?', text: 'Come as you are. You will see everything from jeans to Sunday best.' },
  { title: 'What about my kids?', text: 'Children are always welcome in the main service, and our His Kids team would love to help you get settled. See the His Kids page for more.' },
  { title: 'Can I watch online first?', text: 'Absolutely. We stream every Sunday at 11:00 AM on our Facebook page, so you can get a feel for us before you come.' },
  { title: 'Where do I park?', text: `Parking is available on-site at ${CHURCH_ADDRESS}. Look for a greeter near the entrance.` },
  { title: 'Is the building accessible?', text: 'Yes. There are no steps at our current location, so it is easy to get in with a wheelchair, walker, or stroller. We also set up our worship and sermon slides with low vision in mind.' },
  { title: 'Will I be singled out?', text: 'No. We are glad you came, and you are free to simply sit, listen, and take it all in.' },
]

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
function useDocumentHead({ title, description }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const fullTitle = title
      ? `${title} | His Place Community Church`
      : 'His Place Community Church | Amelia, Beechmont & Cherry Grove, OH'
    document.title = fullTitle

    const setMeta = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attrName, attrValue)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', `${SITE_URL}${pathname}`)

    // Each page gets its own canonical address so search engines index it.
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}${pathname === '/' ? '/' : pathname}`)
  }, [title, description, pathname])
}

// Accepts M/D/YYYY, M/D/YY, or anything Date can read. Returns a friendly date.
function formatDate(value) {
  if (!value) return ''
  const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  let d
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    d = new Date(year, Number(m[1]) - 1, Number(m[2]))
  } else {
    d = new Date(value)
  }
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getYouTubeId(url) {
  if (!url) return ''
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/
  )
  return m ? m[1] : ''
}

/* ---------- Livestream ---------- */
function easternNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t)?.value
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

function useIsLive() {
  const check = () => {
    const { day, minutes } = easternNow()
    return day === LIVE_WINDOW.day && minutes >= LIVE_WINDOW.startMinutes && minutes < LIVE_WINDOW.endMinutes
  }
  const [live, setLive] = useState(check)
  useEffect(() => {
    const id = setInterval(() => setLive(check()), 60 * 1000)
    return () => clearInterval(id)
  }, [])
  return live
}

function LiveBanner() {
  const live = useIsLive()
  if (!live || !LIVESTREAM_URL) return null
  return (
    <a className="live-banner" href={LIVESTREAM_URL} target="_blank" rel="noopener noreferrer">
      <span className="live-dot" aria-hidden="true" /> We're live right now. Tap to worship with us on Facebook.
    </a>
  )
}

/* ---------- Calendar ---------- */
const pad = (n) => String(n).padStart(2, '0')
const icsStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

// Reads dates like "11/22/2026 6:00 PM", "11/22/26 6pm", or "11/22/2026".
function parseEventStart(value) {
  if (!value) return null
  const m = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:[^\d]+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?)?/i)
  if (!m) return null
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  let hour = m[4] ? Number(m[4]) % 12 : 0
  if (m[6] && m[6].toLowerCase() === 'p') hour += 12
  const d = new Date(year, Number(m[1]) - 1, Number(m[2]), hour, Number(m[5] || 0))
  if (Number.isNaN(d.getTime())) return null
  return { date: d, allDay: !m[4] }
}

function downloadIcs(filename, lines) {
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//His Place Community Church//Website//EN', ...lines, 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Men's breakfast: last Saturday of each month, 9:30 AM, skipping December.
function nextMensBreakfast(from = new Date()) {
  for (let i = 0; i < 14; i++) {
    const y = from.getFullYear()
    const m = from.getMonth() + i
    const last = new Date(y, m + 1, 0)
    last.setDate(last.getDate() - ((last.getDay() + 1) % 7))
    last.setHours(9, 30, 0, 0)
    if (last.getMonth() === 11) continue
    if (last.getTime() + 2 * 3600e3 > from.getTime()) return last
  }
  return null
}

// Women's study: every other Wednesday at 6:30 PM. To fix the schedule,
// change WOMENS_STUDY_ANCHOR to any Wednesday the women actually met.
const WOMENS_STUDY_ANCHOR = new Date(2026, 10, 11, 18, 30) // Wednesday, November 11, 2026

function nextWomensStudy(from = new Date()) {
  const d = new Date(WOMENS_STUDY_ANCHOR)
  // Step in two-week jumps by calendar date so daylight saving can't shift it.
  while (d.getTime() + 2 * 3600e3 <= from.getTime()) d.setDate(d.getDate() + 14)
  return d
}

function nextSunday() {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  d.setHours(11, 0, 0, 0)
  return d
}

function addSundayToCalendar() {
  const start = nextSunday()
  downloadIcs('his-place-sunday-worship.ics', [
    'BEGIN:VEVENT',
    `UID:sunday-worship@hpcchurch.church`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=America/New_York:${icsStamp(start)}`,
    'DURATION:PT1H15M',
    'RRULE:FREQ=WEEKLY;BYDAY=SU',
    'SUMMARY:Sunday Worship at His Place',
    `LOCATION:${icsText(CHURCH_ADDRESS)}`,
    `DESCRIPTION:${icsText(`Come as you are. ${SITE_URL}/visit`)}`,
    'END:VEVENT',
  ])
}

function AddToCalendar({ event }) {
  const parsed = parseEventStart(event.start || event.time)
  if (!parsed) return null
  const { date, allDay } = parsed
  const end = allDay ? new Date(date.getTime() + 24 * 3600e3) : new Date(date.getTime() + 90 * 60e3)
  const dayStamp = (d) => icsStamp(d).slice(0, 8)
  const location = event.location || CHURCH_ADDRESS
  const google = new URL('https://calendar.google.com/calendar/render')
  google.searchParams.set('action', 'TEMPLATE')
  google.searchParams.set('text', event.title)
  google.searchParams.set('dates', allDay ? `${dayStamp(date)}/${dayStamp(end)}` : `${utcStamp(date)}/${utcStamp(end)}`)
  google.searchParams.set('details', event.description || '')
  google.searchParams.set('location', location)

  const ics = () =>
    downloadIcs(`${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, [
      'BEGIN:VEVENT',
      `UID:${event.id || event.title}-${dayStamp(date)}@hpcchurch.church`,
      `DTSTAMP:${utcStamp(new Date())}`,
      allDay ? `DTSTART;VALUE=DATE:${dayStamp(date)}` : `DTSTART:${utcStamp(date)}`,
      allDay ? `DTEND;VALUE=DATE:${dayStamp(end)}` : `DTEND:${utcStamp(end)}`,
      `SUMMARY:${icsText(event.title)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(event.description)}`,
      'END:VEVENT',
    ])

  return (
    <div className="calendar-links">
      <CalendarPlus size={14} aria-hidden="true" />
      <a href={google.toString()} target="_blank" rel="noopener noreferrer">Google Calendar</a>
      <button type="button" className="link-button" onClick={ics}>Apple or Outlook</button>
    </div>
  )
}

/* ---------- Simple email forms ---------- */
function openEmail(subject, lines) {
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

function ShellCard({ children, className = '' }) {
  return <div className={`card ${className}`.trim()}>{children}</div>
}

function useSheetData(url, fallback, mapRow, { newestFirst = false } = {}) {
  const [data, setData] = useState(fallback)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json()
      })
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return
        let normalized = rows.map(mapRow).filter((row) => row.title)
        // New rows are added to the bottom of the sheet, so flip the list
        // to show the most recent first.
        if (newestFirst) normalized = normalized.reverse()
        if (normalized.length) setData(normalized)
        setStatus('loaded')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return { data, status }
}

const mapAnnouncementRow = (row, index) => ({
  id: row.id || row.ID || `${row.title || row.Title || 'announcement'}-${index}`,
  title: row.title || row.Title || '',
  date: row.date || row.Date || '',
  text: row.text || row.Text || '',
})

const mapSermonRow = (row, index) => ({
  id: row.id || row.ID || `${row.title || row.Title || 'sermon'}-${index}`,
  title: row.title || row.Title || '',
  speaker: row.speaker || row.Speaker || '',
  date: row.date || row.Date || '',
  youtube: row.youtube || row.YouTube || row.Youtube || '',
})

const mapEventRow = (row, index) => ({
  id: row.id || row.ID || `${row.Title || row.title || 'event'}-${index}`,
  title: row.Title || row.title || '',
  time: row.Time || row.time || '',
  location: row.Location || row.location || '',
  description: row.Description || row.description || '',
  // Optional sheet column. Put a date like 11/22/2026 6:00 PM here (or in the
  // Time column) and the event gets "add to calendar" buttons.
  start: row.Start || row.start || row.Date || row.date || '',
})

function SheetStatusNote({ status, emptyLabel }) {
  if (status === 'loading') return <p className="events-helper-text">Loading...</p>
  if (status === 'error') {
    return <p className="events-helper-text">We couldn't load the latest updates right now. {emptyLabel}</p>
  }
  return null
}

/* ------------------------------------------------------------------
   Shared pieces
------------------------------------------------------------------- */
function NavBar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link to="/" className="brand" aria-label="His Place Community Church home">
          <img src={logoSrc} alt="" className="brand-logo" width="42" height="42" />
          <div>
            <div className="brand-top">His Place</div>
            <div className="brand-bottom">Community Church</div>
          </div>
        </Link>

        <nav className="nav-desktop" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`.trim()}
            >
              {item.label}
            </NavLink>
          ))}
          <a className="button button-primary nav-give" href={GIVING_URL} target="_blank" rel="noreferrer">
            Give
          </a>
        </nav>

        <button
          className="menu-button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          <div className="container mobile-menu-inner">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`.trim()}
              >
                {item.label}
              </NavLink>
            ))}
            <a className="button button-primary mobile-give" href={GIVING_URL} target="_blank" rel="noreferrer">
              Give
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function SermonVideo({ sermon }) {
  const id = getYouTubeId(sermon.youtube)
  if (!id) return null
  return (
    <div className="video-frame">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={`Sermon: ${sermon.title}`}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

function SermonCard({ sermon }) {
  const id = getYouTubeId(sermon.youtube)
  return (
    <ShellCard className="event-card sermon-card">
      {id && (
        <a href={sermon.youtube} target="_blank" rel="noopener noreferrer" className="sermon-thumb" aria-label={`Watch ${sermon.title} on YouTube`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
          <PlayCircle size={42} className="sermon-thumb-play" aria-hidden="true" />
        </a>
      )}
      <div className="event-meta-wrap">
        <div className="event-time-pill">{formatDate(sermon.date) || 'Recent message'}</div>
        <div className="event-location">{sermon.speaker || 'Pastor Dave Evans'}</div>
      </div>
      <h3>{sermon.title}</h3>
      {sermon.youtube ? (
        <p><a href={sermon.youtube} target="_blank" rel="noopener noreferrer">Watch on YouTube</a></p>
      ) : (
        <p>Video link coming soon.</p>
      )}
    </ShellCard>
  )
}

function FeaturedSermon({ sermon }) {
  return (
    <div className="featured-sermon">
      <SermonVideo sermon={sermon} />
      <div>
        <div className="section-label">Latest message</div>
        <h3 className="featured-sermon-title">{sermon.title}</h3>
        <p className="featured-sermon-meta">
          {[sermon.speaker || 'Pastor Dave Evans', formatDate(sermon.date)].filter(Boolean).join(' · ')}
        </p>
        {!getYouTubeId(sermon.youtube) && <p>Video link coming soon.</p>}
      </div>
    </div>
  )
}

function WelcomeVideo() {
  if (!WELCOME_VIDEO) return null
  const id = getYouTubeId(WELCOME_VIDEO)
  return (
    <section className="section-tight">
      <div className="container welcome-video-row">
        <div>
          <div className="section-label">A welcome from Pastor Dave</div>
          <h2>We'd love to meet you.</h2>
          <p>Take a minute to hear from our pastor before your first Sunday. We're saving you a seat.</p>
          <Link to="/visit" className="button button-secondary">
            Plan your visit <ChevronRight size={16} />
          </Link>
        </div>
        <div className="video-frame">
          {/facebook\.com/.test(WELCOME_VIDEO) ? (
            <iframe
              src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(WELCOME_VIDEO)}&show_text=false&width=560&t=0`}
              title="A welcome from Pastor Dave"
              loading="lazy"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : id ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="A welcome from Pastor Dave"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video src={WELCOME_VIDEO} controls playsInline preload="metadata" poster={photo('sunday-full-room').src} />
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------
   Pages
------------------------------------------------------------------- */
function HomePage() {
  const navigate = useNavigate()
  useDocumentHead({
    description:
      'His Place Community Church is a Bible based, Jesus following church serving Amelia, Beechmont, Cherry Grove, Bethel, and the State Route 125 area. Join us Sundays at 11:00 AM.',
  })

  const { data: announcements, status: announcementsStatus } = useSheetData(
    ANNOUNCEMENTS_URL,
    fallbackAnnouncements,
    mapAnnouncementRow
  )
  const { data: sermons, status: sermonsStatus } = useSheetData(SERMONS_URL, fallbackSermons, mapSermonRow, {
    newestFirst: true,
  })
  const [latest, ...recent] = sermons

  return (
    <>
      <section className="hero-photo hero-home" style={{ backgroundImage: `url(${photo('sunday-full-room').src})` }}>
        <div className="hero-photo-inner container">
          <div className="hero-eyebrow">A Bible based, Jesus following church</div>
          <h1>A place to belong, believe, and grow in Christ.</h1>
          <p className="hero-sub">
            A welcoming church family rooted in Scripture, centered on Jesus, and passionate
            about prayer, discipleship, and authentic community. Join us every Sunday at
            11:00 AM at {CHURCH_ADDRESS}.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => navigate('/visit')}>
              Plan Your Visit <ChevronRight size={16} />
            </button>
            <button className="button button-light" onClick={() => navigate('/sermons')}>
              Watch the Latest Sermon
            </button>
            <a className="button button-light" href={LIVESTREAM_URL} target="_blank" rel="noopener noreferrer">
              <Radio size={16} /> Watch Live Sundays
            </a>
          </div>
        </div>
      </section>

      <section className="fact-strip">
        <div className="container fact-strip-inner">
          <div className="fact-item">
            <div className="fact-label">Sunday service</div>
            <div className="fact-value">{SUNDAY_SERVICE_TIME}</div>
          </div>
          <div className="fact-item">
            <div className="fact-label">Where to find us</div>
            <div className="fact-value">
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="fact-link">{CHURCH_ADDRESS}</a>
            </div>
          </div>
          <div className="fact-item">
            <div className="fact-label">What to expect</div>
            <div className="fact-value">Come as you are</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="events-heading-row" style={{ marginBottom: 28 }}>
            <div>
              <div className="section-label">A morning at His Place</div>
              <h2 style={{ margin: 0 }}>Real people, real worship, real community.</h2>
            </div>
            <Link to="/photos" className="button button-secondary">See more photos</Link>
          </div>
          <div className="essay-grid">
            <div className="essay-item wide">
              <Photo name="sunday-full-room" />
              <div className="essay-caption">Sunday worship</div>
            </div>
            <div className="essay-item">
              <Photo name="worship-hands-raised" />
              <div className="essay-caption">Worship & music</div>
            </div>
            <div className="essay-item">
              <Photo name="praying-over-one-another" />
              <div className="essay-caption">Praying for one another</div>
            </div>
          </div>
        </div>
      </section>

      <WelcomeVideo />

      <section className="section-tight">
        <div className="container two-col">
          <Photo name="big-hugs" className="two-col-photo" />
          <div>
            <div className="section-label">What to expect</div>
            <h2>You do not have to have it all together to come to His Place.</h2>
            <p>
              Come as you are, bring your family, and expect biblical teaching, worship,
              prayer, and a church family that is glad you are here.
            </p>
            <Link to="/visit" className="button button-secondary">
              Plan your first visit <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container two-col reverse-on-mobile">
          <div>
            <img src={hisKidsLogoSrc} alt="His Kids" className="kids-logo-small" loading="lazy" />
            <div className="section-label">His Kids</div>
            <h2>A safe, happy place for your kids to meet Jesus.</h2>
            <p>
              From the nursery play mat to the craft table, our kids learn Bible stories, sing,
              play, and find out just how much God loves them.
            </p>
            <Link to="/kids" className="button button-secondary">
              Meet His Kids <ChevronRight size={16} />
            </Link>
          </div>
          <Photo name="his-kids-you-belong-here" className="two-col-photo" />
        </div>
      </section>

      <section className="section-tight">
        <div className="container stack-lg">
          <div>
            <div className="section-label">Loving our neighbors</div>
            <h2 style={{ margin: 0 }}>Church doesn't stop at the door.</h2>
            <p className="section-sub">
              Like this summer's Back to School outreach, where we prayed with families and
              helped send kids back with notebooks, supplies, and fresh haircuts.
            </p>
          </div>
          <div className="photo-strip">
            <Photo name="back-to-school-prayer-circle" />
            <Photo name="back-to-school-notebooks" />
            <Photo name="back-to-school-haircuts" />
          </div>
          <div className="hero-actions" style={{ marginTop: 0 }}>
            <Link to="/serve" className="button button-primary">
              Serve with us <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section className="section">
        <div className="container stack-lg">
          <div className="events-heading-row">
            <div>
              <div className="section-label">Sermons</div>
              <h2 style={{ margin: 0 }}>Watch this week's message</h2>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <a className="button button-secondary" href={LIVESTREAM_URL} target="_blank" rel="noopener noreferrer">
                <Radio size={15} /> Watch live
              </a>
              <Link to="/sermons" className="button button-secondary">All sermons</Link>
            </div>
          </div>
          {latest && <FeaturedSermon sermon={latest} />}
          {recent.length > 0 && (
            <div className="events-grid">
              {recent.slice(0, 3).map((sermon) => (
                <SermonCard key={sermon.id || sermon.title} sermon={sermon} />
              ))}
            </div>
          )}
          <SheetStatusNote status={sermonsStatus} emptyLabel="Check back soon for the latest message." />
        </div>
      </section>

      <section className="section-tight">
        <div className="container stack-lg">
          <div className="events-heading-row">
            <div>
              <div className="section-label">Announcements</div>
              <h2 style={{ margin: 0 }}>Latest announcements</h2>
            </div>
            <Link to="/announcements" className="button button-secondary">See all</Link>
          </div>

          <div className="events-grid">
            {announcements.slice(0, 3).map((item) => (
              <ShellCard key={item.id || item.title} className="event-card">
                <div className="event-time-pill">{item.date || 'Update'}</div>
                <h3>{item.title}</h3>
                <p>{item.text || 'More details coming soon.'}</p>
              </ShellCard>
            ))}
          </div>
          <SheetStatusNote status={announcementsStatus} emptyLabel="Check back soon for updates." />
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <ShellCard className="cta-card know-cta">
            <div>
              <div className="section-label">Looking for hope?</div>
              <h3>Find out who Jesus is and what He's done for you.</h3>
              <p>No pressure and no strings. Just the good news, straight from the Bible.</p>
            </div>
            <Link to="/know-jesus" className="button button-primary">
              Know Jesus <ChevronRight size={16} />
            </Link>
          </ShellCard>
        </div>
      </section>

      <section id="giving" className="section section-giving">
        <div className="container giving-grid">
          <div>
            <div className="section-label" style={{ color: '#E7C98A' }}>
              <HandHeart size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Support the mission
            </div>
            <h2>Partner with what God is building through His Place.</h2>
            <p>
              Your generosity helps support ministry, outreach, discipleship, prayer, and
              the practical needs of building a healthy local church.
            </p>
          </div>
          <ShellCard className="giving-card">
            <h3>Online giving</h3>
            <p>Give securely through Church Center Giving to support the mission and ministry of His Place.</p>
            <a className="button button-primary full-width" href={GIVING_URL} target="_blank" rel="noreferrer">
              Give Now
            </a>
          </ShellCard>
        </div>
      </section>
    </>
  )
}

function VisitPage() {
  useDocumentHead({
    title: 'Plan Your Visit',
    description:
      'Planning your first visit to His Place Community Church? Here is what to expect, service times, parking, and answers to common questions.',
  })

  return (
    <>
      <section className="hero-photo" style={{ backgroundImage: `url(${photo('porch-welcome').src})`, minHeight: 360 }}>
        <div className="hero-photo-inner container">
          <div className="hero-eyebrow">Plan your visit</div>
          <h1>We would love to meet you this Sunday.</h1>
          <div className="hero-actions">
            <a className="button button-primary" href="#coming">
              Let us know you're coming <ChevronRight size={16} />
            </a>
            <button type="button" className="button button-light" onClick={addSundayToCalendar}>
              <CalendarPlus size={16} /> Add Sundays to my calendar
            </button>
          </div>
        </div>
      </section>

      <section className="fact-strip">
        <div className="container fact-strip-inner">
          <div className="fact-item"><div className="fact-label">Address</div><div className="fact-value">{CHURCH_ADDRESS}</div></div>
          <div className="fact-item"><div className="fact-label">Service time</div><div className="fact-value">{SUNDAY_SERVICE_TIME}</div></div>
          <div className="fact-item"><div className="fact-label">Dress code</div><div className="fact-value">Come as you are</div></div>
        </div>
      </section>

      <section className="section">
        <div className="container stack-lg">
          <div>
            <div className="section-label">Common questions</div>
            <h2>What to expect</h2>
          </div>
          <div className="faq-list">
            {visitFaqs.map((item) => (
              <div className="faq-row" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>

          <div className="two-col visit-map-row">
            <div className="map-frame">
              <iframe
                title="Map to His Place Community Church"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(CHURCH_ADDRESS)}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div>
              <div className="section-label">Finding us</div>
              <h2>{CHURCH_ADDRESS}</h2>
              <p>
                Parking is on-site, and a greeter will be near the entrance to help you find
                your way in.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href={directionsUrl} target="_blank" rel="noreferrer">
                  Get Directions <ChevronRight size={16} />
                </a>
                <a className="button button-secondary" href={mailto('Question about visiting His Place')}>
                  Have a question? Email us
                </a>
                {CHURCH_PHONE && (
                  <a className="button button-secondary" href={telHref(CHURCH_PHONE)}>
                    Call {CHURCH_PHONE}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="coming" className="section section-alt">
        <div className="container prayer-grid">
          <div className="stack-lg">
            <div className="section-intro" style={{ marginBottom: 0 }}>
              <div className="section-label">Let us know you're coming</div>
              <h2>We'll be watching for you.</h2>
              <p>
                Walking into a new church can feel like a lot. Tell us when you're planning to
                come and we'll have someone ready to say hello, save you a seat, and help your
                kids get settled.
              </p>
            </div>
            <Photo name="welcome-hug" className="prayer-photo" />
          </div>
          <PlanVisitForm />
        </div>
      </section>
    </>
  )
}

function PlanVisitForm() {
  const [submitted, setSubmitted] = useState(false)
  const sunday = nextSunday()
  const sundays = [0, 1, 2, 3].map((w) => {
    const d = new Date(sunday)
    d.setDate(d.getDate() + w * 7)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    const v = (k) => (f.get(k) || '').toString().trim()
    openEmail(`Planning a visit: ${v('name')}`, [
      `Name: ${v('name')}`,
      `Email: ${v('email')}`,
      `Phone: ${v('phone') || 'Not given'}`,
      `Planning to come: ${v('when')}`,
      `Adults: ${v('adults') || '1'}`,
      `Kids and ages: ${v('kids') || 'None'}`,
      '',
      'Anything we should know:',
      v('notes') || 'Nothing else',
    ])
    setSubmitted(true)
  }

  return (
    <ShellCard className="prayer-form-card">
      <h2>Plan your visit</h2>
      <p>This opens an email to us with your answers filled in. Just hit send.</p>
      <form className="prayer-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="visit-name">Your name</label>
            <input id="visit-name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="visit-email">Email</label>
            <input id="visit-email" name="email" type="email" autoComplete="email" required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="visit-phone">Phone (optional)</label>
            <input id="visit-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="form-field">
            <label htmlFor="visit-when">Which Sunday?</label>
            <select id="visit-when" name="when" defaultValue={sundays[0]}>
              {sundays.map((s) => <option key={s}>{s}</option>)}
              <option>Not sure yet</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="visit-adults">How many adults?</label>
            <input id="visit-adults" name="adults" type="number" min="1" max="20" defaultValue="1" />
          </div>
          <div className="form-field">
            <label htmlFor="visit-kids">Kids and their ages</label>
            <input id="visit-kids" name="kids" type="text" placeholder="For example: 2, ages 4 and 7" />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="visit-notes">Anything we should know? (optional)</label>
          <textarea id="visit-notes" name="notes" rows="3" placeholder="Accessibility needs, questions, anything at all" />
        </div>
        <button type="submit" className="button button-primary full-width">
          <Send size={15} /> Let us know you're coming
        </button>
        {submitted && (
          <p className="events-helper-text" role="status">
            Your email app should be opening now. If nothing happens, email {CONTACT_EMAIL}
            {CHURCH_PHONE ? ` or call ${CHURCH_PHONE}` : ''}.
          </p>
        )}
      </form>
    </ShellCard>
  )
}

function AboutPage() {
  useDocumentHead({
    title: 'About Us',
    description: 'Meet Pastor Dave Evans and learn about the mission, vision, and culture of His Place Community Church.',
  })

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">About His Place Community Church</div>
          <h1>A church family built on truth, grace, and the presence of Jesus.</h1>
          <p>
            His Place Community Church exists to help people know Jesus, understand the
            Bible, grow in their faith, and experience real Christian community.
          </p>
        </div>

        <div className="two-col">
          <Photo name="pastor-family" className="two-col-photo" />
          <div>
            <div className="section-label">Meet the Pastor</div>
            <h2>Pastor Dave Evans</h2>
            <div className="stack-md">
              <p>Pastor Dave Evans is passionate about helping people encounter Jesus in a real way and grow deeper in their understanding of God's Word.</p>
              <p>His vision for His Place Community Church is simple: to build a Christ centered church family where truth is taught clearly, grace is extended freely, and people are encouraged to follow Jesus wholeheartedly.</p>
              <p>Dave cares deeply about reaching people who may feel overlooked, worn down, or spiritually hungry. His heart is for people to find hope, healing, purpose, and a genuine sense of belonging.</p>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div>
            <div className="section-label">Sunday mornings</div>
            <h2>Teaching that's clear, practical, and rooted in Scripture.</h2>
            <p>
              Every message opens the Bible and brings it home to everyday life, often through
              series like <em>Upside Down Kingdom</em>, a walk through the Beatitudes. Each
              Sunday ends with a moment to respond, so you can take the Word home with you.
            </p>
            <Link to="/sermons" className="button button-secondary">
              Watch recent sermons <ChevronRight size={16} />
            </Link>
          </div>
          <Photo name="moment-to-respond" className="two-col-photo" />
        </div>

        <div className="three-up-grid">
          {[
            ['Our Mission', 'To point people to Jesus, teach the Bible faithfully, and build a loving church family that reflects the heart of God.'],
            ['Our Vision', 'To be a healthy, growing community church where lives are transformed through the gospel and the power of the Holy Spirit.'],
            ['Our Culture', 'Warm, prayerful, biblical, welcoming, and centered on authentic relationships rather than performance.'],
          ].map(([title, text]) => (
            <ShellCard key={title}><h3>{title}</h3><p>{text}</p></ShellCard>
          ))}
        </div>

        <ShellCard className="cta-card">
          <div>
            <h3>What we believe</h3>
            <p>We are a non denominational, Bible based, Jesus following church. Read our full statement of faith.</p>
          </div>
          <Link to="/faith" className="button button-primary">
            Statement of Faith <ChevronRight size={16} />
          </Link>
        </ShellCard>
      </div>
    </section>
  )
}

function FaithPage() {
  useDocumentHead({
    title: 'Statement of Faith',
    description: 'What His Place Community Church believes about the Bible, God, Jesus Christ, salvation, the Holy Spirit, the church, and eternity.',
  })

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Statement of Faith</div>
          <h1>What we believe</h1>
          <p>His Place Community Church is a non denominational, Bible based, Jesus following church.</p>
        </div>

        <div className="faith-grid">
          {faithItems.map((item) => (
            <ShellCard key={item.title}>
              <div className="faith-title-row">
                <div className="icon-badge"><Cross size={16} className="icon-red" /></div>
                <h3>{item.title}</h3>
              </div>
              <p>{item.text}</p>
            </ShellCard>
          ))}
        </div>

        <ShellCard className="cta-card">
          <div>
            <h3>What does this mean for me?</h3>
            <p>See how you can be forgiven, made new, and know God personally through Jesus.</p>
          </div>
          <Link to="/know-jesus" className="button button-primary">
            Know Jesus <ChevronRight size={16} />
          </Link>
        </ShellCard>
      </div>
    </section>
  )
}

function GroupsPage() {
  useDocumentHead({
    title: 'Groups & Events',
    description: "Men's breakfast and Bible study, women's book and Bible study, Life Groups, the Prayer Team, and upcoming events at His Place Community Church.",
  })

  const { data: events, status } = useSheetData(EVENTS_SHEET_URL, fallbackEvents, mapEventRow)
  const mensNext = nextMensBreakfast()
  const mensNextLabel = mensNext.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const mensEvent = {
    id: 'mens-breakfast',
    title: "Men's Breakfast and Bible Study",
    start: `${mensNext.getMonth() + 1}/${mensNext.getDate()}/${mensNext.getFullYear()} 9:30 AM`,
    location: CHURCH_ADDRESS,
    description: "Breakfast and Bible study for the men of His Place. Last Saturday of the month at 9:30 AM.",
  }
  const womensNext = nextWomensStudy()
  const womensNextLabel = womensNext.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const womensEvent = {
    id: 'womens-study',
    title: "Women's Book and Bible Study",
    start: `${womensNext.getMonth() + 1}/${womensNext.getDate()}/${womensNext.getFullYear()} 6:30 PM`,
    location: CHURCH_ADDRESS,
    description: "Book and Bible study for the women of His Place. Every other Wednesday at 6:30 PM.",
  }

  const groups = [
    { icon: Users, title: 'Life Groups', text: "Small groups where people can grow in faith, build friendships, and walk through life together around God's Word." },
    { icon: BookOpen, title: 'Bible Study', text: 'A deeper look at Scripture with discussion, encouragement, and prayer that helps you apply it to everyday life.' },
    { icon: Heart, title: 'Prayer Team', text: 'A place for people who want to stand in the gap for others and believe God for breakthrough, comfort, and hope.' },
  ]

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Groups and Events</div>
          <h1>Grow together in community</h1>
          <p>
            We believe life change happens not only in worship gatherings, but also in
            smaller spaces where people can learn, pray, share, and support one another.
          </p>
        </div>

        <div className="ministry-grid">
          <ShellCard className="ministry-card">
            <img src={mensLogoSrc} alt="His Place Community Church Men's Ministry logo" className="ministry-logo" loading="lazy" />
            <div className="section-label">Men's Ministry</div>
            <h2>Men's Breakfast and Bible Study</h2>
            <div className="ministry-when">
              <span><CalendarDays size={15} /> Last Saturday of every month</span>
              <span><Clock size={15} /> 9:30 AM</span>
            </div>
            <p>
              Good food, honest conversation, and time in God's Word with other men who want
              to grow in their faith. We meet every month except December, when we take a break for Christmas.
            </p>
            <p className="ministry-next">Next gathering: <strong>{mensNextLabel}</strong></p>
            <AddToCalendar event={mensEvent} />
            <a className="group-link" href={mailto("I'm interested in Men's Breakfast")}>
              Ask about men's breakfast <ChevronRight size={14} />
            </a>
          </ShellCard>

          <ShellCard className="ministry-card">
            <img src={womensLogoSrc} alt="His Place Community Church Women's Ministry logo" className="ministry-logo" loading="lazy" />
            <div className="section-label">Women's Ministry</div>
            <h2>Women's Book and Bible Study</h2>
            <p className="ministry-tagline">Real women. Real faith. Together.</p>
            <div className="ministry-when">
              <span><CalendarDays size={15} /> Every other Wednesday</span>
              <span><Clock size={15} /> 6:30 PM</span>
            </div>
            <p>
              Women gathering to read, study the Bible, and encourage one another. Whether
              you've been coming for years or you're brand new, there's a seat for you.
            </p>
            <p className="ministry-next">Next gathering: <strong>{womensNextLabel}</strong></p>
            <AddToCalendar event={womensEvent} />
            <a className="group-link" href={mailto("I'm interested in the Women's Study")}>
              Ask about the women's study <ChevronRight size={14} />
            </a>
          </ShellCard>
        </div>

        <ShellCard className="cta-card kids-link-card">
          <div className="kids-link-inner">
            <img src={hisKidsLogoSrc} alt="" className="kids-link-logo" loading="lazy" />
            <div>
              <h3>Looking for kids ministry?</h3>
              <p>His Kids has its own page now, with everything parents want to know.</p>
            </div>
          </div>
          <Link to="/kids" className="button button-secondary">
            Visit His Kids <ChevronRight size={16} />
          </Link>
        </ShellCard>

        <div className="three-up-grid">
          {groups.map(({ icon: Icon, title, text }) => (
            <ShellCard key={title} className="group-card">
              <Icon size={22} className="icon-red" />
              <h3>{title}</h3>
              <p>{text}</p>
              <a className="group-link" href={mailto(`I'm interested in ${title}`)}>
                Get connected <ChevronRight size={14} />
              </a>
            </ShellCard>
          ))}
        </div>

        <div className="stack-md">
          <h2 style={{ margin: 0 }}>Upcoming Events</h2>
          <div className="events-grid">
            {events.map((event) => (
              <ShellCard key={event.id || event.title} className="event-card">
                <div className="event-time-pill"><CalendarDays size={13} /> {event.time || 'See details'}</div>
                <div className="event-location">{event.location || CHURCH_ADDRESS}</div>
                <h3>{event.title}</h3>
                <p>{event.description || 'More details coming soon.'}</p>
                <AddToCalendar event={event} />
              </ShellCard>
            ))}
          </div>
          <SheetStatusNote status={status} emptyLabel="Check back soon for upcoming events." />
        </div>

        <ShellCard className="cta-card">
          <div>
            <h3>Want to serve?</h3>
            <p>Greeting, His Kids, worship, tech, hospitality, outreach. There's a place for you on the team.</p>
          </div>
          <Link to="/serve" className="button button-primary">
            Serve with us <ChevronRight size={16} />
          </Link>
        </ShellCard>
      </div>
    </section>
  )
}

function KidsPage() {
  useDocumentHead({
    title: 'His Kids',
    description:
      'His Kids is the children\'s ministry of His Place Community Church. A safe, fun place for kids to learn about Jesus every Sunday at 11:00 AM.',
  })

  const kidsFaqs = [
    { title: 'Can my kids stay with me in the service?', text: 'Of course. Kids are always welcome in the main service. Whatever helps your family feel at home is what we want.' },
    { title: 'What will my kids do in His Kids?', text: 'Bible stories, worship, crafts, and plenty of play, all geared for their age. The little ones have a nursery space with toys and play mats.' },
    { title: 'What should I do on our first Sunday?', text: 'Let us know you\'re coming and we\'ll have someone ready to meet you, show you the kids area, and answer your questions.' },
    { title: 'Who do I talk to with questions?', text: `Email us at ${CONTACT_EMAIL}${CHURCH_PHONE ? ` or call ${CHURCH_PHONE}` : ''}. No question is too small when it comes to your kids.` },
  ]

  return (
    <>
      <section className="section page-section">
        <div className="container stack-lg">
          <div className="two-col">
            <div>
              <img src={hisKidsLogoSrc} alt="His Kids ministry logo" className="kids-logo" />
              <div className="section-label">His Kids</div>
              <h1>Loved. Known. Made for more.</h1>
              <p>
                His Kids is where the youngest members of our church family learn who Jesus is
                and how much He loves them. Every Sunday at 11:00 AM, kids get a safe, joyful place
                to hear Bible stories, sing, create, and make friends.
              </p>
              <div className="hero-actions">
                <Link to="/visit#coming" className="button button-primary">
                  Let us know you're coming <ChevronRight size={16} />
                </Link>
                <a className="button button-secondary" href={mailto('His Kids question')}>
                  <Mail size={15} /> Ask a question
                </a>
              </div>
            </div>
            <Photo name="his-kids-you-belong-here" className="two-col-photo" />
          </div>

          <div className="three-up-grid">
            <ShellCard className="group-card">
              <Smile size={22} className="icon-red" />
              <h3>Little ones</h3>
              <p>Babies and toddlers get a cozy nursery space with toys, blocks, and play mats, cared for by people who love them.</p>
            </ShellCard>
            <ShellCard className="group-card">
              <BookOpen size={22} className="icon-red" />
              <h3>Bigger kids</h3>
              <p>Bible stories, crafts, and activities that bring God's Word to life, like learning the fruit of the Spirit from Galatians 5.</p>
            </ShellCard>
            <ShellCard className="group-card">
              <Shield size={22} className="icon-red" />
              <h3>Safe and cared for</h3>
              <p>Your kids matter to us. If you ever have a question about how we care for them, just ask. We're happy to walk you through it.</p>
            </ShellCard>
          </div>

          <div className="kids-gallery">
            <Photo name="toddlers-dancing" />
            <Photo name="kids-fruit-of-the-spirit-craft" />
            <Photo name="nursery-smiles" />
            <Photo name="kids-table-grins" />
            <Photo name="nursery-building-blocks" />
            <Photo name="nursery-play-time" />
          </div>

          <div className="stack-md">
            <div>
              <div className="section-label">For parents</div>
              <h2>Questions parents ask</h2>
            </div>
            <div className="faq-list">
              {kidsFaqs.map((item) => (
                <div className="faq-row" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

const serveAreas = [
  { key: 'Greeting and welcome', text: 'Be the first smile people see on Sunday morning.' },
  { key: 'His Kids', text: 'Help kids and little ones learn about Jesus.' },
  { key: 'Worship and music', text: 'Sing or play as part of the worship team.' },
  { key: 'Tech and livestream', text: 'Run slides, sound, or the Sunday Facebook stream.' },
  { key: 'Hospitality and setup', text: 'Coffee, snacks, chairs, and getting the room ready.' },
  { key: 'Prayer team', text: 'Pray with people and for the needs shared with us.' },
  { key: 'Outreach events', text: 'Help with community events like Back to School.' },
]

function ServePage() {
  useDocumentHead({
    title: 'Serve With Us',
    description: 'Find your place on the team at His Place Community Church. Greeting, His Kids, worship, tech, hospitality, prayer, and outreach.',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    const v = (k) => (f.get(k) || '').toString().trim()
    const picked = f.getAll('areas').map(String)
    openEmail(`I'd like to serve: ${v('name')}`, [
      `Name: ${v('name')}`,
      `Email: ${v('email')}`,
      `Phone: ${v('phone') || 'Not given'}`,
      '',
      `Interested in: ${picked.length ? picked.join(', ') : 'Not sure yet, show me where I fit'}`,
      '',
      'A little about me:',
      v('notes') || 'Nothing else',
    ])
    setSubmitted(true)
  }

  return (
    <section className="section page-section">
      <div className="container prayer-grid">
        <div className="stack-lg">
          <div className="section-intro" style={{ marginBottom: 0 }}>
            <div className="section-label">Serve with us</div>
            <h1>There's a place for you on the team.</h1>
            <p>
              Church is a family, and families pitch in. You don't need experience, just a
              willing heart. Pick anything that sounds like you and we'll reach out to help
              you get started.
            </p>
          </div>
          <div className="photo-strip two">
            <Photo name="back-to-school-supplies" />
            <Photo name="worship-with-the-band" />
          </div>
        </div>

        <ShellCard className="prayer-form-card">
          <h2>I'd like to serve</h2>
          <p>This opens an email to us with your answers filled in. Just hit send.</p>
          <form className="prayer-form" onSubmit={handleSubmit}>
            <fieldset className="serve-options">
              <legend>Where would you like to help?</legend>
              {serveAreas.map((a) => (
                <label key={a.key} className="serve-option">
                  <input type="checkbox" name="areas" value={a.key} />
                  <span><strong>{a.key}</strong><small>{a.text}</small></span>
                </label>
              ))}
            </fieldset>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="serve-name">Your name</label>
                <input id="serve-name" name="name" type="text" autoComplete="name" required />
              </div>
              <div className="form-field">
                <label htmlFor="serve-email">Email</label>
                <input id="serve-email" name="email" type="email" autoComplete="email" required />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="serve-phone">Phone (optional)</label>
              <input id="serve-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="form-field">
              <label htmlFor="serve-notes">Tell us a little about yourself (optional)</label>
              <textarea id="serve-notes" name="notes" rows="3" />
            </div>
            <button type="submit" className="button button-primary full-width">
              <Send size={15} /> Send
            </button>
            {submitted && (
              <p className="events-helper-text" role="status">
                Your email app should be opening now. If nothing happens, email {CONTACT_EMAIL} directly.
              </p>
            )}
          </form>
        </ShellCard>
      </div>
    </section>
  )
}

function VerseBlock({ verse }) {
  return (
    <blockquote className="verse">
      <p>{verse.text}</p>
      <cite>{verse.ref} ESV</cite>
    </blockquote>
  )
}

function KnowJesusPage() {
  useDocumentHead({
    title: 'Know Jesus',
    description:
      'The good news of Jesus Christ from the Bible. Learn how you can be forgiven, made new, and have eternal life through faith in Jesus.',
  })
  const k = knowJesus
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    const v = (key) => (f.get(key) || '').toString().trim()
    const picked = f.getAll('about').map(String)
    openEmail(`Know Jesus: ${v('name')}`, [
      `Name: ${v('name')}`,
      `Email: ${v('email')}`,
      `Phone: ${v('phone') || 'Not given'}`,
      '',
      `About: ${picked.length ? picked.join(', ') : 'Not selected'}`,
      '',
      'Message:',
      v('message') || 'No message',
    ])
    setSubmitted(true)
  }

  return (
    <>
      <section className="hero-photo know-hero" style={{ backgroundImage: `url(${photo('listening-together').src})`, minHeight: 420 }}>
        <div className="hero-photo-inner container">
          <div className="hero-eyebrow">{k.title}</div>
          <h1>{k.headline}</h1>
          {k.intro.map((t) => <p className="hero-sub" key={t}>{t}</p>)}
        </div>
      </section>

      <section className="section">
        <div className="container know-steps">
          {k.steps.map((step, i) => (
            <article className="know-step" key={step.heading}>
              <div className="know-step-num" aria-hidden="true">{i + 1}</div>
              <div className="know-step-body">
                <h2>{step.heading}</h2>
                {step.body.map((t) => <p key={t}>{t}</p>)}
                <div className="verse-list">
                  {step.verses.map((verse) => <VerseBlock key={verse.ref} verse={verse} />)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container know-narrow">
          <div className="section-label">Prayer</div>
          <h2>{k.prayer.heading}</h2>
          {k.prayer.body.map((t) => <p key={t}>{t}</p>)}
          <div className="prayer-text">{k.prayer.text}</div>
        </div>
      </section>

      <section className="section">
        <div className="container stack-lg">
          <div className="know-narrow">
            <div className="section-label">New life</div>
            <h2>{k.promises.heading}</h2>
            {k.promises.body.map((t) => <p key={t}>{t}</p>)}
          </div>
          <div className="promise-grid">
            {k.promises.items.map((item) => (
              <ShellCard key={item.title} className="promise-card">
                <h3>{item.title}</h3>
                <VerseBlock verse={item} />
              </ShellCard>
            ))}
          </div>

          <div className="know-narrow">
            <div className="section-label">Growing in faith</div>
            <h2>{k.nextSteps.heading}</h2>
          </div>
          <div className="faq-list">
            {k.nextSteps.items.map((item) => (
              <div className="faq-row" key={item.title}>
                <h3>{item.title}</h3>
                <div>
                  <p>{item.text}</p>
                  {item.verse && <VerseBlock verse={{ ref: item.ref, text: item.verse }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="talk" className="section section-alt">
        <div className="container prayer-grid">
          <div className="stack-md">
            <div className="section-label">Let's talk</div>
            <h2>{k.notSure.heading}</h2>
            {k.notSure.body.map((t) => <p key={t}>{t}</p>)}
            <VerseBlock verse={k.notSure.verse} />
            {CHURCH_PHONE && (
              <p>
                Rather talk to a person? Call <a href={telHref(CHURCH_PHONE)}>{CHURCH_PHONE}</a>.
              </p>
            )}
          </div>

          <ShellCard className="prayer-form-card">
            <h2>We'd love to hear from you</h2>
            <p>This opens an email to us with your answers filled in. Just hit send. It's private, and we'll reach out personally.</p>
            <form className="prayer-form" onSubmit={handleSubmit}>
              <fieldset className="serve-options">
                <legend>Check anything that fits</legend>
                {k.formOptions.map((opt) => (
                  <label key={opt} className="serve-option">
                    <input type="checkbox" name="about" value={opt} />
                    <span><strong>{opt}</strong></span>
                  </label>
                ))}
              </fieldset>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="kj-name">Your name</label>
                  <input id="kj-name" name="name" type="text" autoComplete="name" required />
                </div>
                <div className="form-field">
                  <label htmlFor="kj-email">Email</label>
                  <input id="kj-email" name="email" type="email" autoComplete="email" required />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="kj-phone">Phone (optional)</label>
                <input id="kj-phone" name="phone" type="tel" autoComplete="tel" />
              </div>
              <div className="form-field">
                <label htmlFor="kj-message">Anything you'd like to share or ask? (optional)</label>
                <textarea id="kj-message" name="message" rows="4" />
              </div>
              <button type="submit" className="button button-primary full-width">
                <Send size={15} /> Send
              </button>
              {submitted && (
                <p className="events-helper-text" role="status">
                  Your email app should be opening now. If nothing happens, email {CONTACT_EMAIL} directly.
                </p>
              )}
            </form>
          </ShellCard>
        </div>
        <p className="container translation-note">{k.translationNote}</p>
      </section>
    </>
  )
}

function ResourcesPage() {
  useDocumentHead({
    title: 'Community Resources',
    description:
      'Food pantries, rent and utility help, clothing, health care, recovery, and crisis lines in and around Clermont County, Ohio.',
  })
  const location = useLocation()
  const initial = resourceCategories.some((c) => c.id === location.hash.slice(1)) ? location.hash.slice(1) : 'all'
  const [cat, setCat] = useState(initial)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const h = location.hash.slice(1)
    if (resourceCategories.some((c) => c.id === h)) {
      setCat(h)
      setQuery('')
    }
  }, [location.hash])

  const q = query.trim().toLowerCase()
  const shown = resources.filter((r) => {
    if (cat !== 'all' && !r.cats.includes(cat)) return false
    if (!q) return true
    return [r.name, r.services, r.town, r.address].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
  const crisis = resources.filter((r) => ['emergency', '988', 'crisis-hotline', '211'].includes(r.id))

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro" style={{ marginBottom: 0 }}>
          <div className="section-label">Community resources</div>
          <h1>Help is closer than you think.</h1>
          <p>
            Whatever you're facing, you don't have to face it alone. Here are places in and
            around Clermont County that help with food, rent, utilities, clothing, health care,
            and more. And if you'd like someone to pray with you, <Link to="/prayer">we'd be honored to</Link>.
          </p>
        </div>

        <div className="crisis-box" role="note" aria-label="Crisis help">
          <h2>In crisis or in danger?</h2>
          <div className="crisis-lines">
            {crisis.map((r) => (
              <a key={r.id} className="crisis-line" href={`tel:${r.phones[0].number.replace(/[^\d]/g, '')}`}>
                <strong>{r.phones[0].number}</strong>
                <span>{r.name}</span>
              </a>
            ))}
          </div>
          <p>Being abused or unsafe at home? Call the YWCA hotline at <a href="tel:5138729259">513-872-9259</a> or call or text Women Helping Women at <a href="tel:5133815610">513-381-5610</a>, any time.</p>
        </div>

        <div className="resource-controls">
          <div className="resource-chips" role="group" aria-label="Filter by need">
            <button type="button" className={`chip${cat === 'all' ? ' active' : ''}`} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
            {resourceCategories.map((c) => (
              <button key={c.id} type="button" className={`chip${cat === c.id ? ' active' : ''}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="form-field resource-search">
            <label htmlFor="resource-search">Search by name, town, or need</label>
            <input id="resource-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="For example: Amelia, diapers, rent" />
          </div>
        </div>

        <p className="resource-count" aria-live="polite">
          Showing {shown.length} {shown.length === 1 ? 'place' : 'places'}
          {cat !== 'all' ? ` for ${resourceCategories.find((c) => c.id === cat).label.toLowerCase()}` : ''}.
        </p>

        {shown.length > 0 ? (
          <div className="resource-grid">
            {shown.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
        ) : (
          <ShellCard>
            <h3>Nothing matched that search.</h3>
            <p>Try a different word, or call <a href="tel:211">2-1-1</a> and a real person will help you find what you need.</p>
          </ShellCard>
        )}

        <div className="resource-note">
          <p>
            <strong>Please call before you go.</strong> Hours, rules, and programs change often.
            This list comes from Clermont County's official community resource list and was last
            checked {RESOURCES_CHECKED}. His Place isn't connected with these organizations, but we
            care about you and want you to get help.
          </p>
          <p>
            Know of a resource we should add, or found something out of date? <a href={mailto('Community resources update')}>Let us know</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

function AnnouncementsPage() {
  useDocumentHead({ title: 'Announcements', description: 'Stay up to date with the latest announcements from His Place Community Church.' })
  const { data: announcements, status } = useSheetData(ANNOUNCEMENTS_URL, fallbackAnnouncements, mapAnnouncementRow)

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Announcements</div>
          <h1>Latest Announcements</h1>
        </div>
        <div className="events-grid">
          {announcements.map((item) => (
            <ShellCard key={item.id || item.title} className="event-card">
              <div className="event-time-pill">{item.date || 'Update'}</div>
              <h3>{item.title}</h3>
              <p>{item.text || 'More details coming soon.'}</p>
            </ShellCard>
          ))}
        </div>
        <SheetStatusNote status={status} emptyLabel="Check back soon for updates." />
      </div>
    </section>
  )
}

function SermonsPage() {
  useDocumentHead({ title: 'Sermons', description: 'Watch and revisit recent messages from Pastor Dave Evans and His Place Community Church.' })
  const { data: sermons, status } = useSheetData(SERMONS_URL, fallbackSermons, mapSermonRow, { newestFirst: true })
  const [latest, ...rest] = sermons

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Sermons</div>
          <h1>Messages from His Place</h1>
          <p>Missed a Sunday or want to hear it again? Watch the latest message below.</p>
        </div>
        <ShellCard className="cta-card live-card">
          <div>
            <h3><Radio size={18} className="icon-red" style={{ verticalAlign: '-3px', marginRight: 6 }} />Worship with us live</h3>
            <p>We stream every Sunday at 11:00 AM on our Facebook page. Join us from wherever you are.</p>
          </div>
          <a className="button button-primary" href={LIVESTREAM_URL} target="_blank" rel="noopener noreferrer">
            Watch live on Facebook
          </a>
        </ShellCard>
        {latest && <FeaturedSermon sermon={latest} />}
        {rest.length > 0 && (
          <>
            <h2 style={{ margin: 0 }}>Recent messages</h2>
            <div className="events-grid">
              {rest.map((sermon) => (
                <SermonCard key={sermon.id || sermon.title} sermon={sermon} />
              ))}
            </div>
          </>
        )}
        <SheetStatusNote status={status} emptyLabel="Check back soon for the latest message." />
      </div>
    </section>
  )
}

function PhotosPage() {
  useDocumentHead({ title: 'Photos', description: 'Photos of worship, prayer, kids ministry, and life together at His Place Community Church.' })
  const [active, setActive] = useState(null)

  const close = useCallback(() => setActive(null), [])
  const step = useCallback(
    (dir) => setActive((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    []
  )

  useEffect(() => {
    if (active === null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [active, close, step])

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Photos</div>
          <h1>Life at His Place</h1>
          <p>Worship, prayer, little ones, and a church family glad to be together.</p>
        </div>

        <div className="gallery-grid">
          {photos.map((p, i) => (
            <button key={p.key} className="gallery-item" onClick={() => setActive(i)} aria-label={`Open photo: ${p.alt}`}>
              <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={photos[active].alt} onClick={close}>
          <button className="lightbox-btn lightbox-close" onClick={close} aria-label="Close photo"><X size={22} /></button>
          <button className="lightbox-btn lightbox-prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Previous photo"><ChevronLeft size={26} /></button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={photos[active].src} alt={photos[active].alt} />
            <figcaption>{photos[active].alt}</figcaption>
          </figure>
          <button className="lightbox-btn lightbox-next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Next photo"><ChevronRight size={26} /></button>
        </div>
      )}
    </section>
  )
}

function PrayerPage() {
  useDocumentHead({
    title: 'Prayer Requests',
    description: 'Submit a prayer request to His Place Community Church. We believe prayer matters and would be honored to pray for you.',
  })

  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = (data.get('name') || '').toString()
    const email = (data.get('email') || '').toString()
    const request = (data.get('request') || '').toString()

    const subject = encodeURIComponent(`Prayer Request from ${name}`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nPrayer Request:\n${request}`)

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  return (
    <section className="section page-section">
      <div className="container prayer-grid">
        <div className="stack-lg">
          <div className="section-intro">
            <div className="section-label">Prayer</div>
            <h1>How can we pray for you?</h1>
            <p>
              We believe prayer matters. Whether you are walking through grief, uncertainty,
              illness, family struggles, or you simply need encouragement, we would be
              honored to pray for you.
            </p>
          </div>

          <div className="three-up-grid prayer-points-grid">
            {[
              'Prayer is welcomed for any need, big or small.',
              'Requests can be shared privately with the prayer team.',
              'We believe God hears, cares, and responds.',
              'You do not have to have it all together to ask for prayer.',
            ].map((item) => (
              <div className="card prayer-note-card" key={item}><p>{item}</p></div>
            ))}
          </div>

          <Photo name="praying-together" className="prayer-photo" />
        </div>

        <ShellCard className="prayer-form-card">
          <h2>Prayer Request Form</h2>
          <p>
            This opens an email to {CONTACT_EMAIL} with your request filled in. Prefer to
            email us directly instead? <a href={`mailto:${CONTACT_EMAIL}`}>Click here</a>.
          </p>
          <form className="prayer-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="prayer-name">Your name</label>
              <input id="prayer-name" name="name" type="text" autoComplete="name" required />
            </div>
            <div className="form-field">
              <label htmlFor="prayer-email">Email address</label>
              <input id="prayer-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="form-field">
              <label htmlFor="prayer-request">How can we pray for you?</label>
              <textarea id="prayer-request" name="request" rows="7" required />
            </div>
            <button type="submit" className="button button-primary full-width">
              <Send size={15} /> Submit Prayer Request
            </button>
            {submitted && (
              <p className="events-helper-text" role="status">
                Your email app should be opening now. If nothing happens, please email {CONTACT_EMAIL} directly.
              </p>
            )}
          </form>
        </ShellCard>
      </div>
    </section>
  )
}

function NotFoundPage() {
  useDocumentHead({ title: 'Page Not Found' })
  return (
    <section className="section page-section">
      <div className="container section-intro">
        <div className="section-label">Page not found</div>
        <h1>We couldn't find that page.</h1>
        <p>It may have moved, but you are always welcome here.</p>
        <div className="hero-actions">
          <Link to="/" className="button button-primary">Go to the home page</Link>
          <Link to="/visit" className="button button-secondary">Plan your visit</Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <img src={logoSrc} alt="" className="footer-logo" width="36" height="36" loading="lazy" />
            <div>
              <div className="footer-title">His Place Community Church</div>
              <div className="footer-subtitle">A place to belong, believe, and grow.</div>
            </div>
          </div>
          <p className="footer-copy">
            Building a Christ centered community of worship, discipleship, prayer, and love
            in the Amelia and Beechmont area.
          </p>
        </div>
        <div>
          <div className="footer-heading">Explore</div>
          <div className="footer-links">
            {footerItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="footer-link">{item.label}</NavLink>
            ))}
            <a href={GIVING_URL} className="footer-link" target="_blank" rel="noreferrer">Give</a>
          </div>
        </div>
        <div>
          <div className="footer-heading">Connect</div>
          <div className="footer-contact-list">
            <div className="footer-contact-item">
              <MapPin size={15} /> <a href={directionsUrl} target="_blank" rel="noreferrer">{CHURCH_ADDRESS}</a>
            </div>
            <div className="footer-contact-item"><Clock size={15} /> {SUNDAY_SERVICE_TIME}</div>
            <div className="footer-contact-item"><Mail size={15} /> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
            {CHURCH_PHONE && (
              <div className="footer-contact-item">
                <Phone size={15} /> <a href={telHref(CHURCH_PHONE)}>{CHURCH_PHONE}</a>
              </div>
            )}
            <div className="footer-contact-item">
              <Radio size={15} /> <a href={LIVESTREAM_URL} target="_blank" rel="noopener noreferrer">Watch live Sundays on Facebook</a>
            </div>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} His Place Community Church
      </div>
    </footer>
  )
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <LiveBanner />
      <NavBar />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/visit" element={<VisitPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faith" element={<FaithPage />} />
          <Route path="/kids" element={<KidsPage />} />
          <Route path="/serve" element={<ServePage />} />
          <Route path="/know-jesus" element={<KnowJesusPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/sermons" element={<SermonsPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/prayer" element={<PrayerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <HelperChat phone={CHURCH_PHONE} email={CONTACT_EMAIL} serviceTime={SUNDAY_SERVICE_TIME} address={CHURCH_ADDRESS} />
    </div>
  )
}
