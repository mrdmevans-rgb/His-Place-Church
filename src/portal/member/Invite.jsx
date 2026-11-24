import { useState } from 'react'
import { Copy, MessageSquare, Printer, Share2 } from 'lucide-react'
import { Notice, PageHead, useMe } from '../ui'

// Invite someone from church to the member portal: share a link from your phone,
// or print sign-up cards with a QR code to hand out on Sunday.
const JOIN = 'https://www.hpcchurch.church/join'

export default function Invite() {
  const me = useMe()
  const [msg, setMsg] = useState('')
  const name = (me.profile.full_name || '').trim()
  const link = name ? `${JOIN}?from=${encodeURIComponent(name)}` : JOIN
  const text = `Come join us on the His Place member portal! We read the Bible together, pray for each other, and stay connected all week. Ask to join here: ${link}`
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const share = async () => {
    try { await navigator.share({ title: 'His Place member portal', text }) } catch { /* they closed it */ }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg('Copied. Paste it into a text or email.') } catch { setMsg('Press and hold the message below to copy it.') }
  }
  return (
    <>
      <PageHead title="Invite someone" intro="The portal is better with more of our church family in it. Send someone the link, or print cards to hand out on Sunday." />
      <div className="p-card">
        <h2 className="p-card-title">Send an invite</h2>
        <p className="inv-text">{text}</p>
        <div className="p-row-actions">
          {canShare && <button type="button" className="button button-primary" onClick={share}><Share2 size={16} aria-hidden="true" /> Share</button>}
          <a className={`button ${canShare ? 'button-secondary' : 'button-primary'}`} href={`sms:?&body=${encodeURIComponent(text)}`}><MessageSquare size={16} aria-hidden="true" /> Text it</a>
          <button type="button" className="button button-secondary" onClick={copy}><Copy size={16} aria-hidden="true" /> Copy</button>
        </div>
        <Notice tone="success">{msg}</Notice>
        <p className="p-small">When they ask to join, an admin will see that you invited them and send them a sign-in link.</p>
      </div>
      <div className="p-card">
        <h2 className="p-card-title">Sign-up cards for Sunday</h2>
        <p>Eight cards on one page. Print, cut, and set them out at the welcome table, or hand them to someone after service. The QR code opens the page to ask to join.</p>
        <button type="button" className="button button-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print the cards</button>
        <div className="inv-sheet" aria-label="Preview of the sign-up cards">
          {Array.from({ length: 8 }, (_, i) => (
            <div className="inv-card" key={i} aria-hidden={i > 0 ? 'true' : undefined}>
              <img src="/join-qr.svg" alt={i === 0 ? 'QR code that opens hpcchurch.church/join' : ''} width="96" height="96" />
              <div>
                <strong>Join the His Place member portal</strong>
                <span>Read the Bible together, pray for each other, and stay connected all week.</span>
                <span className="inv-url">Scan, or go to hpcchurch.church/join</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
