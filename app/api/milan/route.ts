// app/api/milan/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL, classifyGroqError } from '@/app/lib/groq/client'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

// Unlike dasha-fal/bhavishya-fal/numerology/shubh-ashubh, Milan has no cache —
// chartA/chartB are supplied per-request (two people, not "your" chart), so
// there's no stable cache key to hang a cache off. Rate limiting is the only
// backstop here, so keep it tight: a real user runs a handful of matches per
// session, not dozens.
const MILAN_RATE_LIMIT = 8            // requests
const MILAN_RATE_WINDOW_MS = 10 * 60 * 1000  // per 10 minutes
const MAX_NAME_CHARS = 80
// Sanity cap on the raw chart payload. Real charts include full Vimshottari +
// Yogini dasha timelines (each with nested antardashas), so a single chart
// commonly runs ~20-25KB — and this endpoint receives TWO charts (chartA +
// chartB) per request, comfortably 40-50KB together. 150KB leaves headroom
// for that while still blocking genuinely abusive/padded payloads.
const MAX_CHART_JSON_BYTES = 150_000

// ── Constants ─────────────────────────────────────────────────────────────────
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'
]

// ── Ashtakoot Tables ──────────────────────────────────────────────────────────

// 1. Varna (1 point) — caste/spiritual evolution
// Brahmin=3, Kshatriya=2, Vaishya=1, Shudra=0
const VARNA: Record<string, number> = {
  Cancer:3, Scorpio:3, Pisces:3,       // Brahmin
  Aries:2,  Leo:2,     Sagittarius:2,  // Kshatriya
  Taurus:1, Virgo:1,   Capricorn:1,    // Vaishya
  Gemini:0, Libra:0,   Aquarius:0,     // Shudra
}

// 2. Vashya (2 points) — dominance/attraction
// Whole-sign approximation of the 5 classical Vashya categories.
// (Note: Leo/Sagittarius/Capricorn are traditionally split by degree across
// categories — this whole-sign version is a simplification, not a bug.)
// 0 = Chatuspada (quadruped), 1 = Manava (human), 2 = Jalachar (aquatic),
// 3 = Vanachar (wild — Leo only), 4 = Keeta (insect — Scorpio only)
const VASHYA_GROUP: Record<string, number> = {
  Aries:0, Taurus:0, Sagittarius:0, Capricorn:0,
  Gemini:1, Virgo:1, Libra:1, Aquarius:1,
  Cancer:2, Pisces:2,
  Leo:3,
  Scorpio:4,
}
// Mutual attraction score [groupA][groupB], 0-2 points
const VASHYA_SCORE: number[][] = [
  [2, 1, 1, 0, 0], // 0 quadruped
  [1, 2, 1, 0, 0], // 1 human
  [1, 1, 2, 0, 1], // 2 aquatic
  [0, 0, 0, 2, 0], // 3 wild (Leo)
  [0, 0, 1, 0, 2], // 4 insect (Scorpio)
]

// 3. Tara (3 points) — birth star compatibility
// Classical tara groups (1-indexed, counting inclusive from source to target nakshatra, mod 9):
// 1 Janma(bad) 2 Sampat(good) 3 Vipat(bad) 4 Kshema(good) 5 Pratyak(bad)
// 6 Sadhaka(good) 7 Vadha(bad) 8 Mitra(good) 9 Parama Mitra(good)
function taraGroup(nakFrom: number, nakTo: number): number {
  const diff = ((nakTo - nakFrom + 27) % 27) + 1 // inclusive count, 1-27
  const group = diff % 9
  return group === 0 ? 9 : group
}

function calcTara(nakA: number, nakB: number): number {
  const GOOD_GROUPS = [2, 4, 6, 8, 9]
  const groupAtoB = taraGroup(nakA, nakB)
  const groupBtoA = taraGroup(nakB, nakA)
  const goodAtoB = GOOD_GROUPS.includes(groupAtoB)
  const goodBtoA = GOOD_GROUPS.includes(groupBtoA)
  if (goodAtoB && goodBtoA) return 3
  if (goodAtoB || goodBtoA) return 1.5
  return 0
}

