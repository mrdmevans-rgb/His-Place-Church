import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, portalConfigured } from './portal/supabase'
import { useDocumentHead } from './head'

// Public Meet the Team page. Shows only bios an admin has approved.
// Keep the admin's order, grouping people under their section headings.
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
          <div className="team-grid" aria-busy="true" aria-label="Loading the team">{[0, 1, 2].map((i) => <div className="team-card team-skeleton" key={i}><div className="team-initials" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>
        ) : team.length === 0 ? (
          <div className="card"><h3>Coming soon</h3><p>We're putting together introductions to our team. In the meantime, <Link to="/about">meet Pastor Dave</Link> or <Link to="/visit">plan a visit</Link> and say hello in person.</p></div>
        ) : (
          groups(team).map(([section, people]) => (
          <div key={section || 'none'} className="team-section">
          {section ? <h2 className="team-section-title">{section}</h2> : <h2 className="sr-only">Our team</h2>}
          <div className="team-grid">
            {people.map((t) => (
              <article className="team-card" key={t.profile_id}>
                {photo(t.photo_path)
                  ? <img src={photo(t.photo_path)} alt={t.display_name} width="160" height="160" loading="lazy" decoding="async" />
                  : <div className="team-initials" aria-hidden="true">{initials(t.display_name)}</div>}
                <h3>{t.display_name}</h3>
                {t.title && <div className="team-title">{t.title}</div>}
                {t.bio && <p>{t.bio}</p>}
              </article>
            ))}
          </div>
          </div>
          ))
        )}
        <div className="card cta-card">
          <div><h3>Want to serve with us?</h3><p>There's a place for you on the team.</p></div>
          <Link to="/serve" className="button button-primary">Serve with us</Link>
        </div>
      </div>
    </section>
  )
}
