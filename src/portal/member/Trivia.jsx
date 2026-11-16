import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase, friendlyError } from '../supabase'
import { gatewayUrl } from './shared'

// The daily Bible question. Members choose first; the server only reveals the answer after.
export default function DailyQuestion() {
  const [t, setT] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { supabase.rpc('trivia_today').then(({ data }) => setT(data || null)) }, [])
  if (!t) return null
  const choose = async (i) => {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('trivia_answer', { p_choice: i })
    if (error) setErr(friendlyError(error)); else setT(data)
    setBusy(false)
  }
  const done = t.answered
  return (
    <div className="p-card m-trivia">
      <h2 className="p-card-title">Daily Bible question</h2>
      <p className="m-trivia-q">{t.question}</p>
      <div className="m-trivia-choices" role="group" aria-label="Choose an answer">
        {t.choices.map((c, i) => {
          const right = done && i === t.answer
          const wrongPick = done && i === t.my_choice && !t.correct
          return (
            <button key={i} type="button" disabled={done || busy} onClick={() => choose(i)}
              className={`m-trivia-choice${right ? ' right' : ''}${wrongPick ? ' wrong' : ''}`}
              aria-label={`${c}${right ? ', the right answer' : ''}${wrongPick ? ', your answer' : ''}`}>
              <span className="m-trivia-letter" aria-hidden="true">{right ? <Check size={16} /> : wrongPick ? <X size={16} /> : 'ABCD'[i]}</span>
              <span>{c}</span>
            </button>
          )
        })}
      </div>
      {err && <span className="p-error-inline">{err}</span>}
      <div aria-live="polite">
        {!done ? <p className="p-small">Pick an answer to see if you're right. You get one try, and a new question comes each day.</p> : (
          <div className="m-trivia-result">
            <p className="m-trivia-verdict">{t.correct ? "That's right!" : <>Not quite. The answer is <strong>{t.choices[t.answer]}</strong>.</>}</p>
            {t.explanation && <p>{t.explanation}</p>}
            <p>Read it for yourself: <a href={gatewayUrl(t.reference)} target="_blank" rel="noopener noreferrer">{t.reference}</a></p>
            <p className="p-small">
              {t.today_count === 1 ? "You're the first to answer today." : `${t.today_count} people have answered today, and ${t.today_right} got it right.`}
              {' '}You've gotten {t.my_right} of {t.my_total} right so far. Come back tomorrow for a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