// 4. Yoni (4 points) — sexual/nature compatibility
const YONI: Record<string, string> = {
  Ashwini:'horse', Shatabhisha:'horse',
  Bharani:'elephant', Revati:'elephant',
  Pushya:'goat', Krittika:'goat',
  Rohini:'serpent', Mrigashira:'serpent',
  Moola:'dog', Ardra:'dog',
  Ashlesha:'cat', Punarvasu:'cat',
  Magha:'rat', 'Purva Phalguni':'rat',
  'Uttara Phalguni':'cow',
  Hasta:'buffalo', Chitra:'tiger',
  Swati:'buffalo', Vishakha:'tiger',
  Anuradha:'deer', Jyeshtha:'deer',
  'Purva Ashadha':'monkey', 'Uttara Ashadha':'mongoose',
  Shravana:'monkey', Dhanishtha:'lion',
  'Purva Bhadrapada':'lion', 'Uttara Bhadrapada':'cow',
}

const YONI_MAP: Record<string, string> = {
  'Ashwini':'horse', 'Shatabhisha':'horse',
  'Bharani':'elephant', 'Revati':'elephant',
  'Pushya':'goat', 'Krittika':'goat',
  'Rohini':'serpent', 'Mrigashira':'serpent',
  'Mula':'dog', 'Ardra':'dog',
  'Ashlesha':'cat', 'Punarvasu':'cat',
  'Magha':'rat', 'Purva Phalguni':'rat',
  'Uttara Phalguni':'cow', 'Hasta':'buffalo',
  'Chitra':'tiger', 'Swati':'buffalo',
  'Vishakha':'tiger', 'Anuradha':'deer',
  'Jyeshtha':'deer', 'Purva Ashadha':'monkey',
  'Uttara Ashadha':'mongoose', 'Shravana':'monkey',
  'Dhanishtha':'lion', 'Purva Bhadrapada':'lion',
  'Uttara Bhadrapada':'cow',
}

const YONI_FRIENDLY: Record<string, string[]> = {
  horse:['horse'], elephant:['elephant'], goat:['goat'],
  serpent:['serpent'], dog:['dog'], cat:['cat'], rat:['rat'],
  cow:['cow','buffalo'], buffalo:['buffalo','cow'], tiger:['tiger'],
  deer:['deer'], monkey:['monkey'], mongoose:[], lion:['lion'],
}
const YONI_ENEMY: Record<string, string[]> = {
  horse:['buffalo'], elephant:['lion'], goat:['monkey'],
  serpent:['mongoose'], dog:['deer'], cat:['rat'], rat:['cat'],
  cow:['tiger'], buffalo:['horse'], tiger:['cow'],
  deer:['dog'], monkey:['goat'], mongoose:['serpent'], lion:['elephant'],
}

function calcYoni(nakA: string, nakB: string): number {
  const yA = YONI_MAP[nakA] ?? ''
  const yB = YONI_MAP[nakB] ?? ''
  if (!yA || !yB) return 2
  if (yA === yB) return 4
  if (YONI_FRIENDLY[yA]?.includes(yB)) return 3
  if (YONI_ENEMY[yA]?.includes(yB) || YONI_ENEMY[yB]?.includes(yA)) return 0
  return 2
}

// 5. Graha Maitri (5 points) — planetary friendship
const PLANET_FRIENDS: Record<string, string[]> = {
  Sun:    ['Moon','Mars','Jupiter'],
  Moon:   ['Sun','Mercury'],
  Mars:   ['Sun','Moon','Jupiter'],
  Mercury:['Sun','Venus'],
  Jupiter:['Sun','Moon','Mars'],
  Venus:  ['Mercury','Saturn'],
  Saturn: ['Mercury','Venus'],
}
// Naisargika Maitri — explicit enemies; anything not listed as friend or enemy is neutral
const PLANET_ENEMIES: Record<string, string[]> = {
  Sun:    ['Venus','Saturn'],
  Moon:   [],
  Mars:   ['Mercury'],
  Mercury:['Moon'],
  Jupiter:['Mercury','Venus'],
  Venus:  ['Sun','Moon'],
  Saturn: ['Sun','Moon','Mars'],
}
const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}

