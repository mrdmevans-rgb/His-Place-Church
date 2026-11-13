/* ------------------------------------------------------------------
   Scripture used on the website, quoted exactly from the New American
   Standard Bible. Both editions are stored. To switch the whole site,
   change BIBLE_EDITION to 'NASB2020' (or back to 'NASB1995').

   Some verses are quoted in part so they read cleanly on their own.
   Text checked against the published NASB 1995 and NASB 2020, November 2026.
   LORD in small capitals stands for God's personal name, as in the NASB.
------------------------------------------------------------------- */

export const BIBLE_EDITION = 'NASB1995'

const LABELS = { NASB1995: 'NASB1995', NASB2020: 'NASB' }
const NAMES = { NASB1995: 'New American Standard Bible (NASB 1995)', NASB2020: 'New American Standard Bible (NASB 2020)' }

export const BIBLE_LABEL = LABELS[BIBLE_EDITION]
export const BIBLE_NOTICE = `Scripture quotations are taken from the ${NAMES[BIBLE_EDITION]}, copyright The Lockman Foundation. Used by permission. lockman.org`

const REFS = {
  'gen1:27': 'Genesis 1:27', 'john3:16': 'John 3:16', 'rom3:23': 'Romans 3:23', 'isa59:2': 'Isaiah 59:2', 'rom5:8': 'Romans 5:8',
  '1pet2:24': '1 Peter 2:24', '1cor15:3-4': '1 Corinthians 15:3-4', 'john14:6': 'John 14:6', 'eph2:8-9': 'Ephesians 2:8-9',
  'rom6:23': 'Romans 6:23', 'mark1:15': 'Mark 1:15', 'rom10:9': 'Romans 10:9', 'john1:12': 'John 1:12', 'rom8:1': 'Romans 8:1',
  '2cor5:17': '2 Corinthians 5:17', 'eph1:13': 'Ephesians 1:13', '1john5:13': '1 John 5:13', 'matt28:19': 'Matthew 28:19',
  'matt11:28': 'Matthew 11:28', 'phil4:6-7': 'Philippians 4:6-7', '1pet5:7': '1 Peter 5:7', 'ps34:18': 'Psalm 34:18',
  'matt5:4': 'Matthew 5:4', 'isa41:10': 'Isaiah 41:10', 'deut31:8': 'Deuteronomy 31:8', '1john1:9': '1 John 1:9',
  'rom15:13': 'Romans 15:13', 'eph4:2-3': 'Ephesians 4:2-3', 'col3:13': 'Colossians 3:13', 'phil4:19': 'Philippians 4:19',
  'matt6:33-34': 'Matthew 6:33-34', 'ps46:1': 'Psalm 46:1', '2cor12:9': '2 Corinthians 12:9', 'mark9:24': 'Mark 9:24', 'james1:5': 'James 1:5',
  '2tim3:16-17': '2 Timothy 3:16-17', 'ps119:105': 'Psalm 119:105', 'ps119:18': 'Psalm 119:18', 'acts17:11': 'Acts 17:11', 'matt5:5': 'Matthew 5:5', 'matt11:29': 'Matthew 11:29', '1tim6:10': '1 Timothy 6:10', 'rom5:6': 'Romans 5:6', '1cor10:13': '1 Corinthians 10:13', '2cor1:8': '2 Corinthians 1:8', 'matt7:1': 'Matthew 7:1', 'matt7:5': 'Matthew 7:5', 'john7:24': 'John 7:24', 'jer29:10-11': 'Jeremiah 29:10-11', 'phil4:11-13': 'Philippians 4:11-13', 'matt18:20': 'Matthew 18:20', 'luke24:27': 'Luke 24:27', '2pet3:16': '2 Peter 3:16',
}

