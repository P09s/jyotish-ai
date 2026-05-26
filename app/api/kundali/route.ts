import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// ── Planet & sign constants ──────────────────────────────
const PLANETS = [
  { id: 0,  name: 'Sun',     sanskrit: 'Surya',   symbol: '☉' },
  { id: 1,  name: 'Moon',    sanskrit: 'Chandra',  symbol: '☽' },
  { id: 2,  name: 'Mars',    sanskrit: 'Mangal',   symbol: '♂' },
  { id: 3,  name: 'Mercury', sanskrit: 'Budha',    symbol: '☿' },
  { id: 4,  name: 'Jupiter', sanskrit: 'Guru',     symbol: '♃' },
  { id: 5,  name: 'Venus',   sanskrit: 'Shukra',   symbol: '♀' },
  { id: 6,  name: 'Saturn',  sanskrit: 'Shani',    symbol: '♄' },
  { id: 11, name: 'Rahu',    sanskrit: 'Rahu',     symbol: '☊' },
  { id: 11, name: 'Ketu',    sanskrit: 'Ketu',     symbol: '☋', isKetu: true },
]

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]

const SIGN_SANSKRIT = [
  'Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya',
  'Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'
]

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'
]

// Vimshottari Dasha sequence and years
const DASHA_LORDS = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']
const DASHA_YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 }
const DASHA_TOTAL = 120

// Nakshatra → Dasha lord mapping (27 nakshatras, repeating 3 lords each)
const NAKSHATRA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 1-9
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury', // 10-18
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'  // 19-27
]

// ── Helpers ──────────────────────────────────────────────
function getLongitudeWithAyanamsa(longitude: number, ayanamsa = 23.85): number {
  // Lahiri ayanamsa ~23.85° for 2024 (approx; swisseph gives exact)
  let sidereal = longitude - ayanamsa
  if (sidereal < 0) sidereal += 360
  return sidereal
}

function getSign(longitude: number) {
  const idx = Math.floor(longitude / 30)
  return { index: idx, name: SIGNS[idx], sanskrit: SIGN_SANSKRIT[idx], degree: longitude % 30 }
}

function getNakshatra(moonLongitude: number) {
  const idx = Math.floor(moonLongitude / (360 / 27))
  const pada = Math.floor((moonLongitude % (360 / 27)) / (360 / 108)) + 1
  return {
    index: idx,
    name: NAKSHATRAS[idx],
    pada,
    lord: NAKSHATRA_LORD[idx]
  }
}

function dateToJulianDay(year: number, month: number, day: number, hour: number): number {
  // Standard Julian Day formula
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5
}

function calcPlanetPosition(jd: number, planetId: number): number {
  // Simplified VSOP87-derived mean longitude calculations
  // For production: replace with swisseph-wasm calls
  const T = (jd - 2451545.0) / 36525 // Julian centuries from J2000

  const meanLongitudes: Record<number, number> = {
    0:  (280.46646 + 36000.76983 * T) % 360,   // Sun
    1:  (218.3165 + 481267.8813 * T) % 360,     // Moon
    2:  (355.433 + 19140.2993 * T) % 360,       // Mars
    3:  (252.251 + 149472.6746 * T) % 360,      // Mercury
    4:  (34.351 + 3034.9057 * T) % 360,         // Jupiter
    5:  (181.979 + 58517.8156 * T) % 360,       // Venus
    6:  (50.0774 + 1222.1138 * T) % 360,        // Saturn
    11: (125.0445 - 1934.1363 * T) % 360,       // Rahu (north node — retrograde)
  }

  let lng = meanLongitudes[planetId] ?? 0
  if (lng < 0) lng += 360
  return lng
}

