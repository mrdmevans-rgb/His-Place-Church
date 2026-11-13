/* ------------------------------------------------------------------
   How to Study the Bible page content.
   This one file feeds the website page and the Word review copy.
   NASB verses come from src/scripture.js. The three King James quotes
   below are public domain and quoted exactly.
------------------------------------------------------------------- */
import { verse, BIBLE_NOTICE } from './scripture'

const kjv = (ref, text) => ({ ref, text, label: 'KJV' })

export const study = {
  title: 'How to Study the Bible',
  headline: 'Read it. Understand it. Live it.',
  intro: [
    "The Bible isn't a book only scholars can understand. God gave it so ordinary people could know Him, and He wants you to understand it.",
    "This page will help you read with confidence: a simple method, why context matters so much, how the original Greek and Hebrew can open up a verse, and a few common mix ups to watch for.",
  ],
  introVerses: [verse('2tim3:16-17'), verse('ps119:105')],

  method: {
    heading: 'A simple way to study any passage',
    body: "Start with prayer. Ask God to help you understand and to change you through what you read. Then walk through three questions.",
    prayerVerse: verse('ps119:18'),
    steps: [
      {
        title: 'Observe: What does it say?',
        text: 'Slow down and read the passage more than once. Notice who is speaking, who is listening, what is happening, and any words that repeat. Write down what you see before deciding what it means.',
      },
      {
        title: 'Interpret: What did it mean to the first readers?',
        text: 'Ask what the writer meant for the people who first heard it. Read the verses before and after. Think about the time, place, and situation. Let clear passages help explain harder ones, because Scripture never contradicts itself.',
      },
      {
        title: 'Apply: What does it mean for my life?',
        text: 'Ask what this shows you about God, about yourself, and how you should live. Is there a promise to trust, a command to obey, or a sin to turn from? Pick one thing to put into practice this week.',
      },
    ],
    closing: "The believers in Berea were praised for checking everything they heard against Scripture. That's a great habit for us too.",
    closingVerse: verse('acts17:11'),
  },

  context: {
    heading: 'Why context matters',
    body: "A verse pulled out of its setting can be made to say almost anything. A good rule of thumb: a passage can't mean something today that it never meant to the people it was first written to. Here are three kinds of context to look for.",
    items: [
      { title: 'The surrounding verses', text: 'Read the whole paragraph, and often the whole chapter. Chapter and verse numbers were added many centuries after the Bible was written, so a thought often carries across them.' },
      { title: 'The history and culture', text: "Who wrote this, to whom, and why? A letter to a church facing persecution, a song of worship, and a law for Israel in the wilderness all read differently. A good study Bible's book introductions will help." },
      { title: 'The kind of writing', text: "The Bible includes history, poetry, wisdom sayings, prophecy, Gospels, and letters. Psalms and Proverbs use poetry and picture language. Proverbs share wise general truths about life, not guaranteed promises for every situation." },
    ],
  },

  words: {
    heading: 'Greek and Hebrew: when one English word is not enough',
    body: "The Old Testament was written mostly in Hebrew, and the New Testament in Greek. Good translations are reliable, but sometimes one English word can't carry everything the original word holds. Here are a few examples. The Strong's number lets you look each one up yourself.",
    items: [
      {
        word: 'Gentle or meek',
        original: 'praus (Greek, G4239)',
        text: "In Matthew 5:5 the NASB says \"gentle\" while the KJV and ESV say \"meek.\" Both translate praus. Today \"meek\" can sound weak, but praus describes strength under control. Jesus uses the same word for Himself in Matthew 11:29, and the Greek Old Testament uses it for Moses in Numbers 12:3.",
        verses: [verse('matt5:5'), verse('matt11:29')],
      },
      {
        word: 'Repent',
        original: 'metanoeo (Greek, G3340) and shuv (Hebrew, H7725)',
        text: 'Repentance is more than feeling sorry. The Greek word is about a change of mind that leads to a change of direction. The Hebrew word often used for it simply means to turn or return. Repenting means turning away from sin and turning toward God.',
      },
      {
        word: 'LORD and Lord',
        original: 'YHWH (Hebrew, H3068) and Adonai (Hebrew, H136)',
        text: 'When your Bible prints LORD in small capital letters, it stands for God\'s personal name, YHWH. When it prints Lord in regular letters, it usually translates Adonai, meaning master. Noticing the difference shows you when the text is using God\'s covenant name.',
      },
      {
        word: 'Lovingkindness',
        original: 'chesed (Hebrew, H2617)',
        text: "The NASB 1995 often translates chesed as \"lovingkindness.\" It's God's loyal, faithful, covenant love. It isn't a passing feeling but a love that keeps its promises.",
      },
      {
        word: 'Peace',
        original: 'shalom (Hebrew, H7965)',
        text: 'Shalom means much more than the absence of conflict. It carries the idea of wholeness, well-being, and everything being as it should be.',
      },
      {
        word: 'Hell',
        original: "Sheol (Hebrew, H7585), Hades (G86), Gehenna (G1067)",
        text: "Older translations often use \"hell\" for several different words. Sheol in the Old Testament and Hades in the New refer to the realm of the dead. Gehenna, named after a valley outside Jerusalem, is the word Jesus most often used for final judgment. The NASB usually keeps Sheol and Hades as they are, which helps you see the difference.",
      },
    ],
  },

  drift: {
    heading: "When English changes, not the Bible",
    body: "Some words in older translations have changed meaning since 1611. The Bible didn't change, our English did. Here are three examples from the King James Version.",
    items: [
      { word: 'Charity', text: 'In 1611 "charity" meant love. In 1 Corinthians 13 it translates agape (G26), the same word other translations render "love."', verse: kjv('1 Corinthians 13:13', 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.') },
      { word: 'Conversation', text: 'In 1611 "conversation" meant your whole way of life, not just talking. Modern translations say "conduct" here.', verse: kjv('Philippians 1:27', 'Only let your conversation be as it becometh the gospel of Christ.') },
      { word: 'Prevent', text: 'In 1611 "prevent" meant to go before. Paul is saying the living will not go ahead of believers who have died.', verse: kjv('1 Thessalonians 4:15', 'For this we say unto you by the word of the Lord, that we which are alive and remain unto the coming of the Lord shall not prevent them which are asleep.') },
    ],
  },

  pitfalls: {
    heading: 'Word study mistakes to avoid',
    body: 'Word studies are a gift, but they can be misused. Watch out for these.',
    items: [
      { title: 'Reading modern words back into ancient ones', text: 'You may hear that dunamis (G1411), the Greek word for power, means "dynamite." Dynamite wasn\'t invented until the 1860s, so Paul could never have meant that. Dunamis means power or ability, and that\'s powerful enough.' },
      { title: 'Making a word mean too much', text: 'A word can have several meanings, but in any one verse it usually carries just one. Don\'t pile every possible meaning from the dictionary into a single verse. Let the context decide.' },
      { title: 'Forcing a word to always mean one thing', text: 'You may hear that agape is always God\'s perfect love and phileo is a lesser kind. But in 2 Timothy 4:10, Demas is said to have agape-loved this present world. Words get their meaning from how they\'re used.' },
    ],
  },

  blb: {
    heading: 'How to use Blue Letter Bible',
    body: 'Blue Letter Bible is a free website and app with powerful study tools. Here is a simple way to do a word study.',
    steps: [
      'Go to blueletterbible.org and type a verse in the search box, like Matthew 5:5. Choose the NASB from the version list if you like.',
      'Find the verse and open its tools. Choose Interlinear to see each English word next to the original Greek or Hebrew word.',
      'Each original word has a Strong\'s number. G means Greek and H means Hebrew, like G4239 for praus.',
      'Click the Strong\'s number. You\'ll see the word\'s definitions and a list of every verse where it appears.',
      'Read several of those verses. Seeing how a word is used across Scripture is the best way to understand it.',
    ],
    url: 'https://www.blueletterbible.org',
  },

  misconceptions: {
    heading: 'Common misconceptions',
    items: [
      { claim: '"Money is the root of all evil."', truth: 'The verse actually says the love of money is a root of all sorts of evil. Money itself is not the problem. Loving it is.', verses: [verse('1tim6:10')] },
      { claim: '"God helps those who help themselves."', truth: "This isn't in the Bible. It's an old proverb made popular by Benjamin Franklin. The gospel says the opposite: God helps those who can't help themselves.", verses: [verse('rom5:6')] },
      { claim: '"God will never give you more than you can handle."', truth: '1 Corinthians 10:13 is about temptation. God always provides a way to endure it without sinning. But Paul also describes being burdened beyond his strength. Hard times can be more than we can handle on our own, which is exactly why we depend on God.', verses: [verse('1cor10:13'), verse('2cor1:8')] },
      { claim: '"The Bible says don\'t judge."', truth: "In Matthew 7, Jesus warns against hypocritical, self-righteous judging. A few verses later He says to take the log out of your own eye so you can help your brother. Elsewhere He tells us to judge with righteous judgment.", verses: [verse('matt7:1'), verse('matt7:5'), verse('john7:24')] },
      { claim: 'Jeremiah 29:11 is a promise that my plans will succeed.', truth: 'God spoke these words to Israel living in exile in Babylon, and He told them it would be seventy years before they came home. It reveals God\'s faithful heart toward His people even in hard seasons. It isn\'t a guarantee that our personal plans will work out the way we want.', verses: [verse('jer29:10-11')] },
      { claim: 'Philippians 4:13 means I can achieve anything I set my mind to.', truth: 'Paul wrote it about contentment. Whether he had plenty or was going hungry, Christ gave him strength to be content and faithful.', verses: [verse('phil4:11-13')] },
      { claim: '"Where two or three are gathered" means Jesus only shows up when we meet in groups.', truth: 'In Matthew 18, Jesus is talking about the church restoring a brother who has sinned. He promises to stand behind that process. Jesus is always with His people, even when you are alone.', verses: [verse('matt18:20')] },
    ],
  },

  faqs: {
    heading: 'Questions people ask about studying the Bible',
    items: [
      { q: 'Which translation should I use?', a: "Some translations go word for word, like the NASB, ESV, NKJV, and KJV. Others go thought for thought, like the NLT, which can be easier to read. At His Place we use the NASB because it stays very close to the original wording. The best translation is one you'll actually read, and comparing two can be very helpful." },
      { q: 'Where should I start?', a: 'Start with the Gospel of John to get to know Jesus. Then try Mark, Acts, and Romans. Psalms and Proverbs are great for daily reading alongside.' },
      { q: 'How much should I read each day?', a: "Consistency matters more than quantity. One chapter, or even a few verses read slowly and prayerfully, is a great start." },
      { q: 'Do I need to learn Greek or Hebrew?', a: "No. Good translations are trustworthy. Free tools like Blue Letter Bible let anyone look at the original words when they want to dig deeper." },
      { q: 'What is a concordance, lexicon, interlinear, or commentary?', a: "A concordance lists every place a word appears. A lexicon is a dictionary of Greek or Hebrew words. An interlinear shows the original language alongside the English. A commentary is a teacher's explanation of a passage. Commentaries are helpful, but read the Bible itself first." },
      { q: "What if I don't understand something?", a: "You're in good company. Even Peter said some of Paul's writing was hard to understand. Pray, reread the context, compare translations, and ask. We'd love to help.", verses: [verse('2pet3:16')] },
      { q: 'Does the Old Testament still matter?', a: 'Absolutely. The whole Bible tells one story, and it points to Jesus. After His resurrection, Jesus Himself walked through the Old Testament to show how it spoke about Him.', verses: [verse('luke24:27')] },
    ],
  },

  next: {
    heading: 'Study together',
    body: "The Bible was meant to be read in community. Join one of our groups, the men's breakfast and Bible study, or the women's book and Bible study. And if you ever have a question, just ask.",
  },

  notice: BIBLE_NOTICE,
}
