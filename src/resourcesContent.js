/* ------------------------------------------------------------------
   Community resources for Clermont County and nearby.
   Source: Clermont County's official Community Resources list (updated
   September 2025) and its corrected Local Food Resources list (October
   2025), both published at clermontcountyohio.gov. Spot checked against
   agency websites in November 2026.

   Hours and programs change often. When you confirm or fix a listing,
   update it here and change RESOURCES_CHECKED below.
------------------------------------------------------------------- */

export const RESOURCES_CHECKED = 'November 2026'

export const resourceCategories = [
  { id: 'crisis', label: 'Crisis and safety' },
  { id: 'food', label: 'Food' },
  { id: 'housing', label: 'Rent and housing' },
  { id: 'utilities', label: 'Utility bills' },
  { id: 'clothing', label: 'Clothing and baby items' },
  { id: 'health', label: 'Health and mental health' },
  { id: 'recovery', label: 'Addiction recovery' },
  { id: 'jobs', label: 'Jobs and transportation' },
  { id: 'seniors', label: 'Seniors and veterans' },
  { id: 'benefits', label: 'Benefits and legal help' },
]

// phones: [{ label?, number, text? }]  text: true means it accepts texts
export const resources = [
  /* ---------- Crisis and safety ---------- */
  { id: 'emergency', cats: ['crisis'], name: 'Emergency', phones: [{ number: '911' }], hours: '24/7', services: 'If you or someone else is in danger, call 911 right away.' },
  { id: '988', cats: ['crisis', 'health'], name: '988 Suicide and Crisis Lifeline', phones: [{ label: 'Call or text', number: '988', text: true }], hours: '24/7', services: 'Free, confidential support if you are thinking about suicide, in emotional distress, or worried about someone.', web: '988lifeline.org' },
  { id: 'crisis-hotline', cats: ['crisis', 'health'], name: 'Clermont Crisis Hotline (Child Focus)', phones: [{ number: '513-528-7283' }], hours: '24/7', services: 'Local crisis line for mental health emergencies.' },
  { id: 'ywca', cats: ['crisis'], name: 'YWCA Domestic Violence Hotline', phones: [{ label: 'Call', number: '513-872-9259' }, { label: 'Text', number: '513-436-3606', text: true }], hours: '24/7', services: 'Domestic violence shelter, crisis hotline, and support services.', web: 'ywcacincinnati.org' },
  { id: 'whw', cats: ['crisis'], name: 'Women Helping Women', phones: [{ label: 'Call or text', number: '513-381-5610', text: true }], hours: '24/7', address: '3020 Hospital Drive, Batavia, OH 45103', services: 'Help for anyone affected by gender based violence. Crisis support, hospital and court advocacy, support groups.', web: 'womenhelpingwomen.org' },
  { id: '211', cats: ['crisis', 'food', 'housing', 'utilities', 'benefits'], name: 'United Way 2-1-1', phones: [{ number: '211' }, { label: 'Office', number: '513-721-7900' }], hours: '24/7', services: 'Not sure where to start? Call 2-1-1 and a real person will help you find local help for almost any need.' },
  { id: 'poison', cats: ['crisis'], name: 'Poison Control', phones: [{ number: '800-222-1222' }], hours: '24/7', services: 'Poison advice and help by phone.' },

  /* ---------- Food ---------- */
  { id: 'ipm', cats: ['food', 'health', 'clothing'], name: 'Inter Parish Ministry (IPM) Food Pantry', phones: [{ number: '513-561-3932' }], address: '4623 Aicholtz Rd., Cincinnati, OH 45244', town: 'Eastgate area', hours: 'Mon, Tue, Thu, Fri 10am to 12pm. Wed 12:30pm to 2:30pm.', services: 'Food pantry, holiday help, baby supplies, and medical care through HealthSource.', web: 'ipmfoodpantry.org' },
  { id: 'amelia-umc', cats: ['food'], name: 'Amelia United Methodist Church', phones: [{ number: '513-753-6770' }], address: '19 E. Main Street, Amelia, OH 45102', town: 'Amelia', hours: 'Mon and Wed 11am to 1pm', services: 'Food pantry.', web: 'ameliachurch.org' },
  { id: 'st-bernadette', cats: ['food', 'housing'], name: 'St. Bernadette St. Vincent de Paul', phones: [{ number: '513-753-5566' }], address: '1479 Locust Lake Rd., Amelia, OH 45102', town: 'Amelia', hours: '1st Wednesday of the month, 10am to 12pm', services: 'Food pantry. Financial help available, call first.', web: 'stbameliaparish.org' },
  { id: 'st-veronica', cats: ['food', 'housing', 'utilities', 'clothing'], name: 'St. Veronica St. Vincent de Paul', phones: [{ number: '513-528-8613' }], address: '4473 Mt. Carmel Tobasco Rd., Cincinnati, OH 45244', town: 'Mt. Carmel', hours: '1st and 3rd Thursday, 1pm to 7pm', services: 'Food pantry, utility help, rent help, clothing vouchers, holiday help.', web: 'stveronica.org' },
  { id: 'sem', cats: ['food'], name: 'SEM Food Pantry', phones: [{ number: '513-231-1412' }], address: '2020 Beechmont Ave., Cincinnati, OH 45230', town: 'Beechmont', hours: 'Mon to Fri 10am to 2pm. Tue 5:30pm to 7pm. Sat 10am to 12pm. You can call for an appointment.', services: 'Food pantry.', web: 'semfoodpantry.org' },
  { id: 'salvation-army', cats: ['food', 'housing', 'utilities'], name: 'Salvation Army Batavia', phones: [{ number: '513-732-6241' }], address: '87 N. Market St., Batavia, OH 45103', town: 'Batavia', hours: 'Mon, Wed, Thu 9am to 3pm', services: 'Rent help, utility help, food, holiday help, back to school help. Check what paperwork to bring before you go.', web: 'easternusa.salvationarmy.org' },
  { id: 'christian-help', cats: ['food', 'clothing'], name: 'Christian Help Center', phones: [{ number: '513-735-9400' }], address: '247 E. Main Street, Batavia, OH 45103', town: 'Batavia', hours: 'By appointment only, Tuesdays 11:30am to 2pm', services: 'Food, personal hygiene items, baby products.', web: 'christianhelpcenterohio.org' },
  { id: 'holy-trinity', cats: ['food'], name: 'Holy Trinity Church', phones: [{ number: '513-732-2024' }], address: '140 N. 6th St., Batavia, OH 45103', town: 'Batavia', hours: 'Wednesday evenings (2nd, 3rd, and 4th Wednesday). The voicemail has current dates and times.', services: 'Food pantry.' },
  { id: 'summerside', cats: ['food'], name: 'Summerside Feeding Ministries', phones: [{ number: '513-732-2027' }], address: '180 N. Fifth St., Batavia, OH 45103', town: 'Batavia', hours: 'Thursday 2:30pm to 5pm', services: 'Food pantry.', web: 'bataviafaithumc.org' },
  { id: 'moms', cats: ['food', 'clothing'], name: "Mom's Food Pantry (Faith Tabernacle Church)", phones: [{ number: '513-718-0036' }], address: '2525 Bauer Road, Batavia, OH 45103', town: 'Batavia', hours: 'Friday 10am to 3pm', services: 'Food pantry and clothes.', web: 'momfoodspantry.com' },
  { id: 'st-peter', cats: ['food', 'housing'], name: 'St. Peter St. Vincent de Paul', phones: [{ number: '513-553-3267' }], address: '1192 Bethel-New Richmond Road, New Richmond, OH 45157', town: 'New Richmond', hours: 'Tuesday 10am to 1pm', services: 'Food pantry. Financial help available, call first.' },
  { id: 'st-mary-bethel', cats: ['food'], name: 'St. Mary Catholic Church, Bethel', phones: [{ number: '513-734-4041' }], address: '3398 St. Rt. 125, Bethel, OH 45106', town: 'Bethel', hours: 'Tuesday 10am to 1pm', services: 'Food pantry, refugee and immigration services.' },
  { id: 'st-andrew', cats: ['food', 'housing'], name: 'St. Andrew St. Vincent de Paul', phones: [{ number: '513-831-3353' }], address: '552 Main St., Milford, OH 45150', town: 'Milford', hours: '1st and 3rd Thursdays of each month', services: 'Food pantry. Financial help available, call first.' },
  { id: 'mmm', cats: ['food', 'housing', 'utilities'], name: 'Milford Miami Ministries', phones: [{ number: '513-248-1114' }], address: '844 St. Rt. 131, Milford, OH 45150', town: 'Milford', hours: 'Tue and Thu 9am to 12pm. Wed 6:30pm to 8:30pm. 2nd and 4th Sat 9am to 11am.', services: 'Food pantry and financial help. For Milford and Miami Township residents only.', web: 'mmministry.org' },
  { id: 'cne-care', cats: ['food'], name: 'CNE Care', address: '463 S. Broadway St., Owensville, OH 45160', town: 'Owensville', hours: 'Thursdays 4:30pm to 5:30pm', services: 'Food pantry. You must register online first.', web: 'cnecares.org' },
  { id: 'felicity-umc', cats: ['food'], name: 'Felicity United Methodist Church', phones: [{ number: '513-876-2147' }], address: '421 W. Walnut St., Felicity, OH 45120', town: 'Felicity', hours: '3rd Thursday of every month, 9am to 1pm. Call to confirm.', services: 'Food pantry.', web: 'felicityumc.org' },
  { id: 'williamsburg', cats: ['food', 'utilities'], name: 'Williamsburg Community Mission', phones: [{ number: '513-724-6305' }], address: '330 Gay St., Williamsburg, OH 45176', town: 'Williamsburg', hours: 'Tue and Wed 10am to 12pm. 3rd Saturday of the month 11am to 1:30pm.', services: 'Food, utility help, financial help. For Williamsburg residents only.', web: 'williamsburgumc.com' },
  { id: 'mt-orab-umc', cats: ['food', 'clothing'], name: 'Mt. Orab United Methodist Church', phones: [{ number: '937-444-1046' }], address: '206 Elm St., Mt. Orab, OH 45154', town: 'Mt. Orab', hours: 'Wednesday 9am to 12pm', services: 'Food pantry and clothing.', web: 'mtorabumc.org' },
  { id: 'impacting-tomorrow', cats: ['food', 'clothing'], name: 'Impacting Tomorrow', phones: [{ number: '513-826-0399' }], address: '455 Wards Corner Road, Loveland, OH 45140', town: 'Loveland', hours: 'Mon 10am to 12pm. Wed 5pm to 7pm. Fri and Sat 10am to 12pm.', services: 'Food pantry and clothing for men, women, and kids.', web: 'impactingtomorrow.com' },
  { id: 'life', cats: ['food'], name: 'LIFE Food Pantry', phones: [{ number: '513-583-8222' }], address: '677 Loveland-Madeira Rd., Loveland, OH 45140', town: 'Loveland', hours: 'Tue to Sat 10am to 12pm. Tue to Thu 4pm to 6:30pm.', services: 'Food pantry. You must have a 45140 zip code.', web: 'lifefoodpantry.org' },
  { id: 'st-columban', cats: ['food'], name: 'St. Columban St. Vincent de Paul', phones: [{ label: 'Confidential voicemail, box 2115', number: '513-683-0105' }], address: '894 Oakland Rd., Loveland, OH 45140', town: 'Loveland', hours: 'Call and leave a voicemail', services: 'Food pantry.' },
  { id: 'svdp', cats: ['food', 'housing', 'utilities', 'health'], name: 'St. Vincent de Paul Cincinnati', phones: [{ number: '513-562-8841' }, { number: '513-421-0602' }], hours: 'Varies, call first', services: 'Emergency financial help, food, charitable pharmacy, diapers, holiday help.', web: 'svdpcincinnati.org' },
  { id: 'city-gospel', cats: ['food', 'housing', 'recovery'], name: 'City Gospel Mission', phones: [{ number: '513-241-5525' }], address: '1805 Dalton Ave., Cincinnati, OH 45214', town: 'Cincinnati', hours: 'Mon to Fri 8:30am to 4:30pm', services: 'Shelter, soup kitchen with dinner at 6:30pm Monday to Friday, recovery programs for men and women, job help.', web: 'citygospelmission.org' },
  { id: 'wic', cats: ['food', 'health'], name: 'Clermont County WIC', phones: [{ number: '513-735-8400' }], address: '2400 Clermont Center Dr., Suite 200, Batavia, OH 45103', town: 'Batavia', services: 'Supplemental food and nutrition education for moms, babies, and young children, plus breastfeeding support.' },

  /* ---------- Rent and housing ---------- */
  { id: 'cccs', cats: ['housing', 'utilities', 'clothing', 'health'], name: 'Clermont County Community Services', phones: [{ label: 'Main', number: '513-732-2277' }, { label: 'Homeless shelter', number: '513-732-6464' }, { label: 'Diapers', number: '513-735-8804' }], address: '3003 Hospital Dr., Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4:30pm', services: 'Help with utility bills and HEAP, emergency homeless shelter, home weatherization, diapers, and children\'s medical and dental care.', web: 'cccsi.org' },
  { id: 'cmha', cats: ['housing'], name: 'Clermont Metropolitan Housing Authority', phones: [{ number: '513-732-6010' }], address: '65 S. Market St., Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4:30pm', services: 'Subsidized housing and Section 8.', web: 'clermontmha.org' },
  { id: 'goodwill', cats: ['housing', 'jobs'], name: 'Goodwill Opportunity Center', phones: [{ number: '513-735-4644' }], address: '4247 Grissom Drive, Batavia, OH 45103', town: 'Batavia', hours: 'Call for hours', services: 'Job training and referrals, housing support, shelters, rent help, and support for people with disabilities.' },
  { id: 'habitat', cats: ['housing'], name: 'Habitat for Humanity', phones: [{ number: '513-621-4147' }], address: '4910 Para Drive, Cincinnati, OH 45237', hours: 'Call for more information', services: 'Home repair and homeownership programs. You must apply online.', web: 'habitatcincinnati.org' },

  /* ---------- Utilities ---------- */
  { id: 'energy-ohio', cats: ['utilities'], name: 'Ohio Energy Assistance (HEAP)', phones: [{ number: '800-282-0880' }], services: 'The state line that connects you to your local energy assistance office. You can also apply at energyhelp.ohio.gov.', web: 'energyhelp.ohio.gov' },

  /* ---------- Clothing and baby ---------- */
  { id: 'give-like-a-mother', cats: ['clothing'], name: 'Give Like a Mother', phones: [{ label: 'Call', number: '513-732-0130' }, { label: 'Text', number: '513-400-3208', text: true }], address: '4601 Eastgate Blvd, Suite F824, Cincinnati, OH 45245', town: 'Eastgate', hours: 'Mon to Fri 9am to 4pm', services: 'Free clothing for children and teens, once every 4 months. Fill out the request online.', web: 'givelikeamother.org' },
  { id: 'caring-place', cats: ['clothing', 'health'], name: 'A Caring Place Pregnancy Help Center', phones: [{ label: 'Main', number: '513-753-4357' }, { label: 'After hours', number: '513-427-2271' }], address: '4446 Mt. Carmel Tobasco Rd., Cincinnati, OH 45244', town: 'Mt. Carmel', hours: 'Mon and Tue 10am to 4pm. Mon to Wed 6pm to 8pm. Thu and Fri 6pm to 8pm.', services: 'Pregnancy help, parenting classes, maternity clothes, and baby products.', web: 'acaringplace.org' },
  { id: 'care-center', cats: ['clothing', 'jobs', 'health'], name: 'The Care Center', phones: [{ number: '513-453-7999' }], address: '11020 S. Lebanon Rd., Loveland, OH 45140', town: 'Loveland', hours: 'Tue, Thu, Fri 10am to 6pm. Wed 10am to 8:30pm. Some services need an appointment.', services: 'Job help, transportation, work clothing, financial help, toiletries, counseling, pregnancy and medical care, GED and parenting classes.', web: 'carecenterinfo.com' },

  /* ---------- Health and mental health ---------- */
  { id: 'healthsource', cats: ['health'], name: 'HealthSource of Ohio', phones: [{ number: '513-576-7700' }], address: 'Several locations in Clermont County', hours: 'Varies by location', services: 'Health care on a sliding scale based on income.', web: 'healthsourceofohio.org' },
  { id: 'gcbhs', cats: ['health', 'recovery'], name: 'Greater Cincinnati Behavioral Health', phones: [{ label: 'Amelia', number: '513-947-7000' }, { label: 'Batavia', number: '513-735-8100' }], address: '43 E. Main St., Amelia, OH 45102 and 1074 Wasserman Way, Batavia, OH 45103', town: 'Amelia and Batavia', hours: 'Walk in (open access) Mon to Thu 8:30am to 12pm. Regular hours Mon to Fri 8:30am to 5pm.', services: 'Mental health care, addiction treatment, job services. Urgent care at the Amelia office.', web: 'gcbhs.com' },
  { id: 'ccmhrb', cats: ['health', 'recovery'], name: 'Clermont County Mental Health and Recovery Board', phones: [{ number: '513-732-5400' }], address: '2337 Clermont Center Dr., Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4:30pm', services: 'Help finding mental health and addiction care, crisis help, suicide prevention.', web: 'ccmhrb.org' },
  { id: 'nami', cats: ['health'], name: 'NAMI Southwest Ohio', phones: [{ label: 'Helpline', number: '800-950-6264' }], hours: 'Call for help. You can also text NAMI to 741741.', services: 'Help finding mental health and addiction services, and support for families.', web: 'namiswoh.org' },
  { id: 'bluebird', cats: ['health'], name: 'Bluebird Bus of Hope', address: 'Comes to Amelia, New Richmond, Goshen, and Williamsburg', hours: 'Book appointments online', services: 'Mobile mental health support.', web: 'bluebirdhope.org' },
  { id: 'public-health', cats: ['health'], name: 'Clermont County Public Health', phones: [{ label: 'Nursing', number: '513-735-8400' }], address: '2275 Bauer Road, Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8:30am to 4pm', services: 'Immunizations, birth and death certificates, community health.', web: 'ccphohio.org' },
  { id: 'mercy', cats: ['health'], name: 'Clermont Mercy Hospital', phones: [{ number: '513-732-8200' }], address: '3000 Hospital Dr., Batavia, OH 45103', town: 'Batavia', hours: 'Open 24 hours', services: 'Emergency room and behavioral health.' },

  /* ---------- Recovery ---------- */
  { id: 'celebrate-recovery', cats: ['recovery'], name: 'Celebrate Recovery', address: 'Many locations', services: 'Faith based, Christ centered recovery support groups.', web: 'celebraterecovery.com' },
  { id: 'challenge-ranch', cats: ['recovery'], name: 'Cincinnati Challenge Ranch', phones: [{ number: '513-248-0452' }], address: '1466 US 50, Milford, OH 45150', town: 'Milford', services: 'Faith based residential recovery program.', web: 'cincinnatichallengeranch.org' },
  { id: 'drug-free', cats: ['recovery'], name: 'Coalition for a Drug Free Clermont County', phones: [{ number: '513-735-8143' }], address: '1088 Wasserman Way, Batavia, OH 45103', town: 'Batavia', services: 'Information and resources on addiction.', web: 'drugfreeclermont.org' },
  { id: 'aa', cats: ['recovery'], name: 'Alcoholics Anonymous (AA) Cincinnati', phones: [{ number: '513-351-0422' }], address: 'Meetings in many locations', services: 'Support groups for alcohol addiction.', web: 'aacincinnati.org' },
  { id: 'na', cats: ['recovery'], name: 'Narcotics Anonymous (NA)', phones: [{ number: '513-820-2947' }], address: 'Meetings in many locations', services: 'Support groups for drug addiction.', web: 'nacincinnati.com' },
  { id: 'al-anon', cats: ['recovery'], name: 'Al-Anon', phones: [{ number: '888-425-2666' }], address: 'Meetings in many locations', services: 'Support groups for family and friends of someone with an addiction.', web: 'al-anon.org' },

  /* ---------- Jobs and transportation ---------- */
  { id: 'ohiomeansjobs', cats: ['jobs'], name: 'OhioMeansJobs Clermont County', phones: [{ number: '513-943-3000' }], address: '2400 Clermont Center Dr., Suite 204A, Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4:30pm', services: 'Job search help, resumes, training funds, and help for young adults.' },
  { id: 'ctc', cats: ['jobs', 'seniors'], name: 'Clermont Transportation Connection', phones: [{ label: 'Press option 2', number: '513-732-7433' }], address: '4003 Filager Rd., Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 5:30am to 6:30pm. Rides must be scheduled ahead.', services: 'Public transportation around Clermont County.' },
  { id: 'library', cats: ['jobs'], name: 'Clermont County Public Library', phones: [{ number: '513-732-2736' }], address: 'Branches across Clermont County', services: 'Free computers and internet, books, and classes.', web: 'clermontlibrary.org' },

  /* ---------- Seniors and veterans ---------- */
  { id: 'seniors', cats: ['seniors', 'utilities', 'food'], name: 'Clermont Senior Services', phones: [{ number: '513-724-1255' }], address: '2085 James E. Sauls Sr. Drive, Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4:30pm', services: 'For older adults: home care, home repair, housing, transportation, caregiver support, adult day services, help applying for HEAP, and an emergency pantry.', web: 'clermontseniors.com' },
  { id: 'veterans', cats: ['seniors', 'housing', 'utilities'], name: 'Clermont County Veterans Service Commission', phones: [{ number: '513-732-7363' }, { label: 'Veterans Crisis Line: dial 988, then press 1', number: '988' }], address: '76 South Riverside Dr., Heritage Bldg. 3rd Floor, Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 7:30am to 4pm', services: 'For veterans: emergency financial help with rent, mortgage, and utilities, rides to VA appointments, and help with disability claims.', web: 'clermontcountyveterans.com' },

  /* ---------- Benefits and legal ---------- */
  { id: 'jfs', cats: ['benefits', 'food'], name: 'Clermont County Job and Family Services (Public Assistance)', phones: [{ label: 'Main', number: '513-732-7111' }, { label: 'Customer care', number: '844-640-6446' }], address: '2400 Clermont Center Dr., Batavia, OH 45103', town: 'Batavia', hours: 'Mon to Fri 8am to 4pm', services: 'Apply for SNAP (food assistance), Medicaid, cash assistance, emergency help (PRC), and child care help.', web: 'clermontpublicassistance.org' },
  { id: 'legal-aid', cats: ['benefits', 'housing'], name: 'Legal Aid Society of Greater Cincinnati', phones: [{ number: '513-241-9400' }], address: '215 E. 9th Street, Suite 200, Cincinnati, OH 45202', hours: 'Varies', services: 'Free legal help for people who qualify based on income, plus a divorce and dissolution clinic.', web: 'lascinti.org' },
  { id: '4c', cats: ['benefits'], name: '4C for Children', phones: [{ number: '800-256-1296' }], hours: 'Mon to Fri 8:30am to 5pm', services: 'Help finding child care, and parenting classes.', web: '4cforchildren.org' },
]

export const resourceById = Object.fromEntries(resources.map((r) => [r.id, r]))
