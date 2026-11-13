import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, RotateCcw, Send } from 'lucide-react'
import { resourceById } from './resourcesContent'
import ResourceCard from './ResourceCard'
import { verse, BIBLE_LABEL } from './scripture'

/* ------------------------------------------------------------------
   His Place guided helper.
   Every answer below is written ahead of time. Nothing is generated,
   so the helper only ever says what the church has approved.
   Scripture comes from src/scripture.js (NASB).
------------------------------------------------------------------- */

const MAIN_CHOICES = [
  ['crisis', "I'm in crisis right now"],
  ['food', 'Food'],
  ['housing', 'Rent or housing'],
  ['utilities', 'Utility bills'],
  ['clothing', 'Clothing or baby items'],
  ['health', 'Health or mental health'],
  ['recovery', 'Addiction recovery'],
  ['hard', "I'm going through something hard"],
  ['bible', 'Reading the Bible'],
  ['jesus', 'I want to know Jesus'],
  ['prayer', 'Please pray for me'],
  ['visit', 'Visiting His Place'],
  ['person', 'Talk to a real person'],
]

const AFTER_HELP = [['prayer', 'Please pray for me'], ['person', 'Talk to a real person'], ['start', 'Something else']]
const AFTER_HEART = [['prayer', 'Please pray for me'], ['person', 'Talk to a real person'], ['hard', 'Something else is weighing on me'], ['start', 'Main menu']]

const resourceNode = (id, text, ids, label) => ({
  text,
  resources: ids,
  links: [{ to: `/resources#${id}`, label: `See every place for ${label}` }],
  footer: "Not finding what you need? Call 2-1-1 any time and a real person will help you look.",
  choices: AFTER_HELP,
})

const heartNode = (text, verses, extra) => ({ text, verses, extra, choices: AFTER_HEART })

