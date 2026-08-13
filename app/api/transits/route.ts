import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import * as Astronomy from 'astronomy-engine'
import { SIGNS, SIGN_SANSKRIT, norm360, toJD, getLahiriAyanamsa, calcRahuTropical } from '@/app/lib/jyotish/astro'

const PLANETS = [
  { name:'Sun',     sanskrit:'Surya',   symbol:'☉', key:'Sun'     },
  { name:'Moon',    sanskrit:'Chandra', symbol:'☽', key:'Moon'    },
  { name:'Mars',    sanskrit:'Mangal',  symbol:'♂', key:'Mars'    },
  { name:'Mercury', sanskrit:'Budha',   symbol:'☿', key:'Mercury' },
  { name:'Jupiter', sanskrit:'Guru',    symbol:'♃', key:'Jupiter' },
  { name:'Venus',   sanskrit:'Shukra',  symbol:'♀', key:'Venus'   },
  { name:'Saturn',  sanskrit:'Shani',   symbol:'♄', key:'Saturn'  },
  { name:'Rahu',    sanskrit:'Rahu',    symbol:'☊', key:'Rahu'    },
  { name:'Ketu',    sanskrit:'Ketu',    symbol:'☋', key:'Ketu'    },
]

// Which natal houses does a planet in `fromHouse` aspect?
function aspectedHouses(name: string, h: number): number[] {
  const i = h - 1
  const a = [((i+6)%12)+1]                                          // 7th — all planets
  if (name==='Mars')                 a.push(((i+3)%12)+1, ((i+7)%12)+1)  // 4th, 8th
  if (name==='Jupiter')              a.push(((i+4)%12)+1, ((i+8)%12)+1)  // 5th, 9th
  if (name==='Saturn')               a.push(((i+2)%12)+1, ((i+9)%12)+1)  // 3rd, 10th
  if (name==='Rahu'||name==='Ketu')  a.push(((i+4)%12)+1, ((i+8)%12)+1)  // 5th, 9th
  return [...new Set(a)]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Natal chart
    const { data: row } = await supabase
      .from('kundali_charts').select('chart_data')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .limit(1).single()
    if (!row?.chart_data)
      return NextResponse.json({ error: 'No natal chart found. Please generate your Kundali first.' }, { status: 404 })

    const natal   = row.chart_data
    const now     = new Date()
    const jd      = toJD(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(), now.getUTCHours()+now.getUTCMinutes()/60)
    const T       = (jd - 2451545.0) / 36525.0
    const ayan    = getLahiriAyanamsa(jd)
    const at      = new Astronomy.AstroTime(now)
    const at1     = new Astronomy.AstroTime(new Date(now.getTime() - 86400000))
    const T1      = T - 1/365.25

    const tropNow = (key: string): number => {
      if (key==='Sun')  return Astronomy.SunPosition(at).elon
      if (key==='Rahu') return calcRahuTropical(T)
      if (key==='Ketu') return norm360(calcRahuTropical(T)+180)
      return Astronomy.Ecliptic(Astronomy.GeoVector(key as any, at, true)).elon
    }
    const tropYest = (key: string): number => {
      if (key==='Sun')  return Astronomy.SunPosition(at1).elon
      if (key==='Rahu') return calcRahuTropical(T1)
      if (key==='Ketu') return norm360(calcRahuTropical(T1)+180)
      return Astronomy.Ecliptic(Astronomy.GeoVector(key as any, at1, true)).elon
    }

    const lagnaIdx = natal.lagna.sign_index
    const natalMap: Record<string, any> = {}
    for (const p of natal.planets) natalMap[p.name] = p

    // Build per-planet transit data
    const planets = PLANETS.map(meta => {
      const trop  = tropNow(meta.key)
      const sid   = norm360(trop - ayan)
      const sIdx  = Math.floor(sid / 30)
      const deg   = sid % 30
      const house = ((sIdx - lagnaIdx + 12) % 12) + 1

      // Retrograde = negative daily motion
      const delta = norm360(trop - tropYest(meta.key) + 180) - 180
      const retro = meta.name==='Rahu'||meta.name==='Ketu' ? true : delta < 0

      // Natal planet conjunctions within 8°
      const np      = natalMap[meta.name]
      const conjunct: string[] = []
      for (const other of natal.planets) {
        if (other.name === meta.name) continue
        if (Math.abs(norm360(sid - other.longitude + 180) - 180) <= 8)
          conjunct.push(other.name)
      }

      return {
        name: meta.name, sanskrit: meta.sanskrit, symbol: meta.symbol,
        current: { sign: SIGNS[sIdx], sign_index: sIdx, sign_sanskrit: SIGN_SANSKRIT[sIdx],
                   degree: parseFloat(deg.toFixed(2)), longitude: parseFloat(sid.toFixed(2)),
                   isRetrograde: retro },
        natal:   { sign: np?.sign ?? '?', sign_index: np?.sign_index ?? 0,
                   degree: np?.degree ?? 0, house: np?.house ?? 1 },
        transit_house: house,
        conjunct_natal: conjunct,
        aspects_natal_houses: aspectedHouses(meta.name, house),
      }
    })

    // Special transits
    const specials: any[] = []
    const moonSIdx = natalMap['Moon']?.sign_index ?? 0
    const satSIdx  = planets.find(p=>p.name==='Saturn')!.current.sign_index
    const satFromM = (satSIdx - moonSIdx + 12) % 12
    if ([0,1,11].includes(satFromM)) {
      const phase = satFromM===11 ? '12th (first phase)' : satFromM===0 ? '1st (peak phase)' : '2nd (final phase)'
      specials.push({ type:'sade_sati', planet:'Saturn', severity:'challenging',
        label:'Sade Sati Active',
        description:`Saturn transits the ${phase} from your natal Moon. A 7.5-year period of karmic reckoning, discipline, and deep transformation — also a time of great wisdom-building.` })
    } else if ([3,7].includes(satFromM)) {
      specials.push({ type:'dhaiya', planet:'Saturn', severity:'caution',
        label:'Dhaiya — Kantaka Shani',
        description:`Saturn transits the ${satFromM===3?'4th':'8th'} from natal Moon. A 2.5-year cycle demanding patience, inner resilience, and careful decisions.` })
    }

    const jupSIdx  = planets.find(p=>p.name==='Jupiter')!.current.sign_index
    const jupFromL = (jupSIdx - lagnaIdx + 12) % 12
    const jupFromM = (jupSIdx - moonSIdx + 12) % 12
    const trikonas = [0,4,8]
    if (trikonas.includes(jupFromL)) {
      specials.push({ type:'guru_gochar', planet:'Jupiter', severity:'positive',
        label:'Guru Gochar — Trikona from Lagna',
        description:`Jupiter transits the ${[1,5,9][trikonas.indexOf(jupFromL)]}th from your Lagna — an auspicious period for expansion, new beginnings, and spiritual growth.` })
    } else if (trikonas.includes(jupFromM)) {
      specials.push({ type:'guru_gochar', planet:'Jupiter', severity:'positive',
        label:'Guru Gochar — Trikona from Moon',
        description:`Jupiter transits the ${[1,5,9][trikonas.indexOf(jupFromM)]}th from your natal Moon — bringing optimism, opportunity, and forward momentum.` })
    }

    const rahuSIdx = planets.find(p=>p.name==='Rahu')!.current.sign_index
    if (rahuSIdx === moonSIdx || Math.abs(rahuSIdx - moonSIdx) === 6) {
      specials.push({ type:'rahu_moon', planet:'Rahu', severity:'caution',
        label:'Rahu Transiting Natal Moon Axis',
        description:'Rahu (or Ketu) conjuncts your natal Moon sign — intensifying desires, bringing unexpected shifts, and heightening sensitivity. Good time to stay grounded.' })
    }

    // Aspects from slow planets to natal planets (Saturn, Jupiter, Mars, Rahu, Ketu only)
    const slowPlanets = new Set(['Saturn','Jupiter','Mars','Rahu','Ketu'])
    const aspects: any[] = []
    for (const tp of planets.filter(p => slowPlanets.has(p.name))) {
      for (const ah of tp.aspects_natal_houses) {
        for (const np of natal.planets) {
          if (np.house === ah) {
            const aspectNum = ((ah - tp.transit_house + 12) % 12) + 1
            aspects.push({
              transit_planet: tp.name, transit_symbol: tp.symbol,
              natal_planet: np.name,  natal_house: ah,
              aspect_num: aspectNum,
            })
          }
        }
      }
    }

    return NextResponse.json({
      transits: {
        date: now.toISOString().split('T')[0],
        natal_lagna: natal.lagna,
        natal_moon_sign: natalMap['Moon']?.sign ?? '?',
        planets,
        special_transits: specials,
        aspects: aspects.slice(0, 12),
      }
    })

  } catch (err: unknown) {
    console.error('Transits error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Calculation failed' }, { status: 500 })
  }
}