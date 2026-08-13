// Shared sidereal-astrology math used by kundali, transits, and shubh-ashubh.
// Consolidated here so formula fixes (e.g. the DST-aware offset resolution,
// or the full-precision Rahu node terms) only have to happen in one place —
// these three routes used to each keep their own copy, and had already
// drifted out of sync with each other before this consolidation.

export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
export const SIGN_SANSKRIT = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena']
export const NAKSHATRAS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'
]
export const NAKSHATRA_LORD = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'
]

export function norm360(x: number): number { return ((x % 360) + 360) % 360 }
export function toRad(d: number): number   { return d * Math.PI / 180 }
export function toDeg(r: number): number   { return r * 180 / Math.PI }

// ── Julian Day ────────────────────────────────────────────────────────────────
export function toJD(year: number, month: number, day: number, hourUT: number): number {
  if (month <= 2) { year--; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + day + hourUT/24 + B - 1524.5
}

// ── Lahiri Ayanamsa ───────────────────────────────────────────────────────────
export function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0
  return 23.853056 + (50.29 / 3600) * T * 100
}

// ── Rahu true node — full-precision terms. (transits/route.ts used to carry
// a truncated-coefficient copy of this that computed a measurably less
// accurate node position than this one; import this instead of re-deriving.) ──
export function calcRahuTropical(T: number): number {
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

// ── Timezone offset (DST-aware) ──────────────────────────────────────────────
// A static per-zone offset table is wrong for roughly half the year in any
// DST-observing zone (e.g. America/New_York is -5 in winter, -4 in summer) —
// enough to shift the Lagna/houses. Instead, resolve the real historical
// offset for this IANA zone on this exact date via Intl.
//
// Two-pass: the offset can differ right at a DST transition, so we first
// sample the offset using the local wall-clock numbers as a proxy instant,
// then re-sample using that guess's resulting UTC instant to correct for
// dates that land within a few hours of a transition boundary.
function offsetMinutesAt(timezone: string, instantMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instantMs))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const zonedAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (zonedAsUTC - instantMs) / 60000
}

export function resolveUtcOffsetHours(timezone: string, year: number, month: number, day: number, hour: number, minute: number): number {
  const localAsUTC = Date.UTC(year, month - 1, day, hour, minute)
  const firstGuessMin = offsetMinutesAt(timezone, localAsUTC)
  const refinedInstant = localAsUTC - firstGuessMin * 60000
  return offsetMinutesAt(timezone, refinedInstant) / 60
}