function relationOf(a: string, b: string): 'friend'|'neutral'|'enemy' {
  if (a === b) return 'friend'
  if (PLANET_FRIENDS[a]?.includes(b)) return 'friend'
  if (PLANET_ENEMIES[a]?.includes(b)) return 'enemy'
  return 'neutral'
}

// Classical Panchadha Maitri scoring — asymmetric planetary relationships are
// common (e.g. Moon lists Mercury as a friend, but Mercury lists Moon as an
// enemy), so this must be scored per-direction, not collapsed to a single
// friend/neutral/enemy bucket. Used for both the 5-point Graha Maitri score
// AND to detect a fully-mutual "friend" relation for Bhakoot cancellation.
function friendship(a: string, b: string): 'friend'|'neutral'|'enemy' {
  const ab = relationOf(a, b)
  const ba = relationOf(b, a)
  if (ab === 'friend' && ba === 'friend') return 'friend'
  if (ab === 'enemy' && ba === 'enemy') return 'enemy'
  return 'neutral'
}

function calcGrahaMaitri(moonSignA: string, moonSignB: string): number {
  const lordA = SIGN_LORD[moonSignA] ?? 'Moon'
  const lordB = SIGN_LORD[moonSignB] ?? 'Moon'
  const ab = relationOf(lordA, lordB)
  const ba = relationOf(lordB, lordA)

  if (ab === 'friend' && ba === 'friend') return 5
  if ((ab === 'friend' && ba === 'neutral') || (ab === 'neutral' && ba === 'friend')) return 4
  if (ab === 'neutral' && ba === 'neutral') return 3
  if ((ab === 'friend' && ba === 'enemy') || (ab === 'enemy' && ba === 'friend')) return 1
  if ((ab === 'neutral' && ba === 'enemy') || (ab === 'enemy' && ba === 'neutral')) return 0.5
  return 0 // enemy <-> enemy
}

// 6. Gana (6 points) — temperament
const GANA: Record<string, 'Deva'|'Manushya'|'Rakshasa'> = {
  Ashwini:'Deva', Mrigashira:'Deva', Punarvasu:'Deva', Pushya:'Deva',
  Hasta:'Deva', Swati:'Deva', Anuradha:'Deva', Shravana:'Deva', Revati:'Deva',
  Bharani:'Manushya', Rohini:'Manushya', Ardra:'Manushya', 'Purva Phalguni':'Manushya',
  'Uttara Phalguni':'Manushya', 'Purva Ashadha':'Manushya', 'Uttara Ashadha':'Manushya',
  'Purva Bhadrapada':'Manushya', 'Uttara Bhadrapada':'Manushya',
  Krittika:'Rakshasa', Ashlesha:'Rakshasa', Magha:'Rakshasa', Chitra:'Rakshasa',
  Vishakha:'Rakshasa', Jyeshtha:'Rakshasa', Mula:'Rakshasa', Dhanishtha:'Rakshasa',
  Shatabhisha:'Rakshasa',
}

function calcGana(nakA: string, nakB: string): number {
  const gA = GANA[nakA] ?? 'Manushya'
  const gB = GANA[nakB] ?? 'Manushya'
  if (gA === gB) return 6
  if ((gA==='Deva'&&gB==='Manushya')||(gA==='Manushya'&&gB==='Deva')) return 5
  if ((gA==='Deva'&&gB==='Rakshasa')||(gA==='Rakshasa'&&gB==='Deva')) return 1
  if ((gA==='Manushya'&&gB==='Rakshasa')||(gA==='Rakshasa'&&gB==='Manushya')) return 0
  return 3
}

