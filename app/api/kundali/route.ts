// app/api/kundali/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import * as Astronomy from 'astronomy-engine'

// ── Constants ─────────────────────────────────────────────────────────────────
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const SIGN_SANSKRIT = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena']
const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'
]
const NAKSHATRA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'
]
const DASHA_LORDS = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']
const DASHA_YEARS: Record<string,number> = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17}

// ── Math helpers ──────────────────────────────────────────────────────────────
function norm360(x: number): number { return ((x % 360) + 360) % 360 }
function toRad(d: number): number   { return d * Math.PI / 180 }
function toDeg(r: number): number   { return r * 180 / Math.PI }

// ── Julian Day ────────────────────────────────────────────────────────────────
function toJD(year: number, month: number, day: number, hourUT: number): number {
  if (month <= 2) { year--; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + day + hourUT/24 + B - 1524.5
}

// ── Lahiri Ayanamsa ───────────────────────────────────────────────────────────
function getLahiriAyanamsa(T: number): number {
  return 23.853056 + (50.29 / 3600) * T * 100
}

// ── Rahu true node ──────────────────────────────────────────────
function calcRahuTropical(T: number): number {
  const T2 = T * T, T3 = T2 * T
  const D  = norm360(297.8501921 + 445267.1114034*T)
  const M  = norm360(357.5291092 + 35999.0502909*T)
  const Mp = norm360(134.9633964 + 477198.8675055*T)
  const F  = norm360(93.2720950  + 483202.0175233*T)
  const Om = norm360(125.04452 - 1934.13626*T + 0.00207*T2 + T3/450000)
  const dOm = -1.4979*Math.sin(toRad(2*(D-F)))
            - 0.1500*Math.sin(toRad(M))
            - 0.1226*Math.sin(toRad(2*D))
            + 0.1176*Math.sin(toRad(2*F))
            - 0.0801*Math.sin(toRad(2*(Mp-F)))
  return norm360(Om + dOm)
}

// ── Ascendant ───────────────────────────────
function calcAscendantTropical(jd: number, latDeg: number, lonDeg: number): number {
  const T = (jd - 2451545.0) / 36525.0
  const T2 = T * T, T3 = T2 * T
  const GMST = norm360(280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T2 - T3/38710000)
  const LST  = norm360(GMST + lonDeg)
  const RAMCrad = toRad(LST)
  const eps = 23.4392911 - 0.01300416667*T - 0.00000163889*T2 + 0.00000050361*T3
  const epsRad = toRad(eps), latRad = toRad(latDeg)
  return norm360(toDeg(Math.atan2(
    Math.cos(RAMCrad),
    -(Math.sin(RAMCrad)*Math.cos(epsRad) + Math.tan(latRad)*Math.sin(epsRad))
  )))
}

// ── Retrograde detection ────────────────────────────────────────
function isRetrograde(planetSid: number, sunSid: number, innerPlanet: boolean, outerThreshold = [115, 245]): boolean {
  const elong = norm360(planetSid - sunSid)
  if (innerPlanet) {
    return elong < 28 || elong > 332 
  }
  return elong > outerThreshold[0] && elong < outerThreshold[1]
}

// ── Nakshatra ─────────────────────────────────────────────────────────────────
function getNakshatra(lon: number) {
  const span = 360 / 27
  const idx  = Math.floor(lon / span)
  const pada = Math.floor((lon % span) / (span / 4)) + 1
  return { index: idx, name: NAKSHATRAS[idx], pada, lord: NAKSHATRA_LORD[idx] }
}

function calcAntardasha(mdLord: string, mdStart: string) {
  const mdYears   = DASHA_YEARS[mdLord]
  const startIdx  = DASHA_LORDS.indexOf(mdLord)
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000
  const now = new Date()
  let cur = new Date(mdStart + 'T00:00:00Z').getTime()

  return Array.from({ length: 9 }, (_, i) => {
    const adLord      = DASHA_LORDS[(startIdx + i) % 9]
    const adYears     = (DASHA_YEARS[adLord] * mdYears) / 120
    const durationMs  = adYears * MS_PER_YEAR
    const end         = cur + durationMs
    const entry = {
      lord:      adLord,
      years:     parseFloat(adYears.toFixed(3)),
      start:     new Date(cur).toISOString().split('T')[0],
      end:       new Date(end).toISOString().split('T')[0],
      isCurrent: now.getTime() >= cur && now.getTime() < end,
    }
    cur = end
    return entry
  })
}

// ── Vimshottari Dasha ────────────────────
function calcDasha(moonSid: number, birthDateUTC: Date) {
  const nak = getNakshatra(moonSid)
  const span = 360 / 27
  const fractionElapsed = (moonSid % span) / span
  const startLord   = nak.lord
  const startIdx    = DASHA_LORDS.indexOf(startLord)
  const startYears  = DASHA_YEARS[startLord]
  const yearsRemaining = startYears * (1 - fractionElapsed)

  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000
  const now = new Date()

  const dashas: any[] = []
  let cur = birthDateUTC.getTime()

  const end0 = cur + yearsRemaining * MS_PER_YEAR
  const isCur0 = now.getTime() >= cur && now.getTime() <= end0
  dashas.push({
    lord: startLord, years: startYears,
    start: new Date(cur).toISOString().split('T')[0],
    end:   new Date(end0).toISOString().split('T')[0],
    isCurrent: isCur0,
    yearsRemaining: parseFloat(yearsRemaining.toFixed(2))
  })
  cur = end0

  for (let i = 1; i < 9; i++) {
    const lord  = DASHA_LORDS[(startIdx + i) % 9]
    const years = DASHA_YEARS[lord]
    const end   = cur + years * MS_PER_YEAR
    const isCur = now.getTime() >= cur && now.getTime() <= end
    dashas.push({
      lord, years,
      start: new Date(cur).toISOString().split('T')[0],
      end:   new Date(end).toISOString().split('T')[0],
      isCurrent: isCur
    })
    cur = end
  }
  dashas.forEach(d => {
    d.antardashas = calcAntardasha(d.lord, d.start)
  })

  return dashas
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSign(lon: number) {
  const idx = Math.floor((lon + 0.000001) / 30)
  return { index: idx, name: SIGNS[idx], sanskrit: SIGN_SANSKRIT[idx], degree: lon % 30 }
}

function sidToSidereal(tropical: number, ayanamsa: number) {
  return norm360(tropical - ayanamsa)
}

// ── POST — calculate chart ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date_of_birth, time_of_birth, latitude, longitude, timezone } = await request.json()
    if (!date_of_birth || latitude == null || longitude == null)
      return NextResponse.json({ error: 'date_of_birth, latitude, longitude required' }, { status: 400 })

    const [year, month, day] = date_of_birth.split('-').map(Number)
    const [hour = 12, minute = 0] = (time_of_birth || '12:00').split(':').map(Number)

    const TZ_OFFSETS: Record<string,number> = {
      'Asia/Kolkata':5.5,'Asia/Calcutta':5.5,
      'Asia/Dubai':4,'Asia/Singapore':8,'Asia/Tokyo':9,'Asia/Bangkok':7,
      'Asia/Shanghai':8,'Asia/Seoul':9,'Asia/Karachi':5,'Asia/Dhaka':6,
      'America/New_York':-5,'America/Los_Angeles':-8,'America/Chicago':-6,
      'America/Denver':-7,'America/Toronto':-5,'America/Sao_Paulo':-3,
      'Europe/London':0,'Europe/Paris':1,'Europe/Berlin':1,'Europe/Moscow':3,
      'Australia/Sydney':10,'Australia/Melbourne':10,'Pacific/Auckland':12,
      'Africa/Cairo':2,'Africa/Johannesburg':2,
    }
    const utcOffset = TZ_OFFSETS[timezone] ?? 5.5
    const hourUT = (hour + minute / 60) - utcOffset

    const jd = toJD(year, month, day, hourUT)
    const T  = (jd - 2451545.0) / 36525.0
    const ayanamsa = getLahiriAyanamsa(T)

    // Safely calculate absolute UTC time using milliseconds (prevents negative hour bugs)
    const localMs = Date.UTC(year, month - 1, day, hour, minute)
    const offsetMs = utcOffset * 60 * 60 * 1000
    const dateUTC = new Date(localMs - offsetMs)

// Set up Astronomy Engine Date (UTC)
const astroTime = new Astronomy.AstroTime(dateUTC)

    // ✅ FIX: Use .elon (ecliptic longitude) instead of .lon
    const getGeocentricLon = (body: string) => {
      if (body === 'Sun') {
        return Astronomy.SunPosition(astroTime).elon;
      }
      
      const vector = Astronomy.GeoVector(body as any, astroTime, true);
      return Astronomy.Ecliptic(vector).elon;
    };

    const sunTrop  = getGeocentricLon('Sun');
    const moonTrop = getGeocentricLon('Moon');
    const marsTrop = getGeocentricLon('Mars');
    const mercTrop = getGeocentricLon('Mercury');
    const jupTrop  = getGeocentricLon('Jupiter');
    const venTrop  = getGeocentricLon('Venus');
    const satTrop  = getGeocentricLon('Saturn');

    // Keep nodes and Lagna the same (already geocentric)
    const rahuTrop = calcRahuTropical(T)
    const ketuTrop = norm360(rahuTrop + 180)
    const ascTrop  = calcAscendantTropical(jd, latitude, longitude)

    const [sunSid,moonSid,marsSid,mercSid,jupSid,venSid,satSid,rahuSid,ketuSid,ascSid] =
      [sunTrop,moonTrop,marsTrop,mercTrop,jupTrop,venTrop,satTrop,rahuTrop,ketuTrop,ascTrop]
        .map(l => sidToSidereal(l, ayanamsa))

    const lagnaSign = getSign(ascSid)
    const lagnaIdx  = lagnaSign.index

    function house(sid: number) {
      return ((Math.floor((sid + 0.000001) / 30) - lagnaIdx + 12) % 12) + 1
    }

    const satRetro  = isRetrograde(satSid,  sunSid, false, [115,245])
    const jupRetro  = isRetrograde(jupSid,  sunSid, false, [115,245])
    const marsRetro = isRetrograde(marsSid, sunSid, false, [140,220])
    const mercElong = norm360(mercSid - sunSid)
    const mercRetro = mercElong > 332 || mercElong < 28
    const venElong  = norm360(venSid - sunSid)
    const venRetro  = venElong > 313 || venElong < 47

    const planets = [
      { id:0, name:'Sun',     sanskrit:'Surya',   symbol:'☉', longitude:sunSid,  sign:getSign(sunSid),  house:house(sunSid),  isRetrograde:false },
      { id:1, name:'Moon',    sanskrit:'Chandra',  symbol:'☽', longitude:moonSid, sign:getSign(moonSid), house:house(moonSid), isRetrograde:false },
      { id:2, name:'Mars',    sanskrit:'Mangal',   symbol:'♂', longitude:marsSid, sign:getSign(marsSid), house:house(marsSid), isRetrograde:marsRetro },
      { id:3, name:'Mercury', sanskrit:'Budha',    symbol:'☿', longitude:mercSid, sign:getSign(mercSid), house:house(mercSid), isRetrograde:mercRetro },
      { id:4, name:'Jupiter', sanskrit:'Guru',     symbol:'♃', longitude:jupSid,  sign:getSign(jupSid),  house:house(jupSid),  isRetrograde:jupRetro },
      { id:5, name:'Venus',   sanskrit:'Shukra',   symbol:'♀', longitude:venSid,  sign:getSign(venSid),  house:house(venSid),  isRetrograde:venRetro },
      { id:6, name:'Saturn',  sanskrit:'Shani',    symbol:'♄', longitude:satSid,  sign:getSign(satSid),  house:house(satSid),  isRetrograde:satRetro },
      { id:7, name:'Rahu',    sanskrit:'Rahu',     symbol:'☊', longitude:rahuSid, sign:getSign(rahuSid), house:house(rahuSid), isRetrograde:true },
      { id:8, name:'Ketu',    sanskrit:'Ketu',     symbol:'☋', longitude:ketuSid, sign:getSign(ketuSid), house:house(ketuSid), isRetrograde:true },
    ].map(p => ({
      ...p,
      longitude:   parseFloat(p.longitude.toFixed(4)),
      sign:        p.sign.name,
      sign_sanskrit: p.sign.sanskrit,
      sign_index:  p.sign.index,
      degree:      parseFloat(p.sign.degree.toFixed(2)),
    }))

    const houses = Array.from({ length: 12 }, (_, i) => {
      const hIdx = (lagnaIdx + i) % 12
      return {
        number: i + 1,
        sign: SIGNS[hIdx], sign_sanskrit: SIGN_SANSKRIT[hIdx], sign_index: hIdx,
        planets: planets.filter(p => p.house === i+1).map(p => p.name)
      }
    })

    const moonPlanet = planets.find(p => p.name === 'Moon')!
    const moonNak    = getNakshatra(moonSid)
    const dashas     = calcDasha(moonSid, dateUTC)
    const currentDasha = dashas.find(d => d.isCurrent) ?? dashas[0]
    const currentAntardasha = currentDasha.antardashas?.find((ad: any) => ad.isCurrent)
                         ?? currentDasha.antardashas?.[0]

    const chartData = {
      calculated_at: new Date().toISOString(),
      birth: { date: date_of_birth, time: time_of_birth, latitude, longitude, timezone },
      ayanamsa:   parseFloat(ayanamsa.toFixed(4)),
      julian_day: parseFloat(jd.toFixed(4)),
      lagna: {
        longitude:     parseFloat(ascSid.toFixed(4)),
        sign:          lagnaSign.name,
        sign_sanskrit: lagnaSign.sanskrit,
        sign_index:    lagnaIdx,
        degree:        parseFloat(lagnaSign.degree.toFixed(2))
      },
      planets,
      houses,
      moon_nakshatra:    moonNak,
      vimshottari_dasha: dashas,
      current_dasha:     currentDasha,
      summary: {
        lagna_sign:         lagnaSign.name,
        moon_sign:          moonPlanet.sign,
        sun_sign:           planets.find(p => p.name==='Sun')!.sign,
        moon_nakshatra:     moonNak.name,
        current_dasha_lord: currentDasha.lord,
        current_dasha_ends: currentDasha.end,
        current_antardasha_lord: currentAntardasha?.lord ?? null,
        current_antardasha_ends: currentAntardasha?.end  ?? null,
      }
    }

    const { error: saveError } = await supabase
      .from('kundali_charts')
      .upsert({ user_id: user.id, chart_data: chartData })
      .select().single()
    if (saveError) throw saveError

    return NextResponse.json({ success: true, chart: chartData })

  } catch (err: unknown) {
    console.error('Kundali error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Calculation failed' }, { status: 500 })
  }
}

// ── GET — fetch cached chart ──────────────────────────────────────────────────
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
      .limit(1).single()

    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json({ chart: data?.chart_data ?? null })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 })
  }
}