import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import { getCached, setCached } from '@/app/lib/cache/route-cache'

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}

// Classical dignity — only defined for the 7 grahas (Rahu/Ketu dignity is
// disputed across traditions, so it is intentionally left uncalculated).
const EXALTATION: Record<string,string>   = { Sun:'Aries', Moon:'Taurus', Mars:'Capricorn', Mercury:'Virgo', Jupiter:'Cancer',    Venus:'Pisces', Saturn:'Libra' }
const DEBILITATION: Record<string,string> = { Sun:'Libra', Moon:'Scorpio', Mars:'Cancer',    Mercury:'Pisces', Jupiter:'Capricorn', Venus:'Virgo',  Saturn:'Aries' }
const OWN_SIGNS: Record<string,string[]>  = {
  Sun:['Leo'], Moon:['Cancer'], Mars:['Aries','Scorpio'], Mercury:['Gemini','Virgo'],
  Jupiter:['Sagittarius','Pisces'], Venus:['Taurus','Libra'], Saturn:['Capricorn','Aquarius'],
}

function getHouseLord(houseNum: number, lagnaSignIdx: number): string {
  const signIdx = (lagnaSignIdx + houseNum - 1) % 12
  return SIGN_LORD[SIGNS[signIdx]]
}

function getOwnedHouses(planetName: string, lagnaSignIdx: number): number[] {
  const owned: number[] = []
  for (let h = 1; h <= 12; h++) {
    if (getHouseLord(h, lagnaSignIdx) === planetName) owned.push(h)
  }
  return owned
}

function getDignity(planetName: string, sign: string): string | null {
  if (EXALTATION[planetName] === sign) return 'Exalted'
  if (DEBILITATION[planetName] === sign) return 'Debilitated'
  if (OWN_SIGNS[planetName]?.includes(sign)) return 'Own sign (Swakshetra)'
  return null
}

// ── Functional nature per Lagna (Yogakaraka concept, BPHS) ─────────────────────
// A planet's classical gemstone recommendation should be based on which houses
// it RULES for this specific Lagna, not simply on which Mahadasha is running.
// Kendra houses (1,4,7,10) = Vishnu-sthana (action); Trikona (1,5,9) = Lakshmi-
// sthana (fortune). A planet ruling both is a Yogakaraka — the strongest
// possible benefic for that Lagna, regardless of its natural (naisargika)
// nature. The Lagna lord itself is always at least a benefic ("never harms").
const KENDRA   = [1,4,7,10]
const TRIKONA  = [1,5,9]
const DUSTHANA = [6,8,12]
const CLASSICAL_PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

function getFunctionalNature(planetName: string, lagnaSignIdx: number): 'yogakaraka' | 'benefic' | 'neutral' | 'malefic' {
  const owned = getOwnedHouses(planetName, lagnaSignIdx)
  if (owned.length === 0) return 'neutral'

  const rulesLagna   = owned.includes(1)
  const rulesKendra  = owned.some(h => KENDRA.includes(h))
  const rulesTrikona = owned.some(h => TRIKONA.includes(h))
  const onlyDusthana = owned.every(h => DUSTHANA.includes(h))

  if (rulesLagna) return 'yogakaraka'                  // Lagna lord — always protects
  if (rulesKendra && rulesTrikona) return 'yogakaraka' // true Yogakaraka
  if (rulesTrikona) return 'benefic'                    // pure Trikona lord (5th/9th)
  if (onlyDusthana) return 'malefic'                    // only 6th/8th/12th, no relief
  return 'neutral'                                      // Kendra-only, or 2nd/3rd/11th only
}

function getPersonalizedGemstones(lagnaSignIdx: number) {
  const results = CLASSICAL_PLANETS.map(p => ({
    planet: p,
    nature: getFunctionalNature(p, lagnaSignIdx),
    houses: getOwnedHouses(p, lagnaSignIdx),
  }))
  return {
    recommended: results.filter(r => r.nature === 'yogakaraka' || r.nature === 'benefic'),
    avoid:       results.filter(r => r.nature === 'malefic'),
  }
}