// 7. Bhakoot (7 points) — moon sign relationship with classical cancellation
function calcBhakoot(moonSignA: string, moonSignB: string): number {
  const idxA = SIGNS.indexOf(moonSignA)
  const idxB = SIGNS.indexOf(moonSignB)
  if (idxA < 0 || idxB < 0) return 3
  const diff = ((idxB - idxA + 12) % 12) + 1
  const reverse = ((idxA - idxB + 12) % 12) + 1
  const bad = [[2,12],[5,9],[6,8]]
  const isDosha = bad.some(([a,b]) => (diff===a&&reverse===b)||(diff===b&&reverse===a))
  if (!isDosha) return 7

  // Bhakoot Dosha present — check classical cancellation (BPHS, Muhurta Chintamani)
  const lordA = SIGN_LORD[moonSignA]
  const lordB = SIGN_LORD[moonSignB]
  if (lordA === lordB) return 7        // same Rashi lord — fully cancelled
  if (friendship(lordA, lordB) === 'friend') return 3.5  // friendly lords — softened
  return 0
}

// 8. Nadi (8 points) — health/progeny with classical cancellation
const NADI: Record<string, 'Aadi'|'Madhya'|'Antya'> = {
  Ashwini:'Aadi', Ardra:'Aadi', Punarvasu:'Aadi', Uttara_Phalguni:'Aadi',
  Hasta:'Aadi', Jyeshtha:'Aadi', Mula:'Aadi', Shatabhisha:'Aadi', Purva_Bhadrapada:'Aadi',
  Bharani:'Madhya', Mrigashira:'Madhya', Pushya:'Madhya', Purva_Phalguni:'Madhya',
  Chitra:'Madhya', Anuradha:'Madhya', Purva_Ashadha:'Madhya', Dhanishtha:'Madhya', Uttara_Bhadrapada:'Madhya',
  Krittika:'Antya', Rohini:'Antya', Ashlesha:'Antya', Magha:'Antya',
  Swati:'Antya', Vishakha:'Antya', Uttara_Ashadha:'Antya', Shravana:'Antya', Revati:'Antya',
}

const NADI_CLEAN: Record<string, 'Aadi'|'Madhya'|'Antya'> = {
  'Ashwini':'Aadi','Ardra':'Aadi','Punarvasu':'Aadi','Uttara Phalguni':'Aadi',
  'Hasta':'Aadi','Jyeshtha':'Aadi','Mula':'Aadi','Shatabhisha':'Aadi','Purva Bhadrapada':'Aadi',
  'Bharani':'Madhya','Mrigashira':'Madhya','Pushya':'Madhya','Purva Phalguni':'Madhya',
  'Chitra':'Madhya','Anuradha':'Madhya','Purva Ashadha':'Madhya','Dhanishtha':'Madhya','Uttara Bhadrapada':'Madhya',
  'Krittika':'Antya','Rohini':'Antya','Ashlesha':'Antya','Magha':'Antya',
  'Swati':'Antya','Vishakha':'Antya','Uttara Ashadha':'Antya','Shravana':'Antya','Revati':'Antya',
}

function calcNadi(nakA: string, nakB: string, moonSignA: string, moonSignB: string): number {
  const nA = NADI_CLEAN[nakA]
  const nB = NADI_CLEAN[nakB]
  if (!nA || !nB) return 4
  if (nA !== nB) return 8 // different Nadi — no dosha

  const sameRashi = moonSignA === moonSignB
  const sameNakshatra = nakA === nakB

  // Classical exceptions (Jyotish Tattwa, Vashishtha Samhita)
  if (sameRashi && !sameNakshatra) return 8   // same Rashi, diff Nakshatra → cancelled
  if (sameNakshatra && !sameRashi) return 8   // same Nakshatra, diff Rashi → cancelled
  return 0 // same Nakshatra AND same Rashi — dosha stands, most severe case
}

// ── Nakshatra index from moon longitude ───────────────────────────────────────
function getNakFromLon(lon: number): { name: string; index: number } {
  const idx = Math.floor(lon / (360 / 27))
  return { name: NAKSHATRAS[Math.min(idx, 26)], index: idx }
}

