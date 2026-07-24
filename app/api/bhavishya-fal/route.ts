import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import { getCached, setCached, chartFingerprint } from '@/app/lib/cache/route-cache'

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

function getDignity(planetName: string, sign: string): string | null {
  if (EXALTATION[planetName] === sign) return 'Exalted'
  if (DEBILITATION[planetName] === sign) return 'Debilitated'
  if (OWN_SIGNS[planetName]?.includes(sign)) return 'Own sign (Swakshetra)'
  return null
}

// Builds context for a given house: its lord, where that lord currently sits
// (house + sign + dignity), and which planets occupy the house itself.
function houseContext(houseNum: number, chart: any, lagnaSignIdx: number) {
  const lord = getHouseLord(houseNum, lagnaSignIdx)
  const lordPlanet = chart.planets?.find((p: any) => p.name === lord)
  const occupants = (chart.planets ?? [])
    .filter((p: any) => p.house === houseNum)
    .map((p: any) => p.name)

  return {
    house: houseNum,
    lord,
    lordCurrentHouse: lordPlanet?.house ?? null,
    lordSign: lordPlanet?.sign ?? null,
    lordDignity: lordPlanet ? getDignity(lord, lordPlanet.sign) : null,
    occupants,
  }
}

function describeHouse(label: string, ctx: ReturnType<typeof houseContext>) {
  return `${label} (House ${ctx.house}): lord is ${ctx.lord}, currently in house ${ctx.lordCurrentHouse} (${ctx.lordSign})${ctx.lordDignity ? ` — ${ctx.lordDignity}` : ''}. Occupied by: ${ctx.occupants.length ? ctx.occupants.join(', ') : 'no planets'}.`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Same duplicate-row-safe pattern used in kundali/route.ts's GET and dasha-fal/route.ts
    const { data: chartRow, error: chartErr } = await supabase
      .from('kundali_charts')
      .select('chart_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (chartErr && chartErr.code !== 'PGRST116') {
      console.error('Bhavishya Fal chart fetch error:', chartErr)
    }
    const chart = chartRow?.chart_data
    if (!chart) {
      return NextResponse.json({ error: 'Please generate your Kundali first.' }, { status: 400 })
    }

    const lagnaSignIdx = chart.lagna?.sign_index ?? 0

    // Bhavishya Fal only changes if the chart itself is regenerated, so the
    // cache key is the chart row's created_at timestamp.
    const cacheKey = chartFingerprint(chart)
    const cached = await getCached(supabase, user.id, 'bhavishya-fal', cacheKey)
    if (cached) return NextResponse.json({ success: true, bhavishyaFal: cached })

    const areas = {
      career:   houseContext(10, chart, lagnaSignIdx),
      marriage: houseContext(7,  chart, lagnaSignIdx),
      wealth:   houseContext(2,  chart, lagnaSignIdx),
      health:   houseContext(6,  chart, lagnaSignIdx),
    }

    // ── Groq AI narrative — grounded in the four life-area house placements ──
    const systemPrompt = `You are Daivam — a warm, wise Vedic astrologer giving a Bhavishya Fal (future life reading).
Base your reading on classical Parashari principles: for each life area, results are shaped by the relevant house's lord — where that lord currently sits and its dignity — and which planets occupy the house itself.
Structure your response in exactly 4 short sections, one per life area, each 2-3 sentences, under 220 words total. Write in plain text only — no markdown, no asterisks, no headers, no bullet points. Start each section with its plain-text label followed by a colon, like this:
Career (Karma): ...
Marriage and Relationships (Kalatra): ...
Wealth (Artha): ...
Health (Arogya): ...
Separate each section with a blank line. Use Sanskrit terms with English in brackets elsewhere in the text. Be warm, specific to the placements given, and empowering — frame challenging placements as growth areas, never as doom. Do not give exact dates or guarantee outcomes. If the same planet rules two of these houses (which happens naturally for several ascendants), mention that connection naturally rather than treating it as a coincidence needing explanation.`

    const userMsg = `Lagna: ${chart.lagna?.sign}
Moon Sign: ${chart.summary?.moon_sign}
Current Mahadasha: ${chart.current_dasha?.lord ?? 'unavailable'}

${describeHouse('Career', areas.career)}
${describeHouse('Marriage & Relationships', areas.marriage)}
${describeHouse('Wealth', areas.wealth)}
${describeHouse('Health', areas.health)}

Provide a personalised Bhavishya Fal reading covering these four life areas.`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_completion_tokens: 1000,
      reasoning_effort: 'low',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    })

    const narrative = completion.choices[0]?.message?.content ?? ''

    const bhavishyaFal = { areas, narrative }
    if (narrative.trim().length > 40) {
      await setCached(supabase, user.id, 'bhavishya-fal', cacheKey, bhavishyaFal)
    }

    return NextResponse.json({ success: true, bhavishyaFal })
  } catch (err: unknown) {
    console.error('Bhavishya Fal error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bhavishya Fal calculation failed' }, { status: 500 })
  }
}