// ── Classical remedies (Navaratna gemstones, colours, mantra, charity) ────────
// Gemstones — especially Blue Sapphire (Saturn), Hessonite (Rahu) and Cat's Eye
// (Ketu) — are classically considered powerful and can backfire if wrong for the
// person, so every entry includes a lower-cost substitute stone and a caution to
// trial it and consult a qualified astrologer before committing to the primary gem.
const REMEDIES: Record<string, {
  gemstone: string; gemstoneSanskrit: string; substitute: string
  color: string; day: string; mantra: string; charity: string; caution: string
}> = {
  Sun:     { gemstone: 'Ruby',            gemstoneSanskrit: 'Manikya',         substitute: 'Red Garnet or Red Spinel', color: 'Red, Orange, Copper',     day: 'Sunday',    mantra: 'Om Suryaya Namaha',      charity: 'Wheat, jaggery, or copper items to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Ruby, and confirm fit with an astrologer first.' },
  Moon:    { gemstone: 'Pearl',           gemstoneSanskrit: 'Moti',            substitute: 'Moonstone',                color: 'White, Cream, Silver',     day: 'Monday',    mantra: 'Om Chandraya Namaha',    charity: 'Rice, milk, or white clothes to those in need',    caution: 'Trial the substitute stone for a few weeks before wearing Pearl, and confirm fit with an astrologer first.' },
  Mars:    { gemstone: 'Red Coral',       gemstoneSanskrit: 'Moonga',          substitute: 'Carnelian',                color: 'Red',                      day: 'Tuesday',   mantra: 'Om Angarakaya Namaha',   charity: 'Red lentils (masoor dal) or jaggery to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Red Coral, and confirm fit with an astrologer first.' },
  Mercury: { gemstone: 'Emerald',         gemstoneSanskrit: 'Panna',           substitute: 'Peridot or Green Onyx',    color: 'Green',                    day: 'Wednesday', mantra: 'Om Budhaya Namaha',      charity: 'Green moong dal or green clothes to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Emerald, and confirm fit with an astrologer first.' },
  Jupiter: { gemstone: 'Yellow Sapphire', gemstoneSanskrit: 'Pukhraj',         substitute: 'Yellow Topaz or Citrine',  color: 'Yellow, Gold',             day: 'Thursday',  mantra: 'Om Brihaspataye Namaha', charity: 'Turmeric, chana dal, or yellow items to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Yellow Sapphire, and confirm fit with an astrologer first.' },
  Venus:   { gemstone: 'Diamond',         gemstoneSanskrit: 'Heera',           substitute: 'White Sapphire or Zircon', color: 'White, Pastel Pink',      day: 'Friday',    mantra: 'Om Shukraya Namaha',     charity: 'Rice, sugar, or white/pastel clothes to those in need', caution: 'A high-value stone — most people trial the substitute first and consult a qualified astrologer before committing to a Diamond.' },
  Saturn:  { gemstone: 'Blue Sapphire',   gemstoneSanskrit: 'Neelam',          substitute: 'Amethyst',                 color: 'Dark Blue, Black',        day: 'Saturday',  mantra: 'Om Shanicharaya Namaha', charity: 'Black sesame, mustard oil, or iron items to those in need', caution: 'Classical texts consider Blue Sapphire the most powerful and unpredictable gem — always trial the substitute for a few weeks first, and only wear it under a qualified astrologer\'s guidance.' },
  Rahu:    { gemstone: 'Hessonite',       gemstoneSanskrit: 'Gomed',           substitute: 'Orange Zircon',            color: 'Smoky, Multicolor',       day: 'Saturday',  mantra: 'Om Rahave Namaha',       charity: 'Mustard seeds or blankets to those in need', caution: 'A shadow-planet gemstone — best worn only after a trial period and consultation with a qualified astrologer.' },
  Ketu:    { gemstone: "Cat's Eye",       gemstoneSanskrit: 'Vaidurya / Lehsunia', substitute: 'Tiger Eye',            color: 'Grey, Brown, Multicolor', day: 'Tuesday',   mantra: 'Om Ketave Namaha',       charity: 'Sesame seeds or blankets to those in need', caution: 'A shadow-planet gemstone — best worn only after a trial period and consultation with a qualified astrologer.' },
}