// ── Main Ashtakoot calculation ────────────────────────────────────────────────
function calcAshtakoot(chartA: any, chartB: any) {
  const moonA = chartA.planets?.find((p: any) => p.name === 'Moon')
  const moonB = chartB.planets?.find((p: any) => p.name === 'Moon')

  const moonSignA = moonA?.sign ?? chartA.summary?.moon_sign ?? 'Aries'
  const moonSignB = moonB?.sign ?? chartB.summary?.moon_sign ?? 'Aries'
  const moonLonA  = moonA?.longitude ?? 0
  const moonLonB  = moonB?.longitude ?? 0

  const nakA = chartA.moon_nakshatra?.name ?? getNakFromLon(moonLonA).name
  const nakB = chartB.moon_nakshatra?.name ?? getNakFromLon(moonLonB).name
  const nakIdxA = NAKSHATRAS.indexOf(nakA)
  const nakIdxB = NAKSHATRAS.indexOf(nakB)

  const varnaA = VARNA[moonSignA] ?? 1
  const varnaB = VARNA[moonSignB] ?? 1
  const varnaScore = varnaA >= varnaB ? 1 : 0

  const vashyaA = VASHYA_GROUP[moonSignA] ?? 1
  const vashyaB = VASHYA_GROUP[moonSignB] ?? 1
  const vashyaScore = VASHYA_SCORE[vashyaA]?.[vashyaB] ?? 1

  const taraScore     = calcTara(nakIdxA < 0 ? 0 : nakIdxA, nakIdxB < 0 ? 0 : nakIdxB)
  const yoniScore     = calcYoni(nakA, nakB)
  const maitriScore   = calcGrahaMaitri(moonSignA, moonSignB)
  const ganaScore     = calcGana(nakA, nakB)
  const bhakootScore  = calcBhakoot(moonSignA, moonSignB)
  const nadiScore     = calcNadi(nakA, nakB, moonSignA, moonSignB)

  const total = varnaScore + vashyaScore + taraScore + yoniScore + maitriScore + ganaScore + bhakootScore + nadiScore
  const percent = Math.round((total / 36) * 100)

  return {
    total, percent,
    kootas: [
      { name:'Varna',        max:1,  score:varnaScore,   desc:'Spiritual compatibility' },
      { name:'Vashya',       max:2,  score:vashyaScore,  desc:'Mutual attraction & control' },
      { name:'Tara',         max:3,  score:taraScore,    desc:'Birth star harmony' },
      { name:'Yoni',         max:4,  score:yoniScore,    desc:'Physical & nature compatibility' },
      { name:'Graha Maitri', max:5,  score:maitriScore,  desc:'Planetary friendship & mental affinity' },
      { name:'Gana',         max:6,  score:ganaScore,    desc:'Temperament & nature match' },
      { name:'Bhakoot',      max:7,  score:bhakootScore, desc:'Moon sign relationship & prosperity' },
      { name:'Nadi',         max:8,  score:nadiScore,    desc:'Health & progeny compatibility' },
    ],
    moonSignA, moonSignB, nakA, nakB,
    lagnaA: chartA.lagna?.sign ?? '—',
    lagnaB: chartB.lagna?.sign ?? '—',
  }
}

