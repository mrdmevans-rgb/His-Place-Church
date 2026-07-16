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
  Shirt,
  Baby,
  ParkingCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import logoSrc from './assets/Logo.jpg'
import pastorPhotoSrc from './assets/pastor-family.jpg'

const GIVING_URL = 'https://his-place-community-church-533980.churchcenter.com/giving'
const CHURCH_ADDRESS = '523 Cincinnati-Batavia Pike, Cincinnati, Ohio 45244'
const SUNDAY_SERVICE_TIME = 'Sundays at 11:00 AM'
const CHURCH_SLOGAN = 'Real People. Real Hope. Real Jesus.'
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

const visitFaqs = [
  {
    icon: Clock,
    title: 'How long is the service?',
    text: 'Our Sunday gathering runs about 75 minutes, including worship, teaching, and prayer.',
  },
  {
    icon: Shirt,
    title: 'What should I wear?',
    text: 'Come as you are. You will see everything from jeans to Sunday best — wear what is comfortable.',
  },
  {
    icon: Baby,
    title: 'What about my kids?',
    text: 'Children are always welcome in the main service, and we would love to help you get settled.',
  },
  {
    icon: ParkingCircle,
    title: 'Where do I park?',
    text: `Parking is available on-site at ${CHURCH_ADDRESS}. Look for a greeter near the entrance.`,
  },
]

/**
 * Lightweight per-page document head updates (title + description + Open Graph).
 * Avoids adding a new dependency (e.g. react-helmet-async) since we can't confirm
 * what's already installed in this project.
 */
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
