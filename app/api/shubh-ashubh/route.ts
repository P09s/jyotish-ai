import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import * as Astronomy from 'astronomy-engine'
import { getCached, setCached, chartFingerprint } from '@/app/lib/cache/route-cache'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

// Backstop under the (date + chart-fingerprint) cache. See dasha-fal/route.ts.
const SHUBH_ASHUBH_RATE_LIMIT = 15
const SHUBH_ASHUBH_RATE_WINDOW_MS = 10 * 60 * 1000

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati',
]

function norm360(x: number): number { return ((x % 360) + 360) % 360 }

function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0
  return 23.853056 + (50.29 / 3600) * T * 100
}

function toJD(y: number, m: number, d: number, h: number): number {
  if (m <= 2) { y--; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + h/24 + B - 1524.5
}

// ── Tara Bala (same grouping used for Milan's Tara Koot) ──────────────────────
// Groups 2,4,6,8,9 (Sampat, Kshema, Sadhaka, Mitra, Parama Mitra) are auspicious;
// 1,3,5,7 (Janma, Vipat, Pratyak, Vadha) are inauspicious.
const TARA_NAMES = ['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhaka','Vadha','Mitra','Parama Mitra']
const TARA_GOOD = [2,4,6,8,9]

function taraGroup(nakFrom: number, nakTo: number): number {
  const diff = ((nakTo - nakFrom + 27) % 27) + 1
  const group = diff % 9
  return group === 0 ? 9 : group
}

// ── Chandra Bala — house-distance from natal Moon sign to today's transiting Moon sign ──
const CHANDRA_FAVORABLE   = [1,3,6,7,10,11]
const CHANDRA_NEUTRAL     = [2,5]
// (4,8,9,12 unfavorable — 8th is classically the most challenging, 9th the mildest)

function chandraQuality(houseDistance: number): 'favorable' | 'neutral' | 'unfavorable' {
  if (CHANDRA_FAVORABLE.includes(houseDistance)) return 'favorable'
  if (CHANDRA_NEUTRAL.includes(houseDistance))   return 'neutral'
  return 'unfavorable'
}

// ── Gaja Kesari Yoga — Moon and Jupiter in mutual Kendra (1st/4th/7th/10th) ────
function checkGajaKesari(moonHouse: number, jupiterHouse: number): boolean {
  const dist = ((jupiterHouse - moonHouse + 12) % 12) + 1
  return [1,4,7,10].includes(dist)
}

// ── Kaal Sarp Dosha — all 7 classical planets fall within one Rahu-Ketu arc ───
function isInArc(lon: number, start: number, end: number): boolean {
  const span = norm360(end - start)
  const pos  = norm360(lon - start)
  return pos <= span
}

function checkKaalSarp(planets: any[]): boolean {
  const rahu = planets.find(p => p.name === 'Rahu')
  const ketu = planets.find(p => p.name === 'Ketu')
  if (!rahu || !ketu) return false
  const classical = planets.filter(p => !['Rahu','Ketu'].includes(p.name))
  const allRahuToKetu = classical.every(p => isInArc(p.longitude, rahu.longitude, ketu.longitude))
  const allKetuToRahu = classical.every(p => isInArc(p.longitude, ketu.longitude, rahu.longitude))
  return allRahuToKetu || allKetuToRahu
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed, retryAfterMs } = await checkRateLimit(`shubh-ashubh:${user.id}`, SHUBH_ASHUBH_RATE_LIMIT, SHUBH_ASHUBH_RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    // Same duplicate-row-safe pattern used across kundali/dasha-fal/bhavishya-fal
    const { data: chartRow, error: chartErr } = await supabase
      .from('kundali_charts')
      .select('chart_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (chartErr && chartErr.code !== 'PGRST116') {
      console.error('Shubh Ashubh chart fetch error:', chartErr)
    }
    const chart = chartRow?.chart_data
    if (!chart) {
      return NextResponse.json({ error: 'Please generate your Kundali first.' }, { status: 400 })
    }

    // ── Today's transiting Moon (precise ephemeris, same method as Panchang) ──
    const timezone = 'Asia/Kolkata'
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    const year  = nowLocal.getFullYear()
    const month = nowLocal.getMonth() + 1
    const day   = nowLocal.getDate()

    // Shubh Ashubh changes daily as the Moon transits — cache key is just today's date.
    const cacheKey = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}|${chartFingerprint(chart)}`
    const cached = await getCached(supabase, user.id, 'shubh-ashubh', cacheKey)
    if (cached) return NextResponse.json({ success: true, shubhAshubh: cached })

    const noonUTC   = new Date(Date.UTC(year, month - 1, day, 6, 0, 0))
    const astroTime = new Astronomy.AstroTime(noonUTC)
    const jd        = toJD(year, month, day, 6)
    const ayanamsa  = getLahiriAyanamsa(jd)

    const moonTropical = Astronomy.Ecliptic(Astronomy.GeoVector('Moon' as any, astroTime, true)).elon
    const moonSid       = norm360(moonTropical - ayanamsa)

    const nakSpan       = 360 / 27
    const todayNakIndex = Math.floor(moonSid / nakSpan)
    const todaySignIndex = Math.floor(moonSid / 30)

    // ── Natal reference points ──────────────────────────────────────────────
    const natalNakIndex  = chart.moon_nakshatra?.index ?? NAKSHATRAS.indexOf(chart.moon_nakshatra?.name)
    const natalSignIndex = SIGNS.indexOf(chart.summary?.moon_sign)

    // ── Tara Bala ────────────────────────────────────────────────────────────
    const taraGroupNum = taraGroup(natalNakIndex, todayNakIndex)
    const taraQuality  = TARA_GOOD.includes(taraGroupNum) ? 'favorable' : 'unfavorable'
    const taraName     = TARA_NAMES[taraGroupNum - 1]

    // ── Chandra Bala ─────────────────────────────────────────────────────────
    const houseDistance = ((todaySignIndex - natalSignIndex + 12) % 12) + 1
    const chandraQual    = chandraQuality(houseDistance)

    // ── Static chart yogas ───────────────────────────────────────────────────
    const moonPlanet    = chart.planets?.find((p: any) => p.name === 'Moon')
    const jupiterPlanet = chart.planets?.find((p: any) => p.name === 'Jupiter')
    const gajaKesari = (moonPlanet && jupiterPlanet)
      ? checkGajaKesari(moonPlanet.house, jupiterPlanet.house)
      : false
    const kaalSarp = checkKaalSarp(chart.planets ?? [])

    // ── Groq AI narrative ────────────────────────────────────────
    const systemPrompt = `You are Daivam — a warm, wise Vedic astrologer giving a Shubh-Ashubh (auspicious/inauspicious) reading for today.
Write in plain text only — no markdown, no asterisks, no headers, no bullet points.
Structure your response in 2 short paragraphs, under 160 words total:
1. Today's personal favorability — explain what the Tara Bala and Chandra Bala results mean together for starting new things, travel, or important decisions today. Be direct about whether today leans favorable or calls for caution.
2. Mention any permanent chart yogas present (only if given) and close with one practical, actionable suggestion for today.
Use Sanskrit terms with English in brackets. Be warm and grounded, never fear-mongering — an unfavorable day is a "wait and prepare" day, not a disaster.`

    const userMsg = `Tara Bala today: ${taraName} tara (${taraQuality})
Chandra Bala today: Moon transiting house ${houseDistance} from natal Moon sign (${chandraQual})
${gajaKesari ? 'Chart yoga present: Gaja Kesari Yoga (Moon-Jupiter in mutual Kendra) — a lifelong yoga for wisdom and reputation.' : ''}
${kaalSarp ? 'Chart yoga present: Kaal Sarp Dosha (all planets hemmed between Rahu-Ketu) — a lifelong pattern, not a daily one.' : ''}

Provide today's Shubh-Ashubh reading.`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_completion_tokens: 800,
      reasoning_effort: 'low',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    })

    const narrative = completion.choices[0]?.message?.content ?? ''

    const shubhAshubh = {
      date: cacheKey,
      tara: { name: taraName, quality: taraQuality, group: taraGroupNum },
      chandra: { houseDistance, quality: chandraQual },
      yogas: {
        gajaKesari,
        kaalSarp,
      },
      narrative,
    }
    if (narrative.trim().length > 40) {
      await setCached(supabase, user.id, 'shubh-ashubh', cacheKey, shubhAshubh)
    }

    return NextResponse.json({ success: true, shubhAshubh })
  } catch (err: unknown) {
    console.error('Shubh Ashubh error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Shubh Ashubh calculation failed' }, { status: 500 })
  }
}