function calcAscendant(jd: number, lat: number, lng: number): number {
  // Simplified Ascendant calculation (whole sign based on LST)
  const T = (jd - 2451545.0) / 36525
  // Greenwich Sidereal Time
  let GST = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T
  GST = ((GST % 360) + 360) % 360
  // Local Sidereal Time
  const LST = (GST + lng) % 360
  // Simplified Ascendant (tropical)
  const RAMC = LST
  const obliquity = 23.4393 - 0.013 * T
  const ascTropical = Math.atan2(
    Math.cos(RAMC * Math.PI / 180),
    -(Math.sin(RAMC * Math.PI / 180) * Math.cos(obliquity * Math.PI / 180) +
      Math.tan(lat * Math.PI / 180) * Math.sin(obliquity * Math.PI / 180))
  ) * 180 / Math.PI
  return ((ascTropical % 360) + 360) % 360
}

function calcVimshottariDasha(moonLongitude: number, birthDate: Date) {
  const nakshatra = getNakshatra(moonLongitude)
  const nakshatraSpan = 360 / 27 // 13.333°
  const degInNakshatra = moonLongitude % nakshatraSpan
  const fractionElapsed = degInNakshatra / nakshatraSpan

  // Find starting dasha lord
  const startLord = nakshatra.lord
  const startLordIdx = DASHA_LORDS.indexOf(startLord)

  // Years remaining in current dasha at birth
  const startDashaYears = DASHA_YEARS[startLord as keyof typeof DASHA_YEARS]
  const yearsElapsed = fractionElapsed * startDashaYears
  const yearsRemaining = startDashaYears - yearsElapsed

  const dashas = []
  let currentDate = new Date(birthDate)

  // Add remaining portion of current dasha
  const endOfFirst = new Date(currentDate)
  endOfFirst.setFullYear(endOfFirst.getFullYear() + Math.floor(yearsRemaining))
  endOfFirst.setMonth(endOfFirst.getMonth() + Math.round((yearsRemaining % 1) * 12))

  dashas.push({
    lord: startLord,
    years: startDashaYears,
    start: currentDate.toISOString().split('T')[0],
    end: endOfFirst.toISOString().split('T')[0],
    isCurrent: true,
    yearsRemaining: parseFloat(yearsRemaining.toFixed(2))
  })

  currentDate = new Date(endOfFirst)

  // Next 8 dashas in sequence
  for (let i = 1; i < 9; i++) {
    const lordIdx = (startLordIdx + i) % 9
    const lord = DASHA_LORDS[lordIdx]
    const years = DASHA_YEARS[lord as keyof typeof DASHA_YEARS]
    const endDate = new Date(currentDate)
    endDate.setFullYear(endDate.getFullYear() + Math.floor(years))
    endDate.setMonth(endDate.getMonth() + Math.round((years % 1) * 12))

    dashas.push({
      lord,
      years,
      start: currentDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      isCurrent: false
    })

    currentDate = new Date(endDate)
  }

  return dashas
}

