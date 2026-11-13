import { Phone, MapPin, Clock, Globe, MessageSquare } from 'lucide-react'

const digits = (n) => n.replace(/[^\d]/g, '')
const mapsUrl = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
const hasStreetAddress = (address) => /\d/.test(address || '')

export default function ResourceCard({ r, compact = false }) {
  return (
    <article className={`resource-card${compact ? ' compact' : ''}`}>
      <h3>{r.name}</h3>
      {r.town && <div className="resource-town">{r.town}</div>}
      <p className="resource-services">{r.services}</p>

      {r.phones && r.phones.length > 0 && (
        <div className="resource-phones">
          {r.phones.map((ph) => (
            <a
              key={ph.number + (ph.label || '')}
              className="resource-call"
              href={ph.text && ph.label && /^text$/i.test(ph.label) ? `sms:${digits(ph.number)}` : `tel:${digits(ph.number)}`}
            >
              {ph.text && ph.label && /^text$/i.test(ph.label) ? <MessageSquare size={14} /> : <Phone size={14} />}
              <span>
                {ph.label && <span className="resource-call-label">{ph.label}: </span>}
                {ph.number}
              </span>
            </a>
          ))}
        </div>
      )}

      {!compact && (
        <div className="resource-meta">
          {r.hours && (
            <div><Clock size={14} aria-hidden="true" /> <span>{r.hours}</span></div>
          )}
          {r.address && (
            <div>
              <MapPin size={14} aria-hidden="true" />{' '}
              {hasStreetAddress(r.address) ? (
                <a href={mapsUrl(r.address)} target="_blank" rel="noopener noreferrer">{r.address}</a>
              ) : (
                <span>{r.address}</span>
              )}
            </div>
          )}
          {r.web && (
            <div>
              <Globe size={14} aria-hidden="true" />{' '}
              <a href={`https://${r.web}`} target="_blank" rel="noopener noreferrer">{r.web}</a>
            </div>
          )}
        </div>
      )}
      {compact && r.hours && <div className="resource-hours-small">{r.hours}</div>}
    </article>
  )
}
