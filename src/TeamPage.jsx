import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { supabase, portalConfigured } from './portal/supabase'
import { useDocumentHead } from './head'

// Public Meet the Team page. Shows only bios an admin has approved, in the admin's order.
// The first person (the lead pastor) gets a wide featured card; everyone else gets an
// even card. Long bios show their opening, with "Read more" to open the rest in place.
function groups(team) {
  const out = []
  for (const t of team) {
    const key = (t.section || '').trim()
    let g = out.find(([s]) => s === key)
    if (!g) { g = [key, []]; out.push(g) }
    g[1].push(t)
  }
  return out
}

const paragraphs = (bio) => (bio || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
// The opening of a bio: whole paragraphs up to about `limit` characters. If the first
// paragraph alone is long, it's trimmed to a whole sentence.
function opening(bio, limit) {
  const ps = paragraphs(bio)
  if (!ps.length) return { shown: [], more: false }
  const shown = []
  let used = 0
  for (const p of ps) {
    if (shown.length && used + p.length > limit) break
    shown.push(p); used += p.length
  }
  if (shown.length === 1 && shown[0].length > limit) {
    const cut = shown[0].slice(0, limit)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    shown[0] = end > limit * 0.45 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}...`
  }
  return { shown, more: shown.length < ps.length || shown[shown.length - 1] !== ps[shown.length - 1] }
}

function Bio({ t, limit }) {
  const [open, setOpen] = useState(false)
  const { shown, more } = opening(t.bio, limit)
  const first = (t.display_name || '').split(' ')[0]
  if (!t.bio) return null
  return (
    <div className="tm-bio">
      {(open ? paragraphs(t.bio) : shown).map((p, i) => <p key={i}>{p}</p>)}
      {more && (
        <button type="button" className="tm-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : `Read more about ${first}`} <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default function TeamPage() {
  useDocumentHead({ title: 'Meet the Team', description: 'Meet the pastors, worship leaders, tech volunteers, and kids ministry leaders who serve at His Place Community Church in Amelia, Ohio.' })
  const [team, setTeam] = useState(null)
  useEffect(() => {
    if (!portalConfigured) { setTeam([]); return }
    supabase.from('team_bios').select('profile_id, display_name, title, bio, photo_path, sort_order, section')
      .eq('status', 'approved').order('sort_order').order('display_name')
      .then(({ data }) => setTeam(data || []))
  }, [])
  const photo = (p) => (p ? supabase.storage.from('team-photos').getPublicUrl(p).data.publicUrl : null)
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const Face = ({ t, size }) => (photo(t.photo_path)
    ? <img className="tm-photo" src={photo(t.photo_path)} alt={t.display_name} width={size} height={size} loading="lazy" decoding="async" />
    : <div className="tm-photo tm-initials" aria-hidden="true">{initials(t.display_name)}</div>)

  const [lead, ...rest] = team || []
  return (
    <section className="section page-section">
      <div className="container stack-lg">
        <div className="section-intro">
          <div className="section-label">Meet the team</div>
          <h1>The people who serve at His Place</h1>
          <p>Pastors, worship leaders, tech volunteers, and kids ministry leaders who love Jesus and would love to meet you.</p>
        </div>
        {team === null ? (
          // Placeholder cards hold the space so the page doesn't jump when the team loads.
          <div className="tm-grid team-loading" aria-busy="true" aria-label="Loading the team">{[0, 1, 2].map((i) => <div className="tm-card team-skeleton" key={i}><div className="tm-photo tm-initials" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>
        ) : team.length === 0 ? (
          <div className="card"><h3>Coming soon</h3><p>We're putting together introductions to our team. In the meantime, <Link to="/about">meet Pastor Dave</Link> or <Link to="/visit">plan a visit</Link> and say hello in person.</p></div>
        ) : (
          <>
            <article className="tm-feature">
              <Face t={lead} size={260} />
              <div className="tm-feature-text">
                {lead.title && <div className="tm-title">{lead.title}</div>}
                <h2>{lead.display_name}</h2>
                <Bio t={lead} limit={520} />
              </div>
            </article>
            {groups(rest).map(([section, people]) => (
              <div key={section || 'none'} className="tm-section">
                {section ? <h2 className="team-section-title">{section}</h2> : <h2 className="sr-only">Our team</h2>}
                <div className="tm-grid">
                  {people.map((t) => (
                    <article className="tm-card" key={t.profile_id}>
                      <Face t={t} size={140} />
                      <h3>{t.display_name}</h3>
                      {t.title && <div className="tm-title">{t.title}</div>}
                      <Bio t={t} limit={210} />
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        <div className="card cta-card">
          <div><h3>Want to serve with us?</h3><p>There's a place for you on the team.</p></div>
          <Link to="/serve" className="button button-primary">Serve with us</Link>
        </div>
      </div>
    </section>
  )
}
