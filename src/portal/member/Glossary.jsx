import { useState } from 'react'
import { WORDS } from '../../content/words'
import { useApproved } from '../../seekers'

// Church Words Decoded inside the portal: the first time a church word shows up in a
// paragraph, it gets a dotted underline. Tap it to see what it means.
// Only on once a pastor approves Church Words (Leader Portal > Content to review).
const FORMS = WORDS.flatMap((w) => [w.word, ...w.also].map((f) => [f.toLowerCase(), w]))
  .sort((a, b) => b[0].length - a[0].length)
const RE = new RegExp(`\\b(${FORMS.map(([f]) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")).join('|')})\\b`, 'gi')
const lookup = (t) => FORMS.find(([f]) => f === t.toLowerCase().replace('’', "'"))?.[1]

function Term({ text, w }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="gl-wrap">
      <button type="button" className="gl-term" aria-expanded={open} onClick={() => setOpen(!open)} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>{text}</button>
      {open && <span className="gl-pop" role="note"><strong>{w.word}</strong> {w.means}</span>}
    </span>
  )
}

export function Glossed({ text }) {
  const approved = useApproved()
  if (!approved?.words || !text) return text
  const out = []
  const used = new Set()
  let last = 0
  for (const m of text.matchAll(RE)) {
    const w = lookup(m[0])
    if (!w || used.has(w.word)) continue
    used.add(w.word)
    out.push(text.slice(last, m.index), <Term key={m.index} text={m[0]} w={w} />)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return <>{out}</>
}