export function buildNodes({ phone, email, serviceTime, address }) {
  return {
    start: {
      text: "Hi there! I'm the His Place helper. I can point you to local help, prayer, and encouragement from the Bible. What can I help you with today?",
      choices: MAIN_CHOICES,
    },
    crisis: {
      text: "I'm really glad you reached out. If you're in danger right now, please call 911. These lines are free, open 24/7, and answered by real people:",
      resources: ['emergency', '988', 'crisis-hotline', 'ywca', 'whw'],
      footer: 'You matter, and you are not alone. When you are safe, we would love to pray with you and help however we can.',
      choices: [['prayer', 'Please pray for me'], ['person', 'Talk to someone at His Place'], ['start', 'Main menu']],
    },
    food: resourceNode('food', 'Here are some food pantries close to His Place, plus where to apply for SNAP. Please call before you go, since hours can change.', ['ipm', 'amelia-umc', 'st-bernadette', 'sem', 'salvation-army', 'jfs'], 'food'),
    housing: resourceNode('housing', "I'm sorry you're dealing with this. These places help with rent, shelter, and housing in Clermont County:", ['salvation-army', 'st-veronica', 'cccs', 'svdp', 'cmha', 'legal-aid'], 'rent and housing'),
    utilities: resourceNode('utilities', 'These places help with electric, gas, and other utility bills, including HEAP:', ['cccs', 'energy-ohio', 'salvation-army', 'st-veronica', 'seniors'], 'utility bills'),
    clothing: resourceNode('clothing', 'Here is where to find clothing, diapers, and baby items:', ['give-like-a-mother', 'cccs', 'caring-place', 'christian-help', 'impacting-tomorrow'], 'clothing and baby items'),
    health: resourceNode('health', "Taking care of your health matters, including your mental health. Here are some good places to start. If you're thinking about hurting yourself, please call or text 988 now.", ['gcbhs', 'healthsource', 'ccmhrb', 'nami', '988'], 'health care'),
    recovery: resourceNode('recovery', "Recovery is possible, and it takes courage to ask. Here are places that can help, including some that are faith based:", ['celebrate-recovery', 'gcbhs', 'ccmhrb', 'challenge-ranch', 'aa', 'na'], 'recovery'),

    hard: {
      text: "I'm sorry you're carrying something heavy. God sees you, and so do we. What's weighing on you most?",
      choices: [['anxiety', 'Worry or anxiety'], ['grief', 'Grief or loss'], ['fear', 'Fear'], ['alone', 'Feeling alone'], ['guilt', 'Guilt or shame'], ['hope', 'Losing hope'], ['family', 'Marriage or family struggles'], ['money', 'Money stress'], ['sickness', 'Sickness'], ['doubt', 'Doubting God'], ['start', 'Main menu']],
    },
    anxiety: heartNode("Worry can feel like it takes over everything. God invites you to bring it all to Him, every bit of it.", [
      verse('phil4:6-7'),
      verse('1pet5:7'),
    ], "If anxiety is making daily life hard, talking with a counselor can really help. You'll find local options under Health or mental health."),
    grief: heartNode("Losing someone or something you love is one of the hardest things there is. It's okay to grieve. God is close to you in it.", [
      verse('ps34:18'),
      verse('matt5:4'),
    ]),
    fear: heartNode("Fear is real, but it doesn't get the last word. God promises to be with you.", [
      verse('isa41:10'),
    ]),
    alone: heartNode("Feeling alone can hurt so much. You are not forgotten. God hasn't left you, and there's a church family here that would love to know you.", [
      verse('deut31:8'),
    ], `We'd love to see you. We meet ${serviceTime} at ${address}.`),
    guilt: heartNode("No matter what you've done, you are not beyond God's grace. Jesus came for people exactly like us.", [
      verse('1john1:9'),
      verse('rom8:1'),
    ], 'Want to know more about the forgiveness Jesus offers? The Know Jesus page walks through it.'),
    hope: heartNode("I'm so sorry things feel this dark. Please hear this: your life matters, and there is hope. If you've had any thoughts of ending your life, please call or text 988 right now. Someone is ready to listen.", [
      verse('rom15:13'),
      verse('matt11:28'),
    ]),

    family: {
      text: "Struggles at home hurt deeply, because these are the people closest to us. God cares about your marriage and your family, and there is hope for hurting relationships.",
      verses: [verse('eph4:2-3'), verse('col3:13')],
      extra: "If anyone at home is hurting you or you don't feel safe, please reach out now. The YWCA hotline is open any time at 513-872-9259. For counseling, look under Health or mental health.",
      choices: [['crisis', "I don't feel safe at home"], ['prayer', 'Please pray for me'], ['person', 'Talk to a real person'], ['hard', 'Something else is weighing on me'], ['start', 'Main menu']],
    },
    money: {
      text: "Money stress can keep you up at night. You don't have to carry it alone. God knows exactly what you need, and there are people nearby who can help with the practical side too.",
      verses: [verse('phil4:19'), verse('matt6:33-34')],
      extra: 'Need help with rent, utilities, or food right now? Tap one below, or call 2-1-1 any time.',
      choices: [['housing', 'Rent or housing'], ['utilities', 'Utility bills'], ['food', 'Food'], ['prayer', 'Please pray for me'], ['person', 'Talk to a real person'], ['start', 'Main menu']],
    },
    sickness: {
      text: "Being sick, or watching someone you love go through it, is so hard. God is with you in the waiting rooms, the long nights, and the hard news.",
      verses: [verse('ps46:1'), verse('2cor12:9')],
      extra: "We would love to pray for you or your loved one by name. If you need help finding care, look under Health or mental health.",
      choices: [['prayer', 'Please pray for me'], ['health', 'Health or mental health'], ['person', 'Talk to a real person'], ['start', 'Main menu']],
    },
    doubt: {
      text: "Doubts and hard questions don't scare God, and they don't scare us either. Some of the most honest prayers in the Bible came from people who were struggling to believe.",
      verses: [verse('mark9:24'), verse('james1:5')],
      extra: "Bring your questions. We'd love to talk them through with you, with no pressure.",
      links: [{ to: '/know-jesus', label: 'Read the Know Jesus page' }],
      choices: [['person', 'Talk to a real person'], ['jesus', 'Who is Jesus?'], ['start', 'Main menu']],
    },

    bible: {
      text: "The Bible can feel big at first, but you don't have to figure it out alone. A great place to start is the Gospel of John. Read one chapter a day and ask, what does this show me about Jesus? Before you read, ask God to help you understand. Then think about how it applies to your life.",
      extra: "Have questions as you read? We'd love to talk. Our groups also study the Bible together.",
      links: [{ to: '/study', label: 'How to study the Bible' }, { to: '/groups', label: 'See our groups and Bible studies' }],
      choices: [['jesus', 'Who is Jesus?'], ['person', 'Talk to a real person'], ['start', 'Main menu']],
    },
    jesus: {
      text: "That's the best question anyone can ask. Here's the good news in a nutshell: God made you and loves you. Our sin separates us from Him, but Jesus died in our place and rose again. When we turn to Him and trust Him, He forgives us and gives us new life. It's a gift, not something we earn.",
      verses: [verse('john3:16')],
      links: [{ to: '/know-jesus', label: 'Read the full Know Jesus page' }],
      choices: [['person', 'I want to talk to someone'], ['prayer', 'Please pray for me'], ['start', 'Main menu']],
    },
    prayer: {
      text: "We would be honored to pray for you. You can send us a prayer request, and it stays private with our prayer team.",
      links: [{ to: '/prayer', label: 'Send a prayer request' }],
      extra: phone ? `You can also call us at ${phone}.` : undefined,
      choices: [['hard', "I'm going through something hard"], ['start', 'Main menu']],
    },
    visit: {
      text: `We'd love to meet you! We meet ${serviceTime} at ${address}. Come as you are. You'll find friendly people, worship, prayer, and teaching from the Bible. There are no steps at our building, and kids are always welcome.`,
      links: [{ to: '/visit', label: "Plan your visit and let us know you're coming" }, { to: '/kids', label: 'Learn about His Kids' }],
      choices: [['person', 'Talk to a real person'], ['start', 'Main menu']],
    },
    person: {
      text: `We'd love to talk with you. Reach out any time and someone from His Place will get back to you.`,
      contact: true,
      choices: [['prayer', 'Please pray for me'], ['start', 'Main menu']],
    },
    unknown: {
      text: "I'm not sure I understood that, but I'd still like to help. Try one of these, or call 2-1-1 and a real person will help you find what you need.",
      choices: MAIN_CHOICES,
    },
  }
}

