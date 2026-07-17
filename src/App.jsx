import {
  Heart,
  CalendarDays,
  Users,
  HandHeart,
  ChevronRight,
  Mail,
  MapPin,
  Clock,
  Cross,
  BookOpen,
  Send,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import logoSrc from './assets/Logo.jpg'
import pastorPhotoSrc from './assets/pastor-family.jpg'
import porchWelcomeSrc from './assets/photos/porch-welcome.jpg'
import sundayGatheringSrc from './assets/photos/sunday-gathering.jpg'
import pastorPreachingSrc from './assets/photos/pastor-preaching.jpg'
import worshipMusicSrc from './assets/photos/worship-music.jpg'
import stoneWallSrc from './assets/photos/stone-wall-gathering.jpg'
import kidsMinistrySrc from './assets/photos/kids-ministry.jpg'
import fellowshipChatSrc from './assets/photos/fellowship-chat.jpg'
import hisKidsLogoSrc from './assets/photos/his-kids-logo.jpg'

const GIVING_URL = 'https://his-place-community-church-533980.churchcenter.com/giving'
const CHURCH_ADDRESS = '523 Cincinnati-Batavia Pike, Cincinnati, Ohio 45244'
const SUNDAY_SERVICE_TIME = 'Sundays at 11:00 AM'
const PRAYER_EMAIL = 'info@hpcchurch.church'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/visit', label: 'Plan Your Visit' },
  { to: '/about', label: 'About' },
  { to: '/faith', label: 'Statement of Faith' },
  { to: '/groups', label: 'Groups & Events' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/sermons', label: 'Sermons' },
  { to: '/prayer', label: 'Prayer' },
]

const EVENTS_SHEET_URL =
  'https://opensheet.elk.sh/1tEU8YmbBWc3Xp6rw4KP8TuSdGZDbcNeRGCFUOMi3m74/Events'
const ANNOUNCEMENTS_URL =
  'https://opensheet.elk.sh/1tEU8YmbBWc3Xp6rw4KP8TuSdGZDbcNeRGCFUOMi3m74/Announcements'
const SERMONS_URL =
  'https://opensheet.elk.sh/1tEU8YmbBWc3Xp6rw4KP8TuSdGZDbcNeRGCFUOMi3m74/Sermons'

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
    date: 'Coming Soon',
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
  { title: 'What about my kids?', text: 'Children are always welcome in the main service, and our His Kids team would love to help you get settled.' },
  { title: 'Where do I park?', text: `Parking is available on-site at ${CHURCH_ADDRESS}. Look for a greeter near the entrance.` },
]

