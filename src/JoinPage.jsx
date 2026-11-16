import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, HeartHandshake, MessageCircleQuestion, Users } from 'lucide-react'
import { supabase, portalConfigured } from './portal/supabase'
import { useDocumentHead } from './head'

// Public page where someone asks for member portal access.
// An admin reviews each request in the portal before an account is made.
const PERKS = [
  [BookOpen, 'Bible studies', 'Video studies from trusted, Bible teaching pastors, each with a study guide.'],
  [HeartHandshake, 'Prayer and care', 'Pray for one another, sign up to bring a meal, and help each other out.'],
  [MessageCircleQuestion, 'Ask the Pastor', 'Send a question privately and get an answer from our pastor.'],
  [Users, 'Church family', 'A directory, gatherings during the week, and a shared reading plan.'],
]

export default function JoinPage() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', message: '', website: '' })
  const [state, setState] = useState({ sending: false, done: false, error: '' })
  useDocumentHead({ title: 'Request Member Access', description: 'Ask to join the His Place member portal: Bible studies, a shared reading plan, the prayer wall, and ways to care for each other all week long.' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const name = form.full_name.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    if (name.length < 2) return setState({ ...state, error: 'Please enter your full name.' })
    if (!email && !phone) return setState({ ...state, error: 'Please give us an email address or a phone number so we can reach you.' })
    // A hidden field people never see. Automated spam fills it in.
    if (form.website) return setState({ sending: false, done: true, error: '' })
    setState({ sending: true, done: false, error: '' })
    const { error } = await supabase.from('membership_requests').insert({ full_name: name, email, phone, message: form.message.trim() })
    if (error) return setState({ sending: false, done: false, error: 'Something went wrong sending your request. Please try again, or let us know on Sunday.' })
    // Let the admins know someone is waiting. If email isn't set up, this does nothing.
    fetch('/api/notify', { method: 'POST' }).catch(() => {})
    setState({ sending: false, done: true, error: '' })
  }

  return (
    <section className="section page-section">
      <div className="container join-grid">
        <div className="stack-lg">
          <div className="section-intro">
            <div className="section-label">Member portal</div>
            <h1>Grow together all week long</h1>
            <p>
              We only have our building on Sundays, but our church family doesn't stop there.
              The member portal is a private place for His Place folks to study God's Word,
              pray for each other, and stay connected between Sundays.
            </p>
          </div>
          <div className="join-perks">
            {PERKS.map(([Icon, title, text]) => (
              <div className="card join-perk" key={title}>
                <Icon size={22} aria-hidden="true" />
                <div><h3>{title}</h3><p>{text}</p></div>
              </div>
            ))}
          </div>
          <p>Already have access? <Link to="/portal">Member login</Link></p>
        </div>

        <div className="card join-form-card">
          {state.done ? (
            <div role="status">
              <h2>Thank you!</h2>
              <p>We got your request. Someone from our church will look it over and reach out with your login, usually within a few days.</p>
              <p><Link to="/">Back to home</Link></p>
            </div>
          ) : !portalConfigured ? (
            <p>The member portal isn't available right now. Please ask us on Sunday.</p>
          ) : (
            <form className="prayer-form" onSubmit={submit} noValidate>
              <h2>Request member access</h2>
              <p>The portal is for people who call His Place their church. A pastor or admin reviews every request.</p>
              <div className="form-field">
                <label htmlFor="join-name">Your full name</label>
                <input id="join-name" value={form.full_name} onChange={set('full_name')} autoComplete="name" maxLength={120} required />
              </div>
              <div className="form-field">
                <label htmlFor="join-email">Email address</label>
                <input id="join-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={200} />
              </div>
              <div className="form-field">
                <label htmlFor="join-phone">Phone number</label>
                <input id="join-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} />
                <small>Email or phone, whichever is easier. No email? That's fine, we'll text you a login.</small>
              </div>
              <div className="form-field">
                <label htmlFor="join-msg">Anything you'd like us to know? (optional)</label>
                <textarea id="join-msg" rows="4" value={form.message} onChange={set('message')} maxLength={1000} />
              </div>
              <div className="join-hp" aria-hidden="true">
                <label htmlFor="join-website">Leave this empty</label>
                <input id="join-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>
              {state.error && <p className="join-error" role="alert">{state.error}</p>}
              <button type="submit" className="button button-primary full-width" disabled={state.sending}>
                {state.sending ? 'Sending...' : 'Send my request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
