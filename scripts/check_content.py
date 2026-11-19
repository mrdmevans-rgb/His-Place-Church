"""
Check the Seven Days of Hope, Honest Questions, and Church Words content.

  python3 -I scripts/check_content.py KJV.json

KJV.json: the public-domain King James Version as JSON (github.com/thiagobodruk/bible, json/en_kjv.json).
Checks that every Bible reference exists, that key claims match their passages, that every
quoted verse is one of the verified verses in src/scripture.js, and that there are no dashes.
"""
import json, re, subprocess, sys

ROOT = __file__.rsplit('/scripts/', 1)[0]
bible = {b['name'].lower(): b for b in json.load(open(sys.argv[1], encoding='utf-8-sig'))}
bible['psalm'] = bible['psalms']

def passage(ref):
    m = re.match(r'^(.+?) (\d+)(?::(\d+)(?:-(\d+))?)?$', ref)
    if not m: raise ValueError(f'bad reference {ref}')
    b = bible.get(m.group(1).lower())
    if not b: raise ValueError(f'unknown book in {ref}')
    ch = int(m.group(2))
    if ch > len(b['chapters']): raise ValueError(f'no chapter in {ref}')
    vs = b['chapters'][ch - 1]
    if not m.group(3): return ' '.join(vs)
    a, z = int(m.group(3)), int(m.group(4) or m.group(3))
    if z > len(vs) or a > z: raise ValueError(f'no verses in {ref}')
    return ' '.join(vs[a - 1:z])

# Load the content through Node so we read exactly what the site uses.
js = "import('%s/src/content/hope.js').then(async h=>{const q=await import('%s/src/content/questions.js');const w=await import('%s/src/content/words.js');const n=await import('%s/src/content/nextSteps.js');const s=await import('%s/src/scripture.js');const keys={};for(const k of [...h.HOPE.days.map(d=>d.verse),...q.QUESTIONS.flatMap(x=>x.verses),n.NEXT_STEPS.welcome,...n.NEXT_STEPS.steps.map(x=>x.verse).filter(Boolean)]){try{keys[k]=s.verse(k)}catch(e){keys[k]=null}}console.log(JSON.stringify({hope:h.HOPE,questions:q.QUESTIONS,words:w.WORDS,next:n.NEXT_STEPS,keys}))})" % ((ROOT,) * 5)
data = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
problems = []

# What each passage must actually say for the teaching about it to be right.
CLAIMS = {
    'John 1:35-51': ['come and see', 'What seek ye', 'where dwellest'],
    'John 3:1-21': ['Nicodemus', 'by night', 'born again', 'not his Son into the world to condemn'],
    'John 4:1-42': ['well', 'living water', 'told me all things that ever I did'],
    'John 6:16-21': ['walking on the sea', 'It is I; be not afraid', 'immediately the ship was at the land'],
    'John 11:17-44': ['four days', 'Jesus wept', 'I am the resurrection, and the life', 'Lazarus, come forth'],
    'John 21:1-19': ['dine', 'lovest thou me', 'the third time', 'Follow me'],
    'John 14:1-6': ['Let not your heart be troubled', 'prepare a place', 'how can we know the way', 'I am the way'],
    'John 11:35': ['Jesus wept'], 'Mark 2:17': ['sick'], 'Matthew 23:4': ['heavy burdens'],
    '2 Corinthians 1:8-10': ['despaired even of life'], 'Psalm 150:6': ['Praise ye the LORD'],
    'Romans 3:23': ['all have sinned'], 'Ephesians 2:8-9': ['by grace'], 'Titus 3:5': ['mercy'], 'Hebrews 11:1': ['faith'],
    'Acts 3:19': ['Repent'], 'Romans 10:9-10': ['saved'], 'Romans 5:1': ['justified'], '2 Corinthians 5:21': ['righteousness'],
    '1 Thessalonians 4:3': ['sanctification'], 'Ephesians 1:7': ['redemption'], 'Romans 3:24-25': ['redemption'],
    'John 3:3-7': ['born again'], 'John 14:16-17': ['Comforter', 'Spirit of truth'], 'Matthew 28:19': ['Father', 'Son', 'Holy Ghost'],
    '1 Peter 1:15-16': ['holy'], 'Romans 6:3-4': ['baptized', 'buried'], '1 Corinthians 11:23-26': ['bread', 'cup'],
    'Matthew 28:19-20': ['teach all nations'], 'Hebrews 8:10': ['covenant'], 'Acts 2:42': ['fellowship'],
    'Revelation 12:11': ['testimony'], 'Romans 12:1': ['service'], '2 Corinthians 1:20': ['Amen'],
    '2 Timothy 3:16-17': ['inspiration of God'], '1 Corinthians 15:3-4': ['died for our sins', 'rose again'],
    'John 20:24-29': ['Thomas'], 'Luke 24:13-32': ['Emmaus', 'scriptures'], 'Acts 4:12': ['none other name'],
    'Mark 2:13-17': ['publicans and sinners'], 'Luke 15:11-24': ['ran, and fell on his neck'], 'Psalm 51': ['Have mercy upon me'],
    '1 Timothy 1:15-16': ['save sinners'], 'Matthew 6:25-34': ['Take no thought'], 'Psalm 46': ['refuge and strength'],
    'John 20:30-31': ['that ye might believe'], 'John 10:7-11': ['I am the door'], 'Romans 10:9-13': ['saved'],
    'Ephesians 4:2-3': ['forbearing one another'], 'Matthew 23:1-4': ['heavy burdens'], 'Acts 17:11': ['searched the scriptures'],
    'John 11:32-36': ['Jesus wept'],
}
norm = lambda s: re.sub(r'[^a-z ]', '', s.lower().replace('æ', 'ae'))

refs = [d['read'] for d in data['hope']['days']] + [r for q in data['questions'] for r in q['more']] + [w['ref'] for w in data['words']]
inline = []
for q in data['questions']:
    for para in q['a']: inline += re.findall(r'\(((?:\d )?[A-Z][a-z]+ \d+:\d+(?:-\d+)?)\)', para)
for ref in refs + inline:
    try:
        text = passage(ref)
        for c in CLAIMS.get(ref, []):
            if norm(c) not in norm(text): problems.append(f'{ref} does not say "{c}"')
        if ref not in CLAIMS: problems.append(f'{ref}: no claim check written yet')
    except ValueError as e:
        problems.append(str(e))
for k, v in data['keys'].items():
    if not v: problems.append(f'quoted verse {k} is not in the verified list')

def texts():
    h = data['hope']; yield h['intro']
    for d in h['days']: yield from (d['title'], *d['thought'], d['question'], d['prayer'])
    for q in data['questions']: yield from (q['q'], *q['a'])
    for w in data['words']: yield from (w['word'], w['means'])
    n = data['next']; yield from (n['title'], n['intro'])
    for st in n['steps']: yield from (st['title'], st['text'])
for t in texts():
    if '—' in t or '–' in t: problems.append('dash: ' + t[:60])
    for quoted in re.findall(r'"([^"]+)"', t):
        if quoted not in ('so be it', "it's true.", 'praise the Lord.'): problems.append(f'unverified quote: "{quoted[:60]}"')

if problems: print('\n'.join(problems)); sys.exit(1)
print(f"All good: {len(data['hope']['days'])} days, {len(data['questions'])} questions, {len(data['words'])} words, {len(data['next']['steps'])} next steps, {len(set(refs + inline))} references checked.")