function useDocumentHead({ title, description }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | His Place Community Church`
      : 'His Place Community Church — Amelia, Beechmont & Cherry Grove, OH'
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
    setMeta('property', 'og:type', 'website')
  }, [title, description])
}

function ShellCard({ children, className = '' }) {
  return <div className={`card ${className}`.trim()}>{children}</div>
}

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
          <img src={logoSrc} alt="His Place Community Church logo" className="brand-logo" />
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
          aria-label="Toggle menu"
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

function useSheetData(url, fallback, mapRow) {
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
        const normalized = rows.map(mapRow).filter((row) => row.title)
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
})

function SheetStatusNote({ status, emptyLabel }) {
  if (status === 'loading') return <p className="events-helper-text">Loading...</p>
  if (status === 'error') {
    return <p className="events-helper-text">We couldn't load the latest updates right now. {emptyLabel}</p>
  }
  return null
}

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
  const { data: sermons, status: sermonsStatus } = useSheetData(SERMONS_URL, fallbackSermons, mapSermonRow)

  return (
    <>
      <section className="hero-photo" style={{ backgroundImage: `url(${porchWelcomeSrc})` }}>
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
            <button className="button button-light" onClick={() => navigate('/prayer')}>
              Submit a Prayer Request
            </button>
            <a className="button button-light" href={GIVING_URL} target="_blank" rel="noreferrer">
              Give
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
            <div className="fact-value">{CHURCH_ADDRESS}</div>
          </div>
          <div className="fact-item">
            <div className="fact-label">What to expect</div>
            <div className="fact-value">Come as you are</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-label">A morning at His Place</div>
          <h2 className="section-intro">Real people, real worship, real community.</h2>
          <div className="essay-grid">
            <div className="essay-item wide">
              <img src={sundayGatheringSrc} alt="Congregation gathered for Sunday worship" />
              <div className="essay-caption">Sunday worship gathering</div>
            </div>
            <div className="essay-item">
              <img src={worshipMusicSrc} alt="Worship leader playing keyboard during service" />
              <div className="essay-caption">Worship & music</div>
            </div>
            <div className="essay-item">
              <img src={kidsMinistrySrc} alt="Kids ministry table with coloring and activities" />
              <div className="essay-caption">His Kids ministry</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container two-col">
          <img src={fellowshipChatSrc} alt="Two church members talking after service" />
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

      <hr className="divider" />

      <section className="section">
        <div className="container stack-lg">
          <div className="events-heading-row">
            <div className="section-intro" style={{ marginBottom: 0 }}>
              <div className="section-label">Announcements</div>
              <h2>Latest announcements</h2>
            </div>
            <Link to="/announcements" className="button button-secondary">See all</Link>
          </div>

          <div className="events-grid">
            {announcements.slice(0, 3).map((item) => (
              <ShellCard key={item.id} className="event-card">
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
        <div className="container stack-lg">
          <div className="events-heading-row">
            <div className="section-intro" style={{ marginBottom: 0 }}>
              <div className="section-label">Sermons</div>
              <h2>Latest sermons</h2>
            </div>
            <Link to="/sermons" className="button button-secondary">See all</Link>
          </div>

          <div className="events-grid">
            {sermons.slice(0, 3).map((sermon) => (
              <ShellCard key={sermon.id} className="event-card">
                <div className="event-meta-wrap">
                  <div className="event-time-pill">{sermon.date || 'Latest Message'}</div>
                  <div className="event-location">{sermon.speaker || 'Pastor Dave Evans'}</div>
                </div>
                <h3>{sermon.title}</h3>
                {sermon.youtube ? (
                  <p><a href={sermon.youtube} target="_blank" rel="noopener noreferrer">Watch sermon</a></p>
                ) : (
                  <p>Video link coming soon.</p>
                )}
              </ShellCard>
            ))}
          </div>
          <SheetStatusNote status={sermonsStatus} emptyLabel="Check back soon for the latest message." />
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
  const navigate = useNavigate()
  useDocumentHead({
    title: 'Plan Your Visit',
    description:
      'Planning your first visit to His Place Community Church? Here is what to expect, service times, parking, and answers to common questions.',
  })

  return (
    <>
      <section className="hero-photo" style={{ backgroundImage: `url(${stoneWallSrc})`, minHeight: 340 }}>
        <div className="hero-photo-inner container">
          <div className="hero-eyebrow">Plan your visit</div>
          <h1>We would love to meet you this Sunday.</h1>
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

          <div className="hero-actions">
            <button className="button button-primary" onClick={() => navigate('/prayer')}>
              Have a question first? Reach out <ChevronRight size={16} />
            </button>
            <a
              className="button button-secondary"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CHURCH_ADDRESS)}`}
              target="_blank"
              rel="noreferrer"
            >
              Get Directions
            </a>
          </div>
        </div>
      </section>
    </>
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
          <img src={pastorPhotoSrc} alt="Pastor Dave Evans with his wife" />
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
            <p>Every message works through the Bible verse by verse, so you can follow along and take it home with you.</p>
          </div>
          <img src={pastorPreachingSrc} alt="Pastor Dave preaching on a Sunday morning" />
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
      </div>
    </section>
  )
}

