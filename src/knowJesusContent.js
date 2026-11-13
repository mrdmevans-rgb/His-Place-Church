/* ------------------------------------------------------------------
   Know Jesus page content.
   This one file feeds both the website page and the Word copy used for
   pastoral review, so edit the wording here and both stay in sync.
   Scripture comes from src/scripture.js (NASB).
------------------------------------------------------------------- */

import { verse, BIBLE_NOTICE } from './scripture'

export const knowJesus = {
  title: 'Know Jesus',
  headline: 'The best news you will ever hear.',
  intro: [
    "Maybe you grew up in church and drifted away. Maybe you've never opened a Bible. Maybe life has worn you down and you're wondering if God is even there.",
    "Wherever you're starting from, you're welcome here. Here's the good news of Jesus, straight from the Bible.",
  ],

  steps: [
    {
      heading: 'God made you, and He loves you',
      body: [
        "You aren't an accident. God created you on purpose, in His own image, to know Him and walk with Him. His love for you isn't something you have to earn. It's who He is.",
      ],
      verses: [
        verse('gen1:27'),
        verse('john3:16'),
      ],
    },
    {
      heading: 'Sin separates us from God',
      body: [
        "Here's the hard part. Every one of us has turned away from God and gone our own way. The Bible calls that sin. It isn't only the wrong things we do. It's a heart that wants to run life without Him.",
        "Sin breaks our relationship with a holy God, and no amount of trying harder can fix it on our own.",
      ],
      verses: [
        verse('rom3:23'),
        verse('isa59:2'),
      ],
    },
    {
      heading: 'Jesus came to rescue us',
      body: [
        "God didn't leave us there. He sent His Son, Jesus, who is fully God and fully man. Jesus lived the sinless life we couldn't live. Then He died on the cross in our place, taking the punishment our sin deserved.",
        "Three days later He rose from the grave, bodily and gloriously alive, defeating sin and death. Jesus isn't one way among many. He's the only way back to the Father.",
      ],
      verses: [
        verse('rom5:8'),
        verse('1pet2:24'),
        verse('1cor15:3-4'),
        verse('john14:6'),
      ],
    },
    {
      heading: 'Salvation is a free gift',
      body: [
        "You can't earn your way to God by being good enough, going to church enough, or cleaning up your life first. Forgiveness and eternal life are a free gift, paid for in full by Jesus. It's grace from start to finish.",
      ],
      verses: [
        verse('eph2:8-9'),
        verse('rom6:23'),
      ],
    },
    {
      heading: 'Turn to Him and trust Him',
      body: [
        "Receiving God's gift means two things that go together. Repent, which means turning away from your sin and your own way. And believe, which means putting your whole trust in Jesus, in who He is and what He did for you.",
        "You don't have to get everything right first. You come to Jesus just as you are.",
      ],
      verses: [
        verse('mark1:15'),
        verse('rom10:9'),
        verse('john1:12'),
      ],
    },
  ],

  prayer: {
    heading: 'Is there something I should pray?',
    body: [
      "There are no magic words. A prayer doesn't save you. Jesus does, when you put your trust in Him. But many people find it helpful to tell God what's happening in their heart. If that's you, you could pray something like this:",
    ],
    text: "God, I know I've sinned and gone my own way, and I can't fix that on my own. I believe Jesus is Your Son. I believe He died on the cross for my sins and rose again from the dead. Right now I turn from my sin, and I put my trust in Jesus as my Savior and Lord. Thank You for forgiving me and giving me new life. Help me follow You from this day on. In Jesus' name, amen.",
  },

  promises: {
    heading: 'If you just put your trust in Jesus',
    body: ["Welcome to the family of God! Here's what the Bible says is now true of you."],
    items: [
      { title: "You're forgiven", ...verse('rom8:1') },
      { title: "You're made new", ...verse('2cor5:17') },
      { title: "God's Spirit lives in you", ...verse('eph1:13') },
      { title: 'You can know you have eternal life', ...verse('1john5:13') },
    ],
  },

  nextSteps: {
    heading: 'Your next steps',
    items: [
      { title: 'Tell someone', text: "Let us know using the form on this page, or tell a Christian friend. We'd love to celebrate with you and help you take your next steps." },
      { title: 'Start reading the Bible', text: 'The Gospel of John is a great place to begin. Read a chapter a day and get to know Jesus for yourself.' },
      { title: 'Talk with God every day', text: "Prayer is simply talking with God. You don't need fancy words. Just be honest with Him." },
      { title: 'Join a church family', text: "Following Jesus was never meant to be done alone. Come worship with us on Sundays at 11:00 AM and find a group where you can grow." },
      { title: 'Be baptized', text: "Jesus told His followers to be baptized as a public picture of their new life in Him. Baptism isn't what saves you. Jesus does. But it's an important step of obedience. We don't have dates set yet, but we'd love to talk with you about it.", verse: verse('matt28:19') },
    ],
  },

  notSure: {
    heading: 'Not sure yet?',
    body: [
      "That's okay. Honest questions are welcome here, and you don't have to have it all figured out. Jesus invites people who are tired, doubting, and searching to come to Him. We'd be glad to talk, pray with you, or just listen.",
    ],
    verse: verse('matt11:28'),
  },

  formOptions: [
    'I put my trust in Jesus today',
    "I'm coming back to Jesus after time away",
    'I have questions',
    "I'm interested in baptism",
    'Please pray for me',
  ],

  translationNote: BIBLE_NOTICE,
}