function buildPlanetContext(planetName: string, chart: any, lagnaSignIdx: number) {
  const p = chart.planets?.find((pl: any) => pl.name === planetName)
  if (!p) return null
  return {
    planet: planetName,
    currentHouse: p.house,
    sign: p.sign,
    ownedHouses: getOwnedHouses(planetName, lagnaSignIdx),
    dignity: getDignity(planetName, p.sign),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // kundali_charts can hold more than one row per user (see the same handling
    // in app/api/kundali/route.ts's GET handler) — order by created_at and take
    // the most recent, using the same PGRST116 ("no rows") handling for safety.
    const { data: chartRow, error: chartErr } = await supabase
      .from('kundali_charts')
      .select('chart_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (chartErr && chartErr.code !== 'PGRST116') {
      console.error('Dasha Fal chart fetch error:', chartErr)
    }
    const chart = chartRow?.chart_data
    if (!chart) {
      return NextResponse.json({ error: 'Please generate your Kundali first.' }, { status: 400 })
    }

    const lagnaSignIdx = chart.lagna?.sign_index ?? 0
    const mdLord   = chart.current_dasha?.lord
    const adLord   = chart.summary?.current_antardasha_lord
    const yogini       = chart.current_yogini_dasha?.yogini
    const yoginiPlanet = chart.current_yogini_dasha?.planet

    if (!mdLord) {
      return NextResponse.json({ error: 'Dasha data unavailable on this chart. Please regenerate your Kundali.' }, { status: 400 })
    }

    // Dasha Fal only changes when the Mahadasha/Antardasha shifts, or the chart
    // itself is regenerated — cache key combines both.
    const cacheKey = `${mdLord}|${adLord}|${chartRow?.created_at ?? 'unknown'}`
    const cached = await getCached(supabase, user.id, 'dasha-fal', cacheKey)
    if (cached) return NextResponse.json({ success: true, dashaFal: cached })

    const mdContext = buildPlanetContext(mdLord, chart, lagnaSignIdx)
    const adContext = adLord ? buildPlanetContext(adLord, chart, lagnaSignIdx) : null
    const remedies   = REMEDIES[mdLord] ?? null

    // Personalized gemstone recommendation — based on which houses each planet
    // RULES for this Lagna (Yogakaraka/Trikona lords), not on the running dasha.
    // This is how a real astrologer determines "your" gemstones.
    const { recommended: gemstonePlanets, avoid: avoidPlanets } = getPersonalizedGemstones(lagnaSignIdx)
    const personalizedGemstones = gemstonePlanets.map(g => ({ ...g, remedy: REMEDIES[g.planet] }))
    const mdLordNature = getFunctionalNature(mdLord, lagnaSignIdx)
    const mdLordIsFunctionalMalefic = mdLordNature === 'malefic'

    // ── Groq AI narrative — grounded in real house/dignity data, not generic ──
    const systemPrompt = `You are Daivam — a warm, wise Vedic astrologer specialising in Dasha Phala (results of planetary periods).
Base your reading on classical Brihat Parashara Hora Shastra principles: a Dasha lord's results are shaped chiefly by (a) the house it currently occupies, (b) the house(s) it owns as lord, and (c) its dignity (exalted / debilitated / own sign / neutral).
Keep your response to exactly 3 short paragraphs, under 200 words total:
1. The overall theme of the current Mahadasha/Antardasha combination — which life areas (houses) it activates, based on the specific placements given.
2. Concrete opportunities or strengths this period offers, grounded in those placements.
3. One caution to be mindful of, plus a practical piece of guidance.
Use Sanskrit terms with English in brackets. Be warm and empowering — frame a difficult placement as a lesson, never as doom.`

    const userMsg = `Lagna: ${chart.lagna?.sign}

Current Mahadasha lord: ${mdLord}
- Placed in house ${mdContext?.currentHouse} (sign: ${mdContext?.sign})
- Owns house(s): ${mdContext?.ownedHouses?.length ? mdContext.ownedHouses.join(', ') : 'none (lunar node — no house rulership)'}
- Dignity: ${mdContext?.dignity ?? 'Neutral (no special dignity)'}
- Functional nature for this Lagna: ${mdLordNature}${mdLordIsFunctionalMalefic ? ' (a functional malefic for this Lagna — mention this gently as a reason for extra mindfulness, without being alarming)' : ''}

Current Antardasha lord: ${adLord ?? 'unavailable'}
${adContext ? `- Placed in house ${adContext.currentHouse} (sign: ${adContext.sign})
- Owns house(s): ${adContext.ownedHouses?.length ? adContext.ownedHouses.join(', ') : 'none (lunar node — no house rulership)'}
- Dignity: ${adContext.dignity ?? 'Neutral (no special dignity)'}` : ''}

Current Yogini Dasha (secondary system): ${yogini ?? 'unavailable'} (ruled by ${yoginiPlanet ?? '—'})

Provide a personalised Dasha Fal reading for this period.`

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

    const dashaFal = {
      mahadasha:  { lord: mdLord, ...mdContext, functionalNature: mdLordNature, isFunctionalMalefic: mdLordIsFunctionalMalefic },
      antardasha: adLord ? { lord: adLord, ...adContext } : null,
      yogini:     { name: yogini ?? null, planet: yoginiPlanet ?? null },
      remedies,               // dasha-lord's classical remedy (timing-based, secondary)
      personalizedGemstones,  // Lagna-based Yogakaraka/Trikona recommendations (primary, evergreen)
      avoidGemstones: avoidPlanets,
      narrative,
    }
    await setCached(supabase, user.id, 'dasha-fal', cacheKey, dashaFal)

    return NextResponse.json({ success: true, dashaFal })
  } catch (err: unknown) {
    console.error('Dasha Fal error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Dasha Fal calculation failed' }, { status: 500 })
  }
}