// Crisis words are checked first, every time.
// A word ending in * matches any word that starts with it (suicid* matches suicide and suicidal).
// A phrase with a space matches anywhere in the message.
const CRISIS_WORDS = ['suicid*', 'kill myself', 'end my life', 'want to die', 'better off dead', 'hurt myself', 'self harm', 'self-harm', 'overdos*', 'abuse*', 'abusive', 'hitting me', 'hits me', 'beat me', 'beats me', 'not safe', 'unsafe', 'danger', 'emergency', 'rape*', 'assault*']
const KEYWORDS = [
  ['food', ['food', 'hungry', 'pantry', 'pantries', 'groceries', 'grocery', 'snap', 'ebt', 'meal*', 'starving']],
  ['housing', ['rent', 'evict*', 'homeless', 'housing', 'shelter', 'apartment', 'mortgage', 'place to stay', 'section 8', 'landlord']],
  ['utilities', ['electric*', 'utility', 'utilities', 'gas bill', 'water bill', 'heat', 'heating', 'heap', 'power', 'shut off', 'shutoff', 'disconnect*', 'bill', 'bills']],
  ['clothing', ['cloth*', 'diaper*', 'baby', 'coat*', 'shoes', 'formula', 'pregnan*']],
  ['recovery', ['drug*', 'alcohol*', 'addict*', 'drinking', 'sober*', 'recovery', 'relapse*', 'opioid*', 'pills']],
  ['money', ['money', 'debt*', 'broke', 'afford', 'paycheck', 'financ*', 'laid off', 'lost my job', 'fired', 'unemploy*', 'job']],
  ['grief', ['grief', 'griev*', 'died', 'death', 'passed away', 'funeral', 'miscarriage', 'loss', 'lost my']],
  ['sickness', ['sick', 'cancer', 'diagnos*', 'illness', 'surgery', 'hospital*', 'chemo*', 'tumor*']],
  ['health', ['doctor*', 'health', 'medical', 'counsel*', 'therap*', 'depress*', 'mental', 'dentist', 'dental', 'medicine']],
  ['family', ['marriage', 'married', 'husband', 'wife', 'divorce*', 'separated', 'spouse', 'family', 'parenting', 'teenager*', 'custody']],
  ['anxiety', ['anxi*', 'worry', 'worried', 'worrying', 'stress*', 'panic*', 'overwhelm*']],
  ['fear', ['afraid', 'scared', 'fear*', 'terrified']],
  ['alone', ['alone', 'lonely', 'loneliness', 'no friends', 'nobody', 'isolated']],
  ['guilt', ['guilt*', 'shame*', 'forgiv*', 'sin', 'sins', 'sinned', 'ashamed', 'regret*']],
  ['hope', ['hopeless*', 'no hope', 'give up', 'giving up', 'cant go on', "can't go on", 'pointless']],
  ['hard', ['hard time', 'struggling', 'struggle', 'going through', 'rough time', 'heavy', 'broken', 'hurting']],
  ['doubt', ['doubt*', 'unsure', "don't believe", 'dont believe', 'is god real', 'not sure', 'question*', 'skeptic*']],
  ['jesus', ['jesus', 'saved', 'salvation', 'christian', 'believe', 'god', 'heaven', 'born again']],
  ['bible', ['bible', 'scripture*', 'verse*', 'read', 'reading']],
  ['prayer', ['pray*']],
  ['visit', ['sunday', 'sundays', 'service', 'visit*', 'where', 'address', 'church', 'kids', 'children', 'wear', 'directions']],
  ['person', ['talk', 'person', 'pastor', 'call', 'someone', 'human', 'contact', 'email']],
]