// ── Manglik (Kuja) Dosha — separate from the 36-point Ashtakoot ───────────────
function checkManglik(chart: any) {
  const mars = chart.planets?.find((p: any) => p.name === 'Mars')
  if (!mars) return { isManglik: false, house: null, cancelled: false, reason: 'No Mars data' }

  const doshaHouses = [1, 2, 4, 7, 8, 12] // from Lagna
  const triggered = doshaHouses.includes(mars.house)
  if (!triggered) return { isManglik: false, house: mars.house, cancelled: false, reason: 'Mars not in a Manglik house' }

  // Cancellation: Mars in own sign (Aries/Scorpio) or exaltation sign (Capricorn)
  if (['Aries','Scorpio','Capricorn'].includes(mars.sign)) {
    return { isManglik: false, house: mars.house, cancelled: true, reason: `Mars in ${mars.sign} (own/exaltation) nullifies Manglik Dosha` }
  }
  return { isManglik: true, house: mars.house, cancelled: false, reason: `Mars in house ${mars.house} from Lagna` }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed, retryAfterMs } = await checkRateLimit(`milan:${user.id}`, MILAN_RATE_LIMIT, MILAN_RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many compatibility checks — please wait a bit before trying another match.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    const rawBody = await request.text()
    if (rawBody.length > MAX_CHART_JSON_BYTES) {
      return NextResponse.json({ error: 'Request payload too large' }, { status: 413 })
    }
    const { chartA, chartB, nameA, nameB } = JSON.parse(rawBody)
    if (!chartA || !chartB) return NextResponse.json({ error: 'Both charts required' }, { status: 400 })

    // nameA/nameB flow straight into the Groq prompt below — cap length so a
    // long string can't pad the prompt or muddy the instructions the model
    // is given.
    const safeName = (n: unknown, fallback: string) =>
      typeof n === 'string' && n.trim() ? n.trim().slice(0, MAX_NAME_CHARS) : fallback

    const safeNameA = safeName(nameA, 'Person A')
    const safeNameB = safeName(nameB, 'Person B')

    const ashtakoot = calcAshtakoot(chartA, chartB)
    const manglikA = checkManglik(chartA)
    const manglikB = checkManglik(chartB)
    const manglikStatus = {
      personA: manglikA,
      personB: manglikB,
      mutuallyCancelled: manglikA.isManglik && manglikB.isManglik, // both Manglik = cancels out
      requiresRemedy: manglikA.isManglik !== manglikB.isManglik,   // only one is Manglik
    }

    // ── Groq AI narrative ────────────────────────────────────────
    const systemPrompt = `You are Daivam — a warm, wise Vedic astrologer specialising in Kundali Milan (compatibility matching).
You speak with calm authority, referencing classical texts like Brihat Parashara Hora Shastra.
Keep your response to exactly 3 short paragraphs:
1. Overall compatibility verdict (mention the Ashtakoot score, Manglik status, and what it means)
2. Key strengths in this pairing (reference specific kootas that scored well)
3. Areas needing awareness + practical guidance (reference kootas that scored low or Manglik dosha if present, give upaya/remedy if severe)
Use Sanskrit terms with English in brackets. Be warm, not fatalistic. Never be longer than 180 words total.`

    const userMsg = `Analyse this Kundali Milan:
Person A (${safeNameA}): Moon in ${ashtakoot.moonSignA}, Nakshatra ${ashtakoot.nakA}, Lagna ${ashtakoot.lagnaA}
Person B (${safeNameB}): Moon in ${ashtakoot.moonSignB}, Nakshatra ${ashtakoot.nakB}, Lagna ${ashtakoot.lagnaB}

Ashtakoot Score: ${ashtakoot.total}/36 (${ashtakoot.percent}%)
Koota breakdown:
${ashtakoot.kootas.map(k => `- ${k.name}: ${k.score}/${k.max}`).join('\n')}

Manglik Status: ${safeNameA} ${manglikA.isManglik ? 'is Manglik' : 'is not Manglik'}${manglikA.cancelled ? ' (cancelled: ' + manglikA.reason + ')' : ''}; ${safeNameB} ${manglikB.isManglik ? 'is Manglik' : 'is not Manglik'}${manglikB.cancelled ? ' (cancelled: ' + manglikB.reason + ')' : ''}.
${manglikStatus.mutuallyCancelled ? 'Both are Manglik — dosha is mutually cancelled per classical rule.' : ''}

Provide a personalised compatibility reading.`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_completion_tokens: 900,
      reasoning_effort: 'low',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    })

    const narrative = completion.choices[0]?.message?.content ?? ''

    // ── Save to Supabase ─────────────────────────────────────────
    await supabase.from('milan_results').upsert({
      user_id: user.id,
      name_a: safeNameA,
      name_b: safeNameB,
      ashtakoot_score: ashtakoot.total,
      result_data: { ashtakoot, manglikStatus, narrative },
      created_at: new Date().toISOString(),
    }).select()

    return NextResponse.json({ success: true, ashtakoot, manglikStatus, narrative })
  } catch (err: unknown) {
    console.error('Milan error:', err)
    const { message, status } = classifyGroqError(err)
    return NextResponse.json({ error: message }, { status })
  }
}