import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import * as Astronomy from 'astronomy-engine'

// ── Lookup tables ─────────────────────────────────────────────────────────────
const TITHIS = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima',
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Amavasya',
]
const PAKSHA = [...Array(15).fill('Shukla'), ...Array(15).fill('Krishna')]

const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati',
]
const NAKSHATRA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
]

const YOGAS = [
  'Vishkambha','Preeti','Ayushman','Saubhagya','Shobhana','Atiganda',
  'Sukarma','Dhriti','Shoola','Ganda','Vriddhi','Dhruva',
  'Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan',
  'Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla',
  'Brahma','Indra','Vaidhriti',
]
const YOGA_QUALITY: Record<string, 'auspicious' | 'inauspicious' | 'neutral'> = {
  Vishkambha:'inauspicious', Preeti:'auspicious',    Ayushman:'auspicious',
  Saubhagya:'auspicious',   Shobhana:'auspicious',   Atiganda:'inauspicious',
  Sukarma:'auspicious',     Dhriti:'auspicious',      Shoola:'inauspicious',
  Ganda:'inauspicious',     Vriddhi:'auspicious',     Dhruva:'auspicious',
  Vyaghata:'inauspicious',  Harshana:'auspicious',    Vajra:'inauspicious',
  Siddhi:'auspicious',      Vyatipata:'inauspicious', Variyan:'neutral',
  Parigha:'inauspicious',   Shiva:'auspicious',       Siddha:'auspicious',
  Sadhya:'auspicious',      Shubha:'auspicious',      Shukla:'auspicious',
  Brahma:'auspicious',      Indra:'auspicious',       Vaidhriti:'inauspicious',
}

const MOVABLE_KARANAS = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti']
const VARA            = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const VARA_SANSKRIT   = ['Ravivara','Somavara','Mangalvara','Budhavara','Guruvara','Shukravara','Shanivara']
const VARA_LORD       = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

const RAHU_SLOT:   Record<number,number> = { 0:8, 1:2, 2:7, 3:5, 4:6, 5:4, 6:3 }
const GULIKA_SLOT: Record<number,number> = { 0:7, 1:6, 2:5, 3:4, 4:3, 5:2, 6:1 }

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm360(x: number) { return ((x % 360) + 360) % 360 }

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

function getKarana(moonSid: number, sunSid: number) {
  const diff = norm360(moonSid - sunSid)
  const idx  = Math.floor(diff / 6) % 60
  let name: string
  if (idx === 0)       name = 'Kimstughna'
  else if (idx <= 56)  name = MOVABLE_KARANAS[(idx - 1) % 7]
  else if (idx === 57) name = 'Shakuni'
  else if (idx === 58) name = 'Chatushpada'
  else                 name = 'Naga'
  return { name, index: idx }
}

function slotWindow(sunrise: Date, dayMs: number, slot: number) {
  const slotMs = dayMs / 8
  return {
    start: new Date(sunrise.getTime() + (slot - 1) * slotMs).toISOString(),
    end:   new Date(sunrise.getTime() + slot       * slotMs).toISOString(),
  }
}

// ── Sunrise/sunset using astronomy-engine with correct search window ──────────
//
// KEY FIX: We must NOT search from UTC midnight, because for UTC+5:30 (IST),
// local midnight is 18:30 UTC the *previous* day. Searching from UTC midnight
// misses the actual sunrise window and returns garbage.
//
// SOLUTION: Search from (local noon - 12h) to (local noon + 12h), i.e. a
// 24-hour window centred on local solar noon. This always brackets exactly
// one sunrise and one sunset for any timezone.
//
// "Local noon in UTC" = Date.UTC(y, m-1, d, 12, 0, 0) - tzOffsetMs
// We approximate tzOffsetMs from the lon: lon/15 hours (good to ±30 min,
// more than enough to bracket the 24h window correctly).
//
function calcSunTimes(
  year: number, month: number, day: number,
  lat: number, lon: number
): { sunrise: Date | null; sunset: Date | null } {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0)

    // Approximate local noon in UTC using longitude (15° = 1 hour)
    // e.g. Ludhiana lon=75.85 → offset ≈ 5.06 h → noon UTC ≈ 12 - 5.06 = 06:56 UTC
    const lonOffsetHours = lon / 15
    const localNoonUTC = new Date(
      Date.UTC(year, month - 1, day, 12, 0, 0) - lonOffsetHours * 3600000
    )

    // Search 12 hours before local noon → guaranteed to be before sunrise
    const searchStart = new Date(localNoonUTC.getTime() - 12 * 3600000)

    // SearchRiseSet direction: +1 = rising, -1 = setting
    // limitDays = 1 means search up to 1 day forward from searchStart
    const riseEvent = Astronomy.SearchRiseSet(
      Astronomy.Body.Sun, observer, +1, searchStart, 1
    )
    const setEvent = Astronomy.SearchRiseSet(
      Astronomy.Body.Sun, observer, -1, searchStart, 1
    )

    const sunrise = riseEvent?.date ?? null
    const sunset  = setEvent?.date  ?? null

    console.log('calcSunTimes:', {
      searchStart: searchStart.toISOString(),
      sunrise: sunrise?.toISOString(),
      sunset:  sunset?.toISOString(),
    })

    // Final sanity: swap if somehow inverted
    if (sunrise && sunset && sunrise.getTime() > sunset.getTime()) {
      return { sunrise: sunset, sunset: sunrise }
    }

    return { sunrise, sunset }
  } catch (err) {
    console.error('calcSunTimes error:', err)
    return { sunrise: null, sunset: null }
  }
}