const matches = (text, tokens, w) => {
  if (w.includes(' ')) return text.includes(w)
  if (w.endsWith('*')) return tokens.some((t) => t.startsWith(w.slice(0, -1)))
  return tokens.includes(w)
}

export function matchTopic(input) {
  const text = input.toLowerCase().replace(/[\u2019']/g, "'")
  const tokens = text.split(/[^a-z0-9']+/).filter(Boolean)
  if (CRISIS_WORDS.some((w) => matches(text, tokens, w))) return 'crisis'
  for (const [node, words] of KEYWORDS) if (words.some((w) => matches(text, tokens, w))) return node
  return 'unknown'
}

function Verse({ v }) {
  return (
    <blockquote className="chat-verse">
      <p>{v.text}</p>
      <cite>{v.ref} {BIBLE_LABEL}</cite>
    </blockquote>
  )
}

export default function HelperChat({ phone, email, serviceTime, address }) {
  const nodes = buildNodes({ phone, email, serviceTime, address })
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState([{ who: 'bot', node: 'start' }])
  const [input, setInput] = useState('')
  const lastRef = useRef(null)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (open) lastRef.current?.scrollIntoView({ block: 'start' })
  }, [log, open])

  useEffect(() => {
    if (!open) return undefined
    panelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const go = (nodeId, label) => {
    if (nodeId === 'start') {
      setLog((l) => [...l, { who: 'me', text: label }, { who: 'bot', node: 'start' }])
      return
    }
    setLog((l) => [...l, { who: 'me', text: label }, { who: 'bot', node: nodeId }])
  }

  const submit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    go(matchTopic(text), text)
  }

  const restart = () => setLog([{ who: 'bot', node: 'start' }])
  const lastBot = [...log].reverse().find((m) => m.who === 'bot')

  return (
    <>
      {!open && (
        <button ref={buttonRef} type="button" className="chat-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <MessageCircle size={20} aria-hidden="true" />
          <span>Need help?</span>
        </button>
      )}

      {open && (
        <div className="chat-panel" role="dialog" aria-modal="false" aria-label="His Place helper" ref={panelRef} tabIndex={-1}>
          <div className="chat-header">
            <div>
              <div className="chat-title">His Place Helper</div>
              <div className="chat-sub">Local help, prayer, and hope</div>
            </div>
            <div className="chat-header-actions">
              <button type="button" onClick={restart} aria-label="Start over"><RotateCcw size={17} /></button>
              <button type="button" onClick={close} aria-label="Close helper"><X size={19} /></button>
            </div>
          </div>

          <div className="chat-safety">
            In danger? Call <a href="tel:911">911</a>. In crisis? Call or text <a href="tel:988">988</a>.
          </div>

          <div className="chat-log" aria-live="polite">
            {log.map((m, i) => {
              if (m.who === 'me') return <div key={i} className="chat-msg me">{m.text}</div>
              const n = nodes[m.node]
              const isLast = m === lastBot
              return (
                <div key={i} className="chat-msg bot" ref={isLast ? lastRef : undefined}>
                  <p>{n.text}</p>
                  {n.verses && n.verses.map((v) => <Verse key={v.ref} v={v} />)}
                  {n.resources && (
                    <div className="chat-resources">
                      {n.resources.map((id) => resourceById[id] && <ResourceCard key={id} r={resourceById[id]} compact />)}
                    </div>
                  )}
                  {n.extra && <p>{n.extra}</p>}
                  {n.contact && (
                    <div className="chat-contact">
                      {phone && <a className="button button-primary" href={`tel:${phone.replace(/[^\d]/g, '')}`}>Call {phone}</a>}
                      <a className="button button-secondary" href={`mailto:${email}`}>Email {email}</a>
                    </div>
                  )}
                  {n.links && (
                    <div className="chat-links">
                      {n.links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>)}
                    </div>
                  )}
                  {n.footer && <p className="chat-footnote">{n.footer}</p>}
                  {isLast && n.choices && (
                    <div className="chat-choices">
                      {n.choices.map(([id, label]) => (
                        <button key={id + label} type="button" onClick={() => go(id, label)}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <form className="chat-input" onSubmit={submit}>
            <label htmlFor="chat-text" className="sr-only">Type a word, like food or prayer</label>
            <input id="chat-text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Or type a word, like rent or prayer" autoComplete="off" />
            <button type="submit" aria-label="Send"><Send size={17} /></button>
          </form>
          <div className="chat-disclaimer">This helper shares answers written by His Place. It is not a person and does not use AI.</div>
        </div>
      )}
    </>
  )
}
