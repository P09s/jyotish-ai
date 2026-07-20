import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import { getCached, setCached, chartFingerprint } from '@/app/lib/cache/route-cache'
import { SIGNS, SIGN_LORD, KENDRA, TRIKONA, DUSTHANA, CLASSICAL_PLANETS, getHouseLord, getOwnedHouses, getFunctionalNature, REMEDIES } from '@/app/lib/jyotish/remedies'

// Classical dignity — only defined for the 7 grahas (Rahu/Ketu dignity is
// disputed across traditions, so it is intentionally left uncalculated).
const EXALTATION: Record<string,string>   = { Sun:'Aries', Moon:'Taurus', Mars:'Capricorn', Mercury:'Virgo', Jupiter:'Cancer',    Venus:'Pisces', Saturn:'Libra' }
const DEBILITATION: Record<string,string> = { Sun:'Libra', Moon:'Scorpio', Mars:'Cancer',    Mercury:'Pisces', Jupiter:'Capricorn', Venus:'Virgo',  Saturn:'Aries' }
const OWN_SIGNS: Record<string,string[]>  = {
  Sun:['Leo'], Moon:['Cancer'], Mars:['Aries','Scorpio'], Mercury:['Gemini','Virgo'],
  Jupiter:['Sagittarius','Pisces'], Venus:['Taurus','Libra'], Saturn:['Capricorn','Aquarius'],
}

function getDignity(planetName: string, sign: string): string | null {
  if (EXALTATION[planetName] === sign) return 'Exalted'
  if (DEBILITATION[planetName] === sign) return 'Debilitated'
  if (OWN_SIGNS[planetName]?.includes(sign)) return 'Own sign (Swakshetra)'
  return null
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
    const cacheKey = `${mdLord}|${adLord}|${chartFingerprint(chart)}`
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