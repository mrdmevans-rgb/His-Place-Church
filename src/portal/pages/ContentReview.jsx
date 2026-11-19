import { useEffect, useState } from 'react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Notice, PageHead, fmtDate, useMe, usePeople } from '../ui'
import { HOPE } from '../../content/hope'
import { NextStepsBody, QuestionsBody, WordsBody } from '../../seekers'
import { verse } from '../../scripture'
import { gatewayUrl } from '../member/shared'

// New teaching content stays hidden until a pastor reads it and approves it here.
const ITEMS = [
  { key: 'hope', title: 'Seven Days of Hope', what: 'A sign-up on the home page and Know Jesus page, then seven daily emails walking through the Gospel of John. Below is exactly what each email says.' },
  { key: 'questions', title: 'Honest Questions', what: 'A public page with plain answers to nine hard questions (pain, forgiveness, doubt, anxiety, church hurt, and more), linked from the Know Jesus page.' },
  { key: 'words', title: 'Church Words Decoded', what: 'A public glossary page, and pop-up definitions for these words inside Rooted lessons in the member portal.' },
  { key: 'next_steps', title: 'Next Steps', what: 'When someone checks "I put my trust in Jesus today" or "coming back" on the Know Jesus page, their response is saved, pastors are emailed, and they see this page.' },
]

function HopePreview() {
  return (
    <div className="cr-emails">
      {HOPE.days.map((d, i) => {
        const v = verse(d.verse)
        return (
          <details key={d.title} className="p-card cr-email">
            <summary><strong>Day {i + 1} of 7: {d.title}</strong></summary>
            <p><strong>Read:</strong> <a href={gatewayUrl(d.read)} target="_blank" rel="noopener noreferrer">{d.read}</a></p>
            <blockquote className="d-passage"><p>{v.text}</p><cite>{v.ref}</cite></blockquote>
            {d.thought.map((t) => <p key={t} className="d-p">{t}</p>)}
            <p><strong>Something to think about:</strong> {d.question}</p>
            <p><strong>A simple prayer:</strong> <em>{d.prayer}</em></p>
            {d.invite && <Notice tone="info">Day 7 also invites them to reply to talk with someone, links to Know Jesus, and invites them to visit on Sunday.</Notice>}
          </details>
        )
      })}
    </div>
  )
}

export default function ContentReview() {
  const me = useMe()
  const { name } = usePeople()
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState('')
  const [msg, setMsg] = useState({ tone: 'success', text: '' })
  const load = () => supabase.from('content_approvals').select('*').then(({ data }) => setRows(Object.fromEntries((data || []).map((r) => [r.key, r]))))
  useEffect(() => { load() }, [])
  if (!rows) return <p className="p-muted">Loading...</p>
  const decide = async (key, approved) => {
    const { error } = await supabase.from('content_approvals').update({ approved, approved_by: approved ? me.profile.id : null, approved_at: approved ? new Date().toISOString() : null }).eq('key', key)
    setMsg(error ? { tone: 'error', text: friendlyError(error) } : { tone: 'success', text: approved ? 'Approved. It is live on the website now.' : 'Taken down. It no longer shows on the website.' })
    load()
  }
  return (
    <>
      <PageHead title="Content to review" intro="New teaching content stays hidden until a pastor reads it and approves it. Every Bible reference was checked against the text, and quoted verses come from the NASB 1995." />
      <Notice tone={msg.tone}>{msg.text}</Notice>
      {!me.isPastoral && <Notice tone="info">You can read everything here. Only a pastor or admin can approve it.</Notice>}
      <div className="p-list">
        {ITEMS.map((it) => {
          const r = rows[it.key] || {}
          return (
            <div className="p-card" key={it.key}>
              <div className="p-item-head">
                <h2 className="p-card-title">{it.title}</h2>
                <span className="p-badges">{r.approved ? <Badge tone="success">Live{r.approved_at ? ` since ${fmtDate(r.approved_at)}` : ''}{r.approved_by ? `, approved by ${name(r.approved_by)}` : ''}</Badge> : <Badge tone="warn">Waiting for a pastor</Badge>}</span>
              </div>
              <p>{it.what}</p>
              <div className="p-row-actions">
                <button className="p-link" onClick={() => setOpen(open === it.key ? '' : it.key)} aria-expanded={open === it.key}>{open === it.key ? 'Hide the content' : 'Read the content'}</button>
                {me.isPastoral && (r.approved
                  ? <button className="button button-secondary" onClick={() => decide(it.key, false)}>Take it down</button>
                  : <button className="button button-primary" onClick={() => { if (window.confirm(`Approve ${it.title} and make it live?`)) decide(it.key, true) }}>Approve and make it live</button>)}
              </div>
              {open === it.key && (
                <div className="cr-preview">
                  {it.key === 'hope' && <HopePreview />}
                  {it.key === 'questions' && <QuestionsBody />}
                  {it.key === 'words' && <WordsBody />}
                  {it.key === 'next_steps' && <NextStepsBody />}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="p-small">Want something reworded? Note the changes and send them to whoever maintains the website. Nothing goes live until it's approved here.</p>
    </>
  )
}