function GroupsPage() {
  useDocumentHead({
    title: 'Groups & Events',
    description: 'Find Life Groups, Bible Study, His Kids, the Prayer Team, and upcoming events at His Place Community Church.',
  })

  const { data: events, status } = useSheetData(EVENTS_SHEET_URL, fallbackEvents, mapEventRow)

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

        <div className="two-col">
          <img src={hisKidsLogoSrc} alt="His Kids ministry logo" style={{ borderRadius: '14px' }} />
          <div>
            <div className="section-label">His Kids</div>
            <h2>Loved. Known. Made for more.</h2>
            <p>Our kids ministry gives children a safe, fun place to learn about Jesus during the Sunday gathering, with games, crafts, and Bible stories geared for their age.</p>
          </div>
        </div>

        <div className="three-up-grid">
          <ShellCard>
            <Users size={22} className="icon-red" />
            <h3>Life Groups</h3>
            <p>Small groups where people can grow in faith, build friendships, and walk through life together around God's Word.</p>
          </ShellCard>
          <ShellCard>
            <BookOpen size={22} className="icon-red" />
            <h3>Bible Study</h3>
            <p>Verse by verse study that helps people understand Scripture clearly and apply it faithfully.</p>
          </ShellCard>
          <ShellCard>
            <Heart size={22} className="icon-red" />
            <h3>Prayer Team</h3>
            <p>A place for people who want to stand in the gap for others and believe God for breakthrough, comfort, and hope.</p>
          </ShellCard>
        </div>

        <div className="stack-md">
          <div className="events-heading-row">
            <h2 style={{ margin: 0 }}>Upcoming Events</h2>
            <p className="events-helper-text">Updated from our Google Sheet.</p>
          </div>
          <div className="events-grid">
            {events.map((event) => (
              <ShellCard key={event.id || event.title} className="event-card">
                <div className="event-time-pill"><CalendarDays size={13} /> {event.time || 'See details'}</div>
                <div className="event-location">{event.location || CHURCH_ADDRESS}</div>
                <h3>{event.title}</h3>
                <p>{event.description || 'More details coming soon.'}</p>
              </ShellCard>
            ))}
          </div>
          <SheetStatusNote status={status} emptyLabel="Check back soon for upcoming events." />
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
            <ShellCard key={item.id} className="event-card">
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
  useDocumentHead({ title: 'Sermons', description: 'Watch and revisit recent messages from His Place Community Church.' })
  const { data: sermons, status } = useSheetData(SERMONS_URL, fallbackSermons, mapSermonRow)

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Sermons</div>
          <h1>Latest Sermons</h1>
        </div>
        <div className="events-grid">
          {sermons.map((sermon) => (
            <ShellCard key={sermon.id} className="event-card">
              <div className="event-meta-wrap">
                <div className="event-time-pill">{sermon.date || 'Latest Message'}</div>
                <div className="event-location">{sermon.speaker || 'Pastor Dave Evans'}</div>
              </div>
              <h3>{sermon.title}</h3>
              {sermon.youtube ? (
                <p><a href={sermon.youtube} target="_blank" rel="noopener noreferrer">Watch sermon</a></p>
              ) : (
                <p>Video link coming soon.</p>
              )}
            </ShellCard>
          ))}
        </div>
        <SheetStatusNote status={status} emptyLabel="Check back soon for the latest message." />
      </div>
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

    window.location.href = `mailto:${PRAYER_EMAIL}?subject=${subject}&body=${body}`
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
        </div>

        <ShellCard className="prayer-form-card">
          <h2>Prayer Request Form</h2>
          <p>
            This opens an email to {PRAYER_EMAIL} with your request pre-filled. Prefer to
            email us directly instead? <a href={`mailto:${PRAYER_EMAIL}`}>Click here</a>.
          </p>
          <form className="prayer-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="prayer-name">Your name</label>
              <input id="prayer-name" name="name" type="text" required />
            </div>
            <div className="form-field">
              <label htmlFor="prayer-email">Email address</label>
              <input id="prayer-email" name="email" type="email" required />
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
                Your email app should be opening now. If nothing happens, please email {PRAYER_EMAIL} directly.
              </p>
            )}
          </form>
        </ShellCard>
      </div>
    </section>
  )
}

function Footer() {
  const location = useLocation()
  const atHome = useMemo(() => location.pathname === '/', [location.pathname])

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <img src={logoSrc} alt="His Place logo" className="footer-logo" />
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
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="footer-link">{item.label}</NavLink>
            ))}
            {!atHome && (
              <a href={GIVING_URL} className="footer-link" target="_blank" rel="noreferrer">Give</a>
            )}
          </div>
        </div>
        <div>
          <div className="footer-heading">Connect</div>
          <div className="footer-contact-list">
            <div className="footer-contact-item"><MapPin size={15} /> {CHURCH_ADDRESS}</div>
            <div className="footer-contact-item"><Clock size={15} /> Sundays at 11:00 AM</div>
            <div className="footer-contact-item"><Mail size={15} /> <a href={`mailto:${PRAYER_EMAIL}`}>{PRAYER_EMAIL}</a></div>
            <div className="footer-contact-item">
              <a href="https://www.facebook.com/profile.php?id=61583261639613" target="_blank" rel="noopener noreferrer">
                Follow us on Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/visit" element={<VisitPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faith" element={<FaithPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/sermons" element={<SermonsPage />} />
          <Route path="/prayer" element={<PrayerPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
