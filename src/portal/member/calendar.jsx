import { CalendarPlus } from 'lucide-react'

// "Add to my calendar" for Google, and a calendar file that works with
// iPhone, Android, Outlook, and Apple Calendar.
const pad = (n) => String(n).padStart(2, '0')
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dayStamp = (iso) => iso.replace(/-/g, '')
const nextDay = (iso) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` }
const icsText = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

// Either start (a date and time) or date (YYYY-MM-DD, all day).
export function CalendarLinks({ id, title, start, date, minutes = 120, location = '', details = '' }) {
  const allDay = !start
  const begin = allDay ? null : new Date(start)
  const end = allDay ? null : new Date(begin.getTime() + minutes * 60000)
  const dates = allDay ? `${dayStamp(date)}/${nextDay(date)}` : `${utcStamp(begin)}/${utcStamp(end)}`
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details, location })}`
  const ics = () => {
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//His Place Community Church//Portal//EN', 'BEGIN:VEVENT',
      `UID:${id || title}@hpcchurch.church`,
      `DTSTAMP:${utcStamp(new Date())}`,
      allDay ? `DTSTART;VALUE=DATE:${dayStamp(date)}` : `DTSTART:${utcStamp(begin)}`,
      allDay ? `DTEND;VALUE=DATE:${nextDay(date)}` : `DTEND:${utcStamp(end)}`,
      `SUMMARY:${icsText(title)}`,
      location && `LOCATION:${icsText(location)}`,
      details && `DESCRIPTION:${icsText(details)}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n')
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'event'}.ics` })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <span className="m-cal">
      <CalendarPlus size={14} aria-hidden="true" />
      <span>Add to my calendar:</span>
      <a href={google} target="_blank" rel="noopener noreferrer">Google</a>
      <button type="button" className="p-link" onClick={ics}>iPhone, Outlook, or other</button>
    </span>
  )
}