const TEXT = {
  NASB1995: {
    'gen1:27': 'God created man in His own image, in the image of God He created him; male and female He created them.',
    'john3:16': 'For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.',
    'rom3:23': 'For all have sinned and fall short of the glory of God.',
    'isa59:2': 'But your iniquities have made a separation between you and your God, And your sins have hidden His face from you so that He does not hear.',
    'rom5:8': 'But God demonstrates His own love toward us, in that while we were yet sinners, Christ died for us.',
    '1pet2:24': 'He Himself bore our sins in His body on the cross, so that we might die to sin and live to righteousness; for by His wounds you were healed.',
    '1cor15:3-4': 'Christ died for our sins according to the Scriptures, and that He was buried, and that He was raised on the third day according to the Scriptures.',
    'john14:6': 'Jesus said to him, "I am the way, and the truth, and the life; no one comes to the Father but through Me."',
    'eph2:8-9': 'For by grace you have been saved through faith; and that not of yourselves, it is the gift of God; not as a result of works, so that no one may boast.',
    'rom6:23': 'For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord.',
    'mark1:15': 'The time is fulfilled, and the kingdom of God is at hand; repent and believe in the gospel.',
    'rom10:9': 'If you confess with your mouth Jesus as Lord, and believe in your heart that God raised Him from the dead, you will be saved.',
    'john1:12': 'But as many as received Him, to them He gave the right to become children of God, even to those who believe in His name.',
    'rom8:1': 'Therefore there is now no condemnation for those who are in Christ Jesus.',
    '2cor5:17': 'Therefore if anyone is in Christ, he is a new creature; the old things passed away; behold, new things have come.',
    'eph1:13': 'Having also believed, you were sealed in Him with the Holy Spirit of promise.',
    '1john5:13': 'These things I have written to you who believe in the name of the Son of God, so that you may know that you have eternal life.',
    'matt28:19': 'Go therefore and make disciples of all the nations, baptizing them in the name of the Father and the Son and the Holy Spirit.',
    'matt11:28': 'Come to Me, all who are weary and heavy-laden, and I will give you rest.',
    'phil4:6-7': 'Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all comprehension, will guard your hearts and your minds in Christ Jesus.',
    '1pet5:7': 'Casting all your anxiety on Him, because He cares for you.',
    'ps34:18': 'The LORD is near to the brokenhearted And saves those who are crushed in spirit.',
    'matt5:4': 'Blessed are those who mourn, for they shall be comforted.',
    'isa41:10': 'Do not fear, for I am with you; Do not anxiously look about you, for I am your God. I will strengthen you, surely I will help you, Surely I will uphold you with My righteous right hand.',
    'deut31:8': 'The LORD is the one who goes ahead of you; He will be with you. He will not fail you or forsake you. Do not fear or be dismayed.',
    '1john1:9': 'If we confess our sins, He is faithful and righteous to forgive us our sins and to cleanse us from all unrighteousness.',
    'rom15:13': 'Now may the God of hope fill you with all joy and peace in believing, so that you will abound in hope by the power of the Holy Spirit.',
    'eph4:2-3': 'With all humility and gentleness, with patience, showing tolerance for one another in love, being diligent to preserve the unity of the Spirit in the bond of peace.',
    'col3:13': 'Bearing with one another, and forgiving each other, whoever has a complaint against anyone; just as the Lord forgave you, so also should you.',
    'phil4:19': 'And my God will supply all your needs according to His riches in glory in Christ Jesus.',
    'matt6:33-34': 'But seek first His kingdom and His righteousness, and all these things will be added to you. So do not worry about tomorrow; for tomorrow will care for itself. Each day has enough trouble of its own.',
    'ps46:1': 'God is our refuge and strength, A very present help in trouble.',
    '2cor12:9': 'And He has said to me, "My grace is sufficient for you, for power is perfected in weakness."',
    'mark9:24': 'Immediately the boy’s father cried out and said, "I do believe; help my unbelief."',
    'james1:5': 'But if any of you lacks wisdom, let him ask of God, who gives to all generously and without reproach, and it will be given to him.',
    '2tim3:16-17': 'All Scripture is inspired by God and profitable for teaching, for reproof, for correction, for training in righteousness; so that the man of God may be adequate, equipped for every good work.',
    'ps119:105': 'Your word is a lamp to my feet And a light to my path.',
    'ps119:18': 'Open my eyes, that I may behold Wonderful things from Your law.',
    'acts17:11': 'Now these were more noble-minded than those in Thessalonica, for they received the word with great eagerness, examining the Scriptures daily to see whether these things were so.',
    'matt5:5': 'Blessed are the gentle, for they shall inherit the earth.',
    'matt11:29': 'Take My yoke upon you and learn from Me, for I am gentle and humble in heart, and you will find rest for your souls.',
    '1tim6:10': 'For the love of money is a root of all sorts of evil, and some by longing for it have wandered away from the faith and pierced themselves with many griefs.',
    'rom5:6': 'For while we were still helpless, at the right time Christ died for the ungodly.',
    '1cor10:13': 'No temptation has overtaken you but such as is common to man; and God is faithful, who will not allow you to be tempted beyond what you are able, but with the temptation will provide the way of escape also, so that you will be able to endure it.',
    '2cor1:8': 'For we do not want you to be unaware, brethren, of our affliction which came to us in Asia, that we were burdened excessively, beyond our strength, so that we despaired even of life.',
    'matt7:1': 'Do not judge so that you will not be judged.',
    'matt7:5': 'You hypocrite, first take the log out of your own eye, and then you will see clearly to take the speck out of your brother\u2019s eye.',
    'john7:24': 'Do not judge according to appearance, but judge with righteous judgment.',
    'jer29:10-11': 'For thus says the LORD, "When seventy years have been completed for Babylon, I will visit you and fulfill My good word to you, to bring you back to this place. For I know the plans that I have for you," declares the LORD, "plans for welfare and not for calamity to give you a future and a hope."',
    'phil4:11-13': 'Not that I speak from want, for I have learned to be content in whatever circumstances I am. I know how to get along with humble means, and I also know how to live in prosperity; in any and every circumstance I have learned the secret of being filled and going hungry, both of having abundance and suffering need. I can do all things through Him who strengthens me.',
    'matt18:20': 'For where two or three have gathered together in My name, I am there in their midst.',
    'luke24:27': 'Then beginning with Moses and with all the prophets, He explained to them the things concerning Himself in all the Scriptures.',
    '2pet3:16': 'As also in all his letters, speaking in them of these things, in which are some things hard to understand.',
  },
  NASB2020: {
    'gen1:27': 'So God created man in His own image, in the image of God He created him; male and female He created them.',
    'john3:16': 'For God so loved the world, that He gave His only Son, so that everyone who believes in Him will not perish, but have eternal life.',
    'rom3:23': 'For all have sinned and fall short of the glory of God.',
    'isa59:2': 'But your wrongdoings have caused a separation between you and your God, And your sins have hidden His face from you so that He does not hear.',
    'rom5:8': 'But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.',
    '1pet2:24': 'He Himself brought our sins in His body up on the cross, so that we might die to sin and live for righteousness; by His wounds you were healed.',
    '1cor15:3-4': 'Christ died for our sins according to the Scriptures, and that He was buried, and that He was raised on the third day according to the Scriptures.',
    'john14:6': 'Jesus said to him, "I am the way, and the truth, and the life; no one comes to the Father except through Me."',
    'eph2:8-9': 'For by grace you have been saved through faith; and this is not of yourselves, it is the gift of God; not a result of works, so that no one may boast.',
    'rom6:23': 'For the wages of sin is death, but the gracious gift of God is eternal life in Christ Jesus our Lord.',
    'mark1:15': 'The time is fulfilled, and the kingdom of God has come near; repent and believe in the gospel.',
    'rom10:9': 'If you confess with your mouth Jesus as Lord, and believe in your heart that God raised Him from the dead, you will be saved.',
    'john1:12': 'But as many as received Him, to them He gave the right to become children of God, to those who believe in His name.',
    'rom8:1': 'Therefore there is now no condemnation at all for those who are in Christ Jesus.',
    '2cor5:17': 'Therefore if anyone is in Christ, this person is a new creation; the old things passed away; behold, new things have come.',
    'eph1:13': 'Having also believed, you were sealed in Him with the Holy Spirit of the promise.',
    '1john5:13': 'These things I have written to you who believe in the name of the Son of God, so that you may know that you have eternal life.',
    'matt28:19': 'Go, therefore, and make disciples of all the nations, baptizing them in the name of the Father and the Son and the Holy Spirit.',
    'matt11:28': 'Come to Me, all who are weary and burdened, and I will give you rest.',
    'phil4:6-7': 'Do not be anxious about anything, but in everything by prayer and pleading with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all comprehension, will guard your hearts and minds in Christ Jesus.',
    '1pet5:7': 'Having cast all your anxiety on Him, because He cares about you.',
    'ps34:18': 'The LORD is near to the brokenhearted And saves those who are crushed in spirit.',
    'matt5:4': 'Blessed are those who mourn, for they will be comforted.',
    'isa41:10': 'Do not fear, for I am with you; Do not be afraid, for I am your God. I will strengthen you, I will also help you, I will also uphold you with My righteous right hand.',
    'deut31:8': 'And the LORD is the one who is going ahead of you; He will be with you. He will not desert you or abandon you. Do not fear and do not be dismayed.',
    '1john1:9': 'If we confess our sins, He is faithful and righteous, so that He will forgive us our sins and cleanse us from all unrighteousness.',
    'rom15:13': 'Now may the God of hope fill you with all joy and peace in believing, so that you will abound in hope by the power of the Holy Spirit.',
    'eph4:2-3': 'With all humility and gentleness, with patience, bearing with one another in love, being diligent to keep the unity of the Spirit in the bond of peace.',
    'col3:13': 'Bearing with one another, and forgiving each other, whoever has a complaint against anyone; just as the Lord forgave you, so must you do also.',
    'phil4:19': 'And my God will supply all your needs according to His riches in glory in Christ Jesus.',
    'matt6:33-34': 'But seek first His kingdom and His righteousness, and all these things will be provided to you. So do not worry about tomorrow; for tomorrow will worry about itself. Each day has enough trouble of its own.',
    'ps46:1': 'God is our refuge and strength, A very ready help in trouble.',
    '2cor12:9': 'And He has said to me, "My grace is sufficient for you, for power is perfected in weakness."',
    'mark9:24': 'Immediately the boy’s father cried out and said, "I do believe; help my unbelief!"',
    'james1:5': 'But if any of you lacks wisdom, let him ask of God, who gives to all generously and without reproach, and it will be given to him.',
    '2tim3:16-17': 'All Scripture is inspired by God and beneficial for teaching, for rebuke, for correction, for training in righteousness; so that the man or woman of God may be fully capable, equipped for every good work.',
    'ps119:105': 'Your word is a lamp to my feet And a light to my path.',
    'ps119:18': 'Open my eyes, that I may behold Wonderful things from Your Law.',
    'acts17:11': 'Now these people were more noble-minded than those in Thessalonica, for they received the word with great eagerness, examining the Scriptures daily to see whether these things were so.',
    'matt5:5': 'Blessed are the gentle, for they will inherit the earth.',
    'matt11:29': 'Take My yoke upon you and learn from Me, for I am gentle and humble in heart, and you will find rest for your souls.',
    '1tim6:10': 'For the love of money is a root of all sorts of evil, and some by longing for it have wandered away from the faith and pierced themselves with many griefs.',
    'rom5:6': 'For while we were still helpless, at the right time Christ died for the ungodly.',
    '1cor10:13': 'No temptation has overtaken you except something common to mankind; and God is faithful, so He will not allow you to be tempted beyond what you are able, but with the temptation will provide the way of escape also, so that you will be able to endure it.',
    '2cor1:8': 'For we do not want you to be unaware, brothers and sisters, of our affliction which occurred in Asia, that we were burdened excessively, beyond our strength, so that we despaired even of life.',
    'matt7:1': 'Do not judge, so that you will not be judged.',
    'matt7:5': 'You hypocrite, first take the log out of your own eye, and then you will see clearly to take the speck out of your brother\u2019s eye!',
    'john7:24': 'Do not judge by the outward appearance, but judge with righteous judgment.',
    'jer29:10-11': 'For this is what the LORD says: "When seventy years have been completed for Babylon, I will visit you and fulfill My good word to you, to bring you back to this place. For I know the plans that I have for you," declares the LORD, "plans for prosperity and not for disaster, to give you a future and a hope."',
    'phil4:11-13': 'Not that I speak from need, for I have learned to be content in whatever circumstances I am. I know how to get along with little, and I also know how to live in prosperity; in any and every circumstance I have learned the secret of being filled and going hungry, both of having abundance and suffering need. I can do all things through Him who strengthens me.',
    'matt18:20': 'For where two or three have gathered together in My name, I am there in their midst.',
    'luke24:27': 'Then beginning with Moses and with all the Prophets, He explained to them the things written about Himself in all the Scriptures.',
    '2pet3:16': 'As also in all his letters, speaking in them of these things, in which there are some things that are hard to understand.',
  },
}

export function verse(key) {
  const text = TEXT[BIBLE_EDITION][key]
  if (!text || !REFS[key]) throw new Error(`Missing scripture: ${key}`)
  return { ref: REFS[key], text }
}
