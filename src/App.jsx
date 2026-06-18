import {
  Heart,
  CalendarDays,
  Users,
  HandHeart,
  Church,
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

const GIVING_URL = 'hhttps://his-place-community-church-533980.churchcenter.com/giving'
const CHURCH_ADDRESS = '523 Cincinnati-Batavia Pike, Cincinnati, Ohio 45244'
const SUNDAY_SERVICE_TIME = 'Sundays at 11:00 AM'

const navItems = [
  { to: '/', label: 'Home' },
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
  {
    title: 'Midweek Bible Study',
    time: 'Wednesdays at 6:30 PM',
    location: CHURCH_ADDRESS,
    description:
      'A deeper look at Scripture with discussion, encouragement, and prayer for everyday life.',
  },
  {
    title: 'Prayer Night',
    time: 'First Thursday of each month',
    location: CHURCH_ADDRESS,
    description:
      'A focused evening to seek the Lord together and pray for families, healing, salvation, and our community.',
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

const groups = [
  {
    icon: Users,
    title: 'Life Groups',
    text:
      'Small groups where people can grow in faith, build friendships, and walk through life together around God’s Word.',
  },
  {
    icon: BookOpen,
    title: 'Bible Study',
    text:
      'Verse by verse study that helps people understand Scripture clearly and apply it faithfully.',
  },
  {
    icon: Heart,
    title: 'Prayer Team',
    text:
      'A place for people who want to stand in the gap for others and believe God for breakthrough, comfort, and hope.',
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
          <a
            className="button button-primary nav-give"
            href={GIVING_URL}
            target="_blank"
            rel="noreferrer"
          >
            Give
          </a>
        </nav>

        <button
          className="menu-button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
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
            <a
              className="button button-primary mobile-give"
              href={VENMO_LINK}
              target="_blank"
              rel="noreferrer"
            >
              Give
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState(fallbackAnnouncements)
  const [sermons, setSermons] = useState(fallbackSermons)
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false)
  const [sermonsLoaded, setSermonsLoaded] = useState(false)

  useEffect(() => {
    if (!ANNOUNCEMENTS_URL) {
      setAnnouncementsLoaded(true)
      return
    }

    let cancelled = false

    fetch(ANNOUNCEMENTS_URL)
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return

        const normalized = rows
          .map((row, index) => ({
            id: row.id || row.ID || `${row.title || row.Title || 'announcement'}-${index}`,
            title: row.title || row.Title || '',
            date: row.date || row.Date || '',
            text: row.text || row.Text || '',
          }))
          .filter((row) => row.title)

        if (normalized.length) setAnnouncements(normalized)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAnnouncementsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!SERMONS_URL) {
      setSermonsLoaded(true)
      return
    }

    let cancelled = false

    fetch(SERMONS_URL)
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return

        const normalized = rows
          .map((row, index) => ({
            id: row.id || row.ID || `${row.title || row.Title || 'sermon'}-${index}`,
            title: row.title || row.Title || '',
            speaker: row.speaker || row.Speaker || '',
            date: row.date || row.Date || '',
            youtube: row.youtube || row.YouTube || row.Youtube || '',
          }))
          .filter((row) => row.title)

        if (normalized.length) setSermons(normalized)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSermonsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="hero-section">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />
        <div className="container hero-grid">
          <div className="hero-copy fade-up">
            <div className="eyebrow-pill">
              <Church size={16} /> A Bible based, Jesus following church
            </div>
            <h1>
              A place to <span>belong</span>, believe, and grow in Christ.
            </h1>
            <p>
              His Place Community Church is a welcoming church family rooted in Scripture,
              centered on Jesus, and passionate about prayer, discipleship, and authentic
              community. Join us every Sunday at 11:00 AM at {CHURCH_ADDRESS}.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => navigate('/groups')}>
                Plan Your Visit <ChevronRight size={18} />
              </button>
              <button className="button button-secondary" onClick={() => navigate('/prayer')}>
                Submit a Prayer Request
              </button>
              <a
                className="button button-light"
                href={VENMO_LINK}
                target="_blank"
                rel="noreferrer"
              >
                Give
              </a>
            </div>

            <div className="feature-grid">
              {[
                ['Sunday Service', 'Join us Sundays at 11:00 AM.'],
                ['Location', CHURCH_ADDRESS],
                ['Community Focused', 'We care for people deeply and genuinely.'],
              ].map(([title, text]) => (
                <ShellCard key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </ShellCard>
              ))}
            </div>
          </div>

          <div className="hero-image-wrap fade-in">
            <div className="hero-image-card">
              <img
                src={pastorPhotoSrc}
                alt="His Place Community Church family"
                className="hero-image"
              />
              <div className="hero-overlay-card">
                <div className="hero-overlay-top">Welcome Home</div>
                <div className="hero-overlay-title">
                  Come as you are. Meet Jesus. Find community.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container three-up-grid">
          {[
            {
              icon: MapPin,
              title: 'Address',
              text: CHURCH_ADDRESS,
            },
            {
              icon: Clock,
              title: 'Sunday Service',
              text: 'Every Sunday at 11:00 AM.',
            },
            {
              icon: Heart,
              title: 'Our Heart',
              text: 'To create a place where people can encounter Jesus, grow in faith, and be cared for like family.',
            },
          ].map((item) => (
            <ShellCard key={item.title} className="icon-card">
              <item.icon className="icon-red" size={40} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </ShellCard>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container stack-lg">
          <div className="page-intro max-3xl">
            <div className="eyebrow-pill">Announcements</div>
            <h2>Latest Announcements</h2>
            <p>Stay up to date with what is happening at His Place Community Church.</p>
          </div>

          <div className="events-grid">
            {announcements.slice(0, 3).map((item) => (
              <ShellCard key={item.id} className="event-card">
                <div className="event-meta-wrap">
                  <div className="event-time-pill">{item.date || 'Update'}</div>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text || 'More details coming soon.'}</p>
                </div>
              </ShellCard>
            ))}
          </div>

          {!announcementsLoaded && (
            <p className="events-helper-text">Loading announcements...</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container stack-lg">
          <div className="page-intro max-3xl">
            <div className="eyebrow-pill">Sermons</div>
            <h2>Latest Sermons</h2>
            <p>Watch and revisit recent messages from His Place Community Church.</p>
          </div>

          <div className="events-grid">
            {sermons.slice(0, 3).map((sermon) => (
              <ShellCard key={sermon.id} className="event-card">
                <div className="event-meta-wrap">
                  <div className="event-time-pill">{sermon.date || 'Latest Message'}</div>
                  <div className="event-location">
                    {sermon.speaker || 'His Place Community Church'}
                  </div>
                </div>
                <div>
                  <h3>{sermon.title}</h3>
                  {sermon.youtube ? (
                    <p>
                      <a href={sermon.youtube} target="_blank" rel="noopener noreferrer">
                        Watch Sermon
                      </a>
                    </p>
                  ) : (
                    <p>Video link coming soon.</p>
                  )}
                </div>
              </ShellCard>
            ))}
          </div>

          {!sermonsLoaded && <p className="events-helper-text">Loading sermons...</p>}
        </div>
      </section>

      <section id="giving" className="section section-giving">
        <div className="container giving-grid">
          <div>
            <div className="eyebrow-soft">
              <HandHeart size={16} /> Support the mission
            </div>
            <h2>Partner with what God is building through His Place.</h2>
            <p>
              Your generosity helps support ministry, outreach, discipleship, prayer, and
              the practical needs of building a healthy local church. Every gift makes a
              difference.
            </p>
          </div>
          <ShellCard className="giving-card">
            <h3>Online Giving</h3>
            <p>
              Give securely through Venmo to support the mission and ministry of His Place
              Community Church.
            </p>
            <a
              className="button button-primary full-width"
              href={VENMO_LINK}
              target="_blank"
              rel="noreferrer"
            >
              Give Now
            </a>
          </ShellCard>
        </div>
      </section>
    </>
  )
}

function AboutPage() {
  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="page-intro max-3xl">
          <div className="eyebrow-pill">About His Place Community Church</div>
          <h1>A church family built on truth, grace, and the presence of Jesus.</h1>
          <p>
            His Place Community Church exists to help people know Jesus, understand the
            Bible, grow in their faith, and experience real Christian community. We believe
            church should be a place where people are welcomed, discipled, prayed for, and
            encouraged to walk closely with God.
          </p>
        </div>

        <div className="two-col-about">
          <ShellCard className="image-card overflow-hidden">
            <img
              src={pastorPhotoSrc}
              alt="Pastor Dave Evans with family"
              className="about-image"
            />
          </ShellCard>
          <ShellCard className="bio-card">
            <div className="section-label">Meet the Pastor</div>
            <h2>Pastor Dave Evans</h2>
            <div className="stack-md muted-copy">
              <p>
                Pastor Dave Evans is passionate about helping people encounter Jesus in a
                real way and grow deeper in their understanding of God’s Word. He has a
                heart for biblical preaching, meaningful discipleship, prayer, and creating
                a church culture where people feel seen, loved, and welcomed.
              </p>
              <p>
                His vision for His Place Community Church is simple: to build a Christ
                centered church family where truth is taught clearly, grace is extended
                freely, and people are encouraged to follow Jesus wholeheartedly in everyday
                life.
              </p>
              <p>
                Dave cares deeply about reaching people who may feel overlooked, worn down,
                or spiritually hungry. He desires for His Place to be a church where people
                can find hope, healing, purpose, and a genuine sense of belonging.
              </p>
            </div>
          </ShellCard>
        </div>

        <div className="three-up-grid">
          {[
            [
              'Our Mission',
              'To point people to Jesus, teach the Bible faithfully, and build a loving church family that reflects the heart of God.',
            ],
            [
              'Our Vision',
              'To be a healthy, growing community church where lives are transformed through the gospel and the power of the Holy Spirit.',
            ],
            [
              'Our Culture',
              'Warm, prayerful, biblical, welcoming, and centered on authentic relationships rather than performance.',
            ],
          ].map(([title, text]) => (
            <ShellCard key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </ShellCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaithPage() {
  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="page-intro max-3xl">
          <div className="eyebrow-pill">Statement of Faith</div>
          <h1>What we believe</h1>
          <p>
            His Place Community Church is a non denominational, Bible based, Jesus
            following church. These core convictions shape our preaching, discipleship,
            prayer, and mission.
          </p>
        </div>

        <div className="faith-grid">
          {faithItems.map((item) => (
            <ShellCard key={item.title}>
              <div className="faith-title-row">
                <div className="icon-badge">
                  <Cross size={18} className="icon-red" />
                </div>
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
  const [events, setEvents] = useState(fallbackEvents)
  const [eventsLoaded, setEventsLoaded] = useState(false)

  useEffect(() => {
    if (!EVENTS_SHEET_URL) {
      setEventsLoaded(true)
      return
    }

    let cancelled = false

    fetch(EVENTS_SHEET_URL)
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return

        const normalized = rows
          .map((row, index) => ({
            id: row.id || row.ID || `${row.Title || row.title || 'event'}-${index}`,
            title: row.Title || row.title || '',
            time: row.Time || row.time || '',
            location: row.Location || row.location || '',
            description: row.Description || row.description || '',
          }))
          .filter((row) => row.title)

        if (normalized.length) setEvents(normalized)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEventsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="page-intro max-3xl">
          <div className="eyebrow-pill">Groups and Events</div>
          <h1>Grow together in community</h1>
          <p>
            We believe life change happens not only in worship gatherings, but also in
            smaller spaces where people can learn, pray, share, and support one another.
          </p>
        </div>

        <div className="three-up-grid">
          {groups.map((group) => (
            <ShellCard key={group.title} className="icon-card">
              <group.icon className="icon-red" size={40} />
              <h3>{group.title}</h3>
              <p>{group.text}</p>
            </ShellCard>
          ))}
        </div>

        <div className="stack-md">
          <div className="events-heading-row">
            <div>
              <h2>Upcoming Events</h2>
              <p className="events-helper-text">
                {EVENTS_SHEET_URL
                  ? 'These events can be updated from your Google Sheet.'
                  : 'Add your Google Sheet URL in src/App.jsx to manage events without editing code.'}
              </p>
            </div>
          </div>
          <div className="events-grid">
            {events.map((event) => (
              <ShellCard key={event.id || event.title} className="event-card">
                <div className="event-meta-wrap">
                  <div className="event-time-pill">
                    <CalendarDays size={16} /> {event.time || 'See details'}
                  </div>
                  <div className="event-location">
                    {event.location || CHURCH_ADDRESS}
                  </div>
                </div>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.description || 'More details coming soon.'}</p>
                </div>
              </ShellCard>
            ))}
          </div>
          {!eventsLoaded && <p className="events-helper-text">Loading events...</p>}
        </div>
      </div>
    </section>
  )
}

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(fallbackAnnouncements)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!ANNOUNCEMENTS_URL) {
      setLoaded(true)
      return
    }

    let cancelled = false

    fetch(ANNOUNCEMENTS_URL)
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return

        const normalized = rows
          .map((row, index) => ({
            id: row.id || row.ID || `${row.title || row.Title || 'announcement'}-${index}`,
            title: row.title || row.Title || '',
            date: row.date || row.Date || '',
            text: row.text || row.Text || '',
          }))
          .filter((row) => row.title)

        if (normalized.length) setAnnouncements(normalized)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="page-intro max-3xl">
          <div className="eyebrow-pill">Announcements</div>
          <h1>Latest Announcements</h1>
          <p>Stay up to date with what is happening at His Place Community Church.</p>
        </div>

        <div className="events-grid">
          {announcements.map((item) => (
            <ShellCard key={item.id} className="event-card">
              <div className="event-meta-wrap">
                <div className="event-time-pill">{item.date || 'Update'}</div>
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text || 'More details coming soon.'}</p>
              </div>
            </ShellCard>
          ))}
        </div>

        {!loaded && <p className="events-helper-text">Loading announcements...</p>}
      </div>
    </section>
  )
}

function SermonsPage() {
  const [sermons, setSermons] = useState(fallbackSermons)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!SERMONS_URL) {
      setLoaded(true)
      return
    }

    let cancelled = false

    fetch(SERMONS_URL)
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return

        const normalized = rows
          .map((row, index) => ({
            id: row.id || row.ID || `${row.title || row.Title || 'sermon'}-${index}`,
            title: row.title || row.Title || '',
            speaker: row.speaker || row.Speaker || '',
            date: row.date || row.Date || '',
            youtube: row.youtube || row.YouTube || row.Youtube || '',
          }))
          .filter((row) => row.title)

        if (normalized.length) setSermons(normalized)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="page-intro max-3xl">
          <div className="eyebrow-pill">Sermons</div>
          <h1>Latest Sermons</h1>
          <p>Watch and revisit recent messages from His Place Community Church.</p>
        </div>

        <div className="events-grid">
          {sermons.map((sermon) => (
            <ShellCard key={sermon.id} className="event-card">
              <div className="event-meta-wrap">
                <div className="event-time-pill">{sermon.date || 'Latest Message'}</div>
                <div className="event-location">
                  {sermon.speaker || 'His Place Community Church'}
                </div>
              </div>
              <div>
                <h3>{sermon.title}</h3>
                {sermon.youtube ? (
                  <p>
                    <a href={sermon.youtube} target="_blank" rel="noopener noreferrer">
                      Watch Sermon
                    </a>
                  </p>
                ) : (
                  <p>Video link coming soon.</p>
                )}
              </div>
            </ShellCard>
          ))}
        </div>

        {!loaded && <p className="events-helper-text">Loading sermons...</p>}
      </div>
    </section>
  )
}

function PrayerPage() {
  return (
    <section className="section page-section">
      <div className="container prayer-grid">
        <div className="stack-lg">
          <div className="page-intro max-3xl">
            <div className="eyebrow-pill">Prayer</div>
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
              <ShellCard key={item} className="prayer-note-card">
                <p>{item}</p>
              </ShellCard>
            ))}
          </div>
        </div>

        <ShellCard className="prayer-form-card">
          <h2>Prayer Request Form</h2>
          <p>This form can be connected to your email, website platform, or form service.</p>
          <form
            className="prayer-form"
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              const name = encodeURIComponent(data.get('name') || '')
              const email = encodeURIComponent(data.get('email') || '')
              const request = encodeURIComponent(data.get('request') || '')
              window.location.href = `mailto:info@hpcchurch.church?subject=Prayer%20Request%20from%20${name}&body=Name:%20${name}%0AEmail:%20${email}%0A%0APrayer%20Request:%0A${request}`
            }}
          >
            <input name="name" type="text" placeholder="Your name" required />
            <input name="email" type="email" placeholder="Email address" required />
            <textarea name="request" placeholder="How can we pray for you?" rows="8" required />
            <button type="submit" className="button button-primary full-width">
              <Send size={16} /> Submit Prayer Request
            </button>
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
              <NavLink key={item.to} to={item.to} className="footer-link">
                {item.label}
              </NavLink>
            ))}
            {!atHome && (
              <a href={VENMO_LINK} className="footer-link" target="_blank" rel="noreferrer">
                Give
              </a>
            )}
          </div>
        </div>
        <div>
          <div className="footer-heading">Connect</div>
          <div className="footer-contact-list">
            <div className="footer-contact-item">
              <MapPin size={16} className="icon-red" /> {CHURCH_ADDRESS}
            </div>
            <div className="footer-contact-item">
              <Clock size={16} className="icon-red" /> Sundays at 11:00 AM
            </div>
            <div className="footer-contact-item">
              <Mail size={16} className="icon-red" /> info@hpcchurch.church
            </div>
            <div className="footer-contact-item">
              <a
                href="https://www.facebook.com/profile.php?id=61583261639613"
                target="_blank"
                rel="noopener noreferrer"
              >
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
  return (
    <div className="app-shell">
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
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