// ── Main route ───────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date_of_birth, time_of_birth, latitude, longitude, timezone } = await request.json()

    if (!date_of_birth || !latitude || !longitude) {
      return NextResponse.json({ error: 'date_of_birth, latitude, and longitude are required' }, { status: 400 })
    }

    // Parse birth datetime
    const [year, month, day] = date_of_birth.split('-').map(Number)
    const [hour = 12, minute = 0] = (time_of_birth || '12:00').split(':').map(Number)
    const hourDecimal = hour + minute / 60

    // Convert local time to UTC (approximate; in production use timezone offset)
    const birthDateUTC = new Date(`${date_of_birth}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`)

    // Julian Day
    const jd = dateToJulianDay(year, month, day, hourDecimal)

    // Lahiri Ayanamsa (approximate; swisseph gives exact value per date)
    // Precise formula: 23.85° circa 2024, changes ~0.013°/year from 2000
    const yearsFrom2000 = year - 2000
    const ayanamsa = 23.85 + (yearsFrom2000 * 0.013)

    // Calculate all planets
    const planetData = PLANETS.map(planet => {
      const tropicalLng = calcPlanetPosition(jd, planet.isKetu ? 11 : planet.id)
      // Ketu is exactly opposite Rahu
      const adjustedTropical = planet.isKetu ? (tropicalLng + 180) % 360 : tropicalLng
      const siderealLng = getLongitudeWithAyanamsa(adjustedTropical, ayanamsa)
      const sign = getSign(siderealLng)

      return {
        id: planet.id,
        name: planet.name,
        sanskrit: planet.sanskrit,
        symbol: planet.symbol,
        longitude: parseFloat(siderealLng.toFixed(4)),
        sign: sign.name,
        sign_sanskrit: sign.sanskrit,
        sign_index: sign.index,
        degree: parseFloat(sign.degree.toFixed(2)),
        house: sign.index + 1, // Will be recalculated relative to Lagna below
        isRetrograde: planet.id === 11 || planet.isKetu ? true : false // Rahu/Ketu always retrograde
      }
    })

    // Ascendant (Lagna)
    const tropicalAsc = calcAscendant(jd, latitude, longitude)
    const siderealAsc = getLongitudeWithAyanamsa(tropicalAsc, ayanamsa)
    const lagnaSign = getSign(siderealAsc)

    // Recalculate houses relative to Lagna (Whole Sign system)
    const lagnaSignIndex = lagnaSign.index
    const planetsWithHouses = planetData.map(p => ({
      ...p,
      house: ((p.sign_index - lagnaSignIndex + 12) % 12) + 1
    }))

    // Moon data for Nakshatra + Dasha
    const moon = planetsWithHouses.find(p => p.name === 'Moon')!
    const moonNakshatra = getNakshatra(moon.longitude)
    const dashas = calcVimshottariDasha(moon.longitude, birthDateUTC)
    const currentDasha = dashas[0]

    // Build the 12 houses
    const houses = Array.from({ length: 12 }, (_, i) => {
      const houseSignIdx = (lagnaSignIndex + i) % 12
      const planetsInHouse = planetsWithHouses.filter(p => p.house === i + 1)
      return {
        number: i + 1,
        sign: SIGNS[houseSignIdx],
        sign_sanskrit: SIGN_SANSKRIT[houseSignIdx],
        sign_index: houseSignIdx,
        planets: planetsInHouse.map(p => p.name)
      }
    })

    const chartData = {
      calculated_at: new Date().toISOString(),
      birth: { date: date_of_birth, time: time_of_birth, latitude, longitude, timezone },
      ayanamsa: parseFloat(ayanamsa.toFixed(4)),
      julian_day: parseFloat(jd.toFixed(4)),
      lagna: {
        longitude: parseFloat(siderealAsc.toFixed(4)),
        sign: lagnaSign.name,
        sign_sanskrit: lagnaSign.sanskrit,
        sign_index: lagnaSignIndex,
        degree: parseFloat((siderealAsc % 30).toFixed(2))
      },
      planets: planetsWithHouses,
      houses,
      moon_nakshatra: moonNakshatra,
      vimshottari_dasha: dashas,
      current_dasha: currentDasha,
      // Key yogas (basic)
      summary: {
        lagna_sign: lagnaSign.name,
        moon_sign: moon.sign,
        sun_sign: planetsWithHouses.find(p => p.name === 'Sun')!.sign,
        moon_nakshatra: moonNakshatra.name,
        current_dasha_lord: currentDasha.lord,
        current_dasha_ends: currentDasha.end
      }
    }

    // Save to Supabase
    const { data: saved, error: saveError } = await supabase
      .from('kundali_charts')
      .upsert({ user_id: user.id, chart_data: chartData })
      .select()
      .single()

    if (saveError) throw saveError

    return NextResponse.json({ success: true, chart: chartData })

  } catch (err: unknown) {
    console.error('Kundali calculation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Calculation failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('kundali_charts')
      .select('chart_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json({ chart: data?.chart_data || null })

  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 })
  }
}