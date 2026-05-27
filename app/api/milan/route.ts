// app/api/milan/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'

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
const VASHYA_GROUP: Record<string, number> = {
  Aries:0, Taurus:1, Gemini:2, Cancer:3, Leo:0, Virgo:2,
  Libra:2, Scorpio:3, Sagittarius:0, Capricorn:1, Aquarius:1, Pisces:3,
}
// Mutual attraction map [groupA][groupB]
const VASHYA_SCORE: number[][] = [
  [2,0,0,1,2,0],  // 0-quadruped
  [0,2,0,0,0,1],  // 1-quadruped2
  [0,0,2,0,0,0],  // 2-human
  [1,0,0,2,0,0],  // 3-water
]

// 3. Tara (3 points) — birth star compatibility
function calcTara(nakA: number, nakB: number): number {
  const tara = ((nakB - nakA + 27) % 27) % 9
  const good = [0,2,3,4,5,6] // 1,3,4,5,6,7th are good (0-indexed)
  return good.includes(tara) ? 3 : 0
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
const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}

function friendship(a: string, b: string): 'friend'|'neutral'|'enemy' {
  if (a === b) return 'friend'
  if (PLANET_FRIENDS[a]?.includes(b)) return 'friend'
  if (PLANET_FRIENDS[b]?.includes(a)) return 'neutral'
  return 'enemy'
}

function calcGrahaMaitri(moonSignA: string, moonSignB: string): number {
  const lordA = SIGN_LORD[moonSignA] ?? 'Moon'
  const lordB = SIGN_LORD[moonSignB] ?? 'Moon'
  const rel = friendship(lordA, lordB)
  if (rel === 'friend') return 5
  if (rel === 'neutral') return 3
  return 0
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

// 7. Bhakoot (7 points) — moon sign relationship
function calcBhakoot(moonSignA: string, moonSignB: string): number {
  const idxA = SIGNS.indexOf(moonSignA)
  const idxB = SIGNS.indexOf(moonSignB)
  if (idxA < 0 || idxB < 0) return 3
  const diff = ((idxB - idxA + 12) % 12) + 1
  const reverse = ((idxA - idxB + 12) % 12) + 1
  // 2-12, 5-9, 6-8 are inauspicious
  const bad = [[2,12],[5,9],[6,8]]
  for (const [a,b] of bad) {
    if ((diff===a&&reverse===b)||(diff===b&&reverse===a)) return 0
  }
  if (diff === 1) return 7 // same sign
  return 7 // generally 7 if not bad
}

// 8. Nadi (8 points) — health/progeny
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

function calcNadi(nakA: string, nakB: string): number {
  const nA = NADI_CLEAN[nakA]
  const nB = NADI_CLEAN[nakB]
  if (!nA || !nB) return 4
  return nA === nB ? 0 : 8
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

  const vashyaA = VASHYA_GROUP[moonSignA] ?? 0
  const vashyaB = VASHYA_GROUP[moonSignB] ?? 0
  const vashyaScore = (vashyaA === vashyaB) ? 2 : (Math.abs(vashyaA - vashyaB) <= 1 ? 1 : 0)

  const taraScore     = calcTara(nakIdxA < 0 ? 0 : nakIdxA, nakIdxB < 0 ? 0 : nakIdxB)
  const yoniScore     = calcYoni(nakA, nakB)
  const maitriScore   = calcGrahaMaitri(moonSignA, moonSignB)
  const ganaScore     = calcGana(nakA, nakB)
  const bhakootScore  = calcBhakoot(moonSignA, moonSignB)
  const nadiScore     = calcNadi(nakA, nakB)

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

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { chartA, chartB, nameA, nameB } = await request.json()
    if (!chartA || !chartB) return NextResponse.json({ error: 'Both charts required' }, { status: 400 })

    const ashtakoot = calcAshtakoot(chartA, chartB)

    // ── Groq AI narrative ────────────────────────────────────────
    const systemPrompt = `You are Jyotish AI — a warm, wise Vedic astrologer specialising in Kundali Milan (compatibility matching).
You speak with calm authority, referencing classical texts like Brihat Parashara Hora Shastra.
Keep your response to exactly 3 short paragraphs:
1. Overall compatibility verdict (mention the Ashtakoot score and what it means)
2. Key strengths in this pairing (reference specific kootas that scored well)
3. Areas needing awareness + practical guidance (reference kootas that scored low, give upaya/remedy if severe)
Use Sanskrit terms with English in brackets. Be warm, not fatalistic. Never be longer than 180 words total.`

    const userMsg = `Analyse this Kundali Milan:
Person A (${nameA || 'Person A'}): Moon in ${ashtakoot.moonSignA}, Nakshatra ${ashtakoot.nakA}, Lagna ${ashtakoot.lagnaA}
Person B (${nameB || 'Person B'}): Moon in ${ashtakoot.moonSignB}, Nakshatra ${ashtakoot.nakB}, Lagna ${ashtakoot.lagnaB}

Ashtakoot Score: ${ashtakoot.total}/36 (${ashtakoot.percent}%)
Koota breakdown:
${ashtakoot.kootas.map(k => `- ${k.name}: ${k.score}/${k.max}`).join('\n')}

Provide a personalised compatibility reading.`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 400,
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
      name_a: nameA ?? 'Person A',
      name_b: nameB ?? 'Person B',
      ashtakoot_score: ashtakoot.total,
      result_data: { ashtakoot, narrative },
      created_at: new Date().toISOString(),
    }).select()

    return NextResponse.json({ success: true, ashtakoot, narrative })
  } catch (err: unknown) {
    console.error('Milan error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Milan calculation failed' }, { status: 500 })
  }
}