// ── GET /api/panchang?lat=&lon=&timezone= ─────────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url      = new URL(request.url)
    const lat      = parseFloat(url.searchParams.get('lat')      || '20.5937')
    const lon      = parseFloat(url.searchParams.get('lon')      || '78.9629')
    const timezone = url.searchParams.get('timezone')            || 'Asia/Kolkata'
    const location = url.searchParams.get('location')            || 'India'

    // Today's date in the observer's timezone
    const nowLocal  = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    const year  = nowLocal.getFullYear()
    const month = nowLocal.getMonth() + 1
    const day   = nowLocal.getDate()

    // Use solar noon UTC for planetary positions (~6 UTC = noon IST)
    const noonUTC   = new Date(Date.UTC(year, month - 1, day, 6, 0, 0))
    const astroTime = new Astronomy.AstroTime(noonUTC)

    const jd       = toJD(year, month, day, 6)
    const ayanamsa = getLahiriAyanamsa(jd)

    const getGeoLon = (body: string): number => {
      if (body === 'Sun') return Astronomy.SunPosition(astroTime).elon
      return Astronomy.Ecliptic(Astronomy.GeoVector(body as any, astroTime, true)).elon
    }

    const sunSid  = norm360(getGeoLon('Sun')  - ayanamsa)
    const moonSid = norm360(getGeoLon('Moon') - ayanamsa)

    // ── Five elements ─────────────────────────────────────────────
    const tithiDiff  = norm360(moonSid - sunSid)
    const tithiIndex = Math.floor(tithiDiff / 12)
    const tithiPct   = (tithiDiff % 12) / 12

    const nakSpan  = 360 / 27
    const nakIndex = Math.floor(moonSid / nakSpan)
    const nakPada  = Math.floor((moonSid % nakSpan) / (nakSpan / 4)) + 1
    const nakPct   = (moonSid % nakSpan) / nakSpan

    const yogaIndex = Math.floor(norm360(sunSid + moonSid) / (360 / 27))
    const karana    = getKarana(moonSid, sunSid)
    const varaIndex = nowLocal.getDay()

    // ── Sunrise / Sunset ──────────────────────────────────────────
    const { sunrise, sunset } = calcSunTimes(year, month, day, lat, lon)
    const dayMs = sunrise && sunset ? sunset.getTime() - sunrise.getTime() : 0

    // ── Muhurtas ──────────────────────────────────────────────────
    let muhurtas: Record<string, { start: string; end: string } | null> = {
      brahma: null, abhijit: null, rahu: null, gulika: null,
    }

    if (sunrise && sunset && dayMs > 0) {
      muhurtas.brahma = {
        start: new Date(sunrise.getTime() - 96 * 60000).toISOString(),
        end:   new Date(sunrise.getTime() - 48 * 60000).toISOString(),
      }
      const noon = new Date(sunrise.getTime() + dayMs / 2)
      muhurtas.abhijit = {
        start: new Date(noon.getTime() - 24 * 60000).toISOString(),
        end:   new Date(noon.getTime() + 24 * 60000).toISOString(),
      }
      muhurtas.rahu   = slotWindow(sunrise, dayMs, RAHU_SLOT[varaIndex])
      muhurtas.gulika = slotWindow(sunrise, dayMs, GULIKA_SLOT[varaIndex])
    }

    return NextResponse.json({
      panchang: {
        date:      `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        location,
        timezone,
        vara:      { name: VARA[varaIndex], sanskrit: VARA_SANSKRIT[varaIndex], lord: VARA_LORD[varaIndex] },
        tithi:     { index: tithiIndex, name: TITHIS[tithiIndex], paksha: PAKSHA[tithiIndex], number: (tithiIndex % 15) + 1, pct: parseFloat(tithiPct.toFixed(3)) },
        nakshatra: { index: nakIndex, name: NAKSHATRAS[nakIndex], lord: NAKSHATRA_LORD[nakIndex], pada: nakPada, pct: parseFloat(nakPct.toFixed(3)) },
        yoga:      { index: yogaIndex, name: YOGAS[yogaIndex], quality: YOGA_QUALITY[YOGAS[yogaIndex]] || 'neutral' },
        karana:    { index: karana.index, name: karana.name },
        sunrise:   sunrise?.toISOString() ?? null,
        sunset:    sunset?.toISOString()  ?? null,
        muhurtas,
      }
    })

  } catch (err: unknown) {
    console.error('Panchang error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Calculation failed' }, { status: 500 })
  }
}