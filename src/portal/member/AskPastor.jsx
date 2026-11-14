import { useEffect, useState } from 'react'
import { supabase, friendlyError } from '../supabase'
import { Badge, Empty, Notice, PageHead, fmtDate, useMe, usePeople, useRows } from '../ui'

function Faq() {
  const [faq, setFaq] = useState([])
  useEffect(() => { supabase.rpc('pastor_faq').then(({ data }) => setFaq(data || [])) }, [])
  if (!faq.length) return null
  return (
    <div className="p-card">
      <h2 className="p-card-title">Questions others have asked</h2>
      <p className="p-muted">Shared by the pastor with names removed.</p>
      {faq.map((f) => (
        <details key={f.id} className="m-faq">
          <summary>{f.question}</summary>
          <p className="p-pre">{f.answer}</p>
        </details>
      ))}
    </div>
  )
}

function Answer({ q, onDone }) {
  const [answer, setAnswer] = useState(q.answer)
  const [share, setShare] = useState(q.share_as_faq)
  const [fq, setFq] = useState(q.faq_question || q.question)
  const [fa, setFa] = useState(q.faq_answer || q.answer)
  const [err, setErr] = useState('')
  const save = async () => {
    if (!answer.trim()) return setErr('Write an answer first.')
    const { error } = await supabase.from('pastor_questions').update({
      answer, share_as_faq: share, faq_question: share ? fq : '', faq_answer: share ? (fa || answer) : '',
    }).eq('id', q.id)
    if (error) return setErr(friendlyError(error))
    onDone()
  }
  return (
    <div className="p-form">
      <div className="p-field"><label htmlFor={`a-${q.id}`}>Your answer (only the person who asked sees this)</label><textarea id={`a-${q.id}`} rows={5} value={answer} onChange={(e) => { setAnswer(e.target.value); if (!q.faq_answer) setFa(e.target.value) }} /></div>
      <label className="p-check"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /><span>Also share with all members as a FAQ, without their name<small>You can reword the question and answer so nothing personal is shared.</small></span></label>
      {share && (
        <>
          <div className="p-field"><label htmlFor={`fq-${q.id}`}>Question as members will see it</label><input id={`fq-${q.id}`} value={fq} maxLength={500} onChange={(e) => setFq(e.target.value)} /></div>
          <div className="p-field"><label htmlFor={`fa-${q.id}`}>Answer as members will see it</label><textarea id={`fa-${q.id}`} rows={4} value={fa} onChange={(e) => setFa(e.target.value)} /></div>
        </>
      )}
      <Notice tone="error">{err}</Notice>
      <div className="p-form-actions"><button className="button button-primary" onClick={save}>Send answer</button></div>
    </div>
  )
}

function PastorInbox() {
  const { name } = usePeople()
  const [view, setView] = useState('open')
  const { rows, reload } = useRows('pastor_questions', { filter: (q) => (view === 'open' ? q.is('answered_at', null) : q.not('answered_at', 'is', null)), deps: [view] })
  const [openId, setOpenId] = useState(null)
  return (
    <div className="p-card">
      <h2 className="p-card-title">Pastor inbox</h2>
      <div className="p-toolbar">
        <button className={`chip${view === 'open' ? ' active' : ''}`} onClick={() => setView('open')}>Waiting for an answer</button>
        <button className={`chip${view === 'answered' ? ' active' : ''}`} onClick={() => setView('answered')}>Answered</button>
      </div>
      {rows.length === 0 ? <Empty>{view === 'open' ? 'No questions waiting.' : 'No answered questions yet.'}</Empty> : rows.map((q) => (
        <div key={q.id} className="m-q">
          <div className="p-item-head"><strong>{name(q.author) || 'A member'}</strong><span className="p-meta">{fmtDate(q.created_at)}{q.share_as_faq && ' · Shared as FAQ'}</span></div>
          <p className="p-pre">{q.question}</p>
          {openId === q.id ? <Answer q={q} onDone={() => { setOpenId(null); reload() }} /> : (
            <>
              {q.answer && <p className="p-pre m-answer">{q.answer}</p>}
              <button className="button button-secondary" onClick={() => setOpenId(q.id)}>{q.answer ? 'Edit answer' : 'Answer'}</button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AskPastor() {
  const me = useMe()
  const { rows, reload } = useRows('pastor_questions', { filter: (q) => q.eq('author', me.profile.id) })
  const [question, setQuestion] = useState('')
  const [msg, setMsg] = useState({ tone: '', text: '' })
  const ask = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    const { error } = await supabase.from('pastor_questions').insert({ question: question.trim() })
    if (error) return setMsg({ tone: 'error', text: friendlyError(error) })
    setQuestion('')
    setMsg({ tone: 'success', text: "Your question was sent. The pastor's answer will show up right here." })
    reload()
  }
  return (
    <>
      <PageHead title="Ask the Pastor" intro="Ask a question about the Bible, faith, or life. Only pastors see your question. Sometimes a pastor may share a question and answer with members, always without your name." />
      {me.isPastoral && <PastorInbox />}
      <form className="p-card p-form" onSubmit={ask}>
        <h2 className="p-card-title">Your question</h2>
        <textarea rows={5} value={question} maxLength={4000} onChange={(e) => setQuestion(e.target.value)} aria-label="Your question" placeholder="What's on your heart?" />
        <Notice tone={msg.tone || 'info'}>{msg.text}</Notice>
        <div className="p-form-actions"><button className="button button-primary">Send to the pastor</button></div>
      </form>
      {rows.length > 0 && (
        <div className="p-card">
          <h2 className="p-card-title">My questions</h2>
          {rows.map((q) => (
            <div key={q.id} className="m-q">
              <div className="p-item-head"><span className="p-meta">{fmtDate(q.created_at)}</span>{q.answered_at ? <Badge tone="success">Answered</Badge> : <Badge>Waiting for an answer</Badge>}</div>
              <p className="p-pre"><strong>{q.question}</strong></p>
              {q.answer && <p className="p-pre m-answer">{q.answer}</p>}
            </div>
          ))}
        </div>
      )}
      <Faq />
    </>
  )
}
