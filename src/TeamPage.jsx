import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, portalConfigured } from './portal/supabase'

// Public Meet the Team page. Shows only bios an admin has approved.
export default function TeamPage() {
  const [team, setTeam] = useState(null)
  useEffect(() => {
    document.title = 'Meet the Team | His Place Community Church'
    if (!portalConfigured) { setTeam([]); return }
    supabase.from('team_bios').select('profile_id, display_name, title, bio, photo_path, sort_order')
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
        {team === null ? <p className="events-helper-text">Loading...</p> : team.length === 0 ? (
          <div className="card"><h3>Coming soon</h3><p>We're putting together introductions to our team. In the meantime, <Link to="/about">meet Pastor Dave</Link> or <Link to="/visit">plan a visit</Link> and say hello in person.</p></div>
        ) : (
          <div className="team-grid">
            {team.map((t) => (
              <article className="team-card" key={t.profile_id}>
                {photo(t.photo_path)
                  ? <img src={photo(t.photo_path)} alt={t.display_name} loading="lazy" decoding="async" />
                  : <div className="team-initials" aria-hidden="true">{initials(t.display_name)}</div>}
                <h2>{t.display_name}</h2>
                {t.title && <div className="team-title">{t.title}</div>}
                {t.bio && <p>{t.bio}</p>}
              </article>
            ))}
          </div>
        )}
        <div className="card cta-card">
          <div><h3>Want to serve with us?</h3><p>There's a place for you on the team.</p></div>
          <Link to="/serve" className="button button-primary">Serve with us</Link>
        </div>
      </div>
    </section>
  )
}
