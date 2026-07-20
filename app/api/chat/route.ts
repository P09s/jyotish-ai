import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array required' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: chartRow } = await supabase
      .from('kundali_charts')
      .select('chart_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const chart = chartRow?.chart_data ?? null

    const systemPrompt = buildSystemPrompt(profile, chart)

    // ── Start Groq stream ──────────────────────────────────────────
    let groqStream

    try {
      groqStream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('rate_limit')) {
        return NextResponse.json(
          {
            error:
              'Daily free limit reached. Please try again tomorrow.',
          },
          { status: 429 }
        )
      }

      throw err
    }

    // ── Pipe Groq async iterable → Web ReadableStream ──────────────
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const text = chunk.choices[0]?.delta?.content ?? ''

            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: unknown) {
    console.error('Chat API error:', err)

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Chat failed',
      },
      { status: 500 }
    )
  }
}

// ── System prompt — uses exact field names from your kundali_charts table ────
// Same classical remedy table as app/api/dasha-fal/route.ts — duplicated here
// so the chat AI states the real gemstone/colour/mantra/charity instead of
// inventing one (as seen: it once hallucinated "Shankhpushpi", an Ayurvedic
// herb, as a gemstone for Venus).
const REMEDIES: Record<string, {
  gemstone: string; gemstoneSanskrit: string; substitute: string
  color: string; day: string; mantra: string; charity: string
}> = {
  Sun:     { gemstone: 'Ruby',            gemstoneSanskrit: 'Manikya',            substitute: 'Red Garnet or Red Spinel', color: 'Red, Orange, Copper',     day: 'Sunday',    mantra: 'Om Suryaya Namaha',      charity: 'Wheat, jaggery, or copper items' },
  Moon:    { gemstone: 'Pearl',           gemstoneSanskrit: 'Moti',               substitute: 'Moonstone',                color: 'White, Cream, Silver',     day: 'Monday',    mantra: 'Om Chandraya Namaha',    charity: 'Rice, milk, or white clothes' },
  Mars:    { gemstone: 'Red Coral',       gemstoneSanskrit: 'Moonga',             substitute: 'Carnelian',                color: 'Red',                      day: 'Tuesday',   mantra: 'Om Angarakaya Namaha',   charity: 'Red lentils (masoor dal) or jaggery' },
  Mercury: { gemstone: 'Emerald',         gemstoneSanskrit: 'Panna',              substitute: 'Peridot or Green Onyx',    color: 'Green',                    day: 'Wednesday', mantra: 'Om Budhaya Namaha',      charity: 'Green moong dal or green clothes' },
  Jupiter: { gemstone: 'Yellow Sapphire', gemstoneSanskrit: 'Pukhraj',            substitute: 'Yellow Topaz or Citrine',  color: 'Yellow, Gold',             day: 'Thursday',  mantra: 'Om Brihaspataye Namaha', charity: 'Turmeric, chana dal, or yellow items' },
  Venus:   { gemstone: 'Diamond',         gemstoneSanskrit: 'Heera',              substitute: 'White Sapphire or Zircon', color: 'White, Pastel Pink',      day: 'Friday',    mantra: 'Om Shukraya Namaha',     charity: 'Rice, sugar, or white/pastel clothes' },
  Saturn:  { gemstone: 'Blue Sapphire',   gemstoneSanskrit: 'Neelam',             substitute: 'Amethyst',                 color: 'Dark Blue, Black',        day: 'Saturday',  mantra: 'Om Shanicharaya Namaha', charity: 'Black sesame, mustard oil, or iron items' },
  Rahu:    { gemstone: 'Hessonite',       gemstoneSanskrit: 'Gomed',              substitute: 'Orange Zircon',            color: 'Smoky, Multicolor',       day: 'Saturday',  mantra: 'Om Rahave Namaha',       charity: 'Mustard seeds or blankets' },
  Ketu:    { gemstone: "Cat's Eye",       gemstoneSanskrit: 'Vaidurya / Lehsunia', substitute: 'Tiger Eye',               color: 'Grey, Brown, Multicolor', day: 'Tuesday',   mantra: 'Om Ketave Namaha',       charity: 'Sesame seeds or blankets' },
}

// Same formula as app/api/numerology/route.ts — computed here too so the chat
// AI states the real Mulank/Bhagyank instead of trying to derive it itself
// (LLMs are unreliable at multi-step arithmetic and will hallucinate the math).
function digitalRoot(n: number): number {
  while (n > 9) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d, 10), 0)
  }
  return n
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}
const KENDRA = [1,4,7,10]
const TRIKONA = [1,5,9]
const DUSTHANA = [6,8,12]
const CLASSICAL_PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

function getHouseLord(houseNum: number, lagnaSignIdx: number): string {
  const signIdx = (lagnaSignIdx + houseNum - 1) % 12
  return SIGN_LORD[SIGNS[signIdx]]
}
function getOwnedHouses(planetName: string, lagnaSignIdx: number): number[] {
  const owned: number[] = []
  for (let h = 1; h <= 12; h++) if (getHouseLord(h, lagnaSignIdx) === planetName) owned.push(h)
  return owned
}
// Yogakaraka concept (BPHS) — a planet's real gemstone suitability depends on
// which houses it RULES for this specific Lagna, not on which dasha is running.
function getFunctionalNature(planetName: string, lagnaSignIdx: number): 'yogakaraka' | 'benefic' | 'neutral' | 'malefic' {
  const owned = getOwnedHouses(planetName, lagnaSignIdx)
  if (owned.length === 0) return 'neutral'
  const rulesLagna   = owned.includes(1)
  const rulesKendra  = owned.some(h => KENDRA.includes(h))
  const rulesTrikona = owned.some(h => TRIKONA.includes(h))
  const onlyDusthana = owned.every(h => DUSTHANA.includes(h))
  if (rulesLagna) return 'yogakaraka'
  if (rulesKendra && rulesTrikona) return 'yogakaraka'
  if (rulesTrikona) return 'benefic'
  if (onlyDusthana) return 'malefic'
  return 'neutral'
}

function buildSystemPrompt(profile: any, chart: any): string {
  const lines: string[] = []

  lines.push(
    `Today's date is ${new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}. Always use this as the current date in your answers.`
  )

  lines.push(
    `You are Daivam — a warm, wise, and deeply knowledgeable Vedic astrologer.`
  )

  lines.push(
    `You are trained in classical Jyotish texts: Brihat Parashara Hora Shastra, Jataka Parijata, Phaladeepika, and Saravali.`
  )

  lines.push(
    `Your tone is calm, grounded, encouraging, and personal — like a trusted guide, not a fortune teller.`
  )

  lines.push(
    `Always use Sanskrit terms followed by their English meaning in brackets on first use.`
  )

  lines.push(
    `Keep responses to 3-4 paragraphs unless a detailed breakdown is explicitly asked for.`
  )

  lines.push(
    `Never be fatalistic. Jyotish shows tendencies and timing — free will always plays a role.`
  )

  lines.push(
    `Never invent specific facts (gemstones, remedies, numbers, dates, house placements) that aren't explicitly given to you in this context below. If asked something this context doesn't cover, say so honestly rather than guessing or calculating it yourself — you are unreliable at multi-step arithmetic and classical lookups, so always defer to the data provided here.`
  )

  lines.push(``)

  // ── PROFILE ─────────────────────────────────────────────────────
  if (profile) {
    lines.push(`── SEEKER PROFILE ──`)

    if (profile.full_name) {
      lines.push(`Name: ${profile.full_name}`)
    }

    if (profile.date_of_birth) {
      lines.push(`Date of birth: ${profile.date_of_birth}`)

      const [y, m, d] = profile.date_of_birth.split('-').map((s: string) => parseInt(s, 10))
      if (y && m && d) {
        const mulank   = digitalRoot(d)
        const bhagyank = digitalRoot(`${d}${m}${y}`.split('').reduce((s, c) => s + parseInt(c, 10), 0))
        lines.push(
          `Mulank (Root Number, from day of birth only): ${mulank}. Bhagyank (Destiny Number, from full DOB): ${bhagyank}. ` +
          `State these exact numbers if asked — do not recalculate or re-derive them yourself, and do not show working for them.`
        )
      }
    }

    if (profile.time_of_birth) {
      lines.push(`Time of birth: ${profile.time_of_birth}`)
    }

    if (profile.place_of_birth) {
      lines.push(`Place of birth: ${profile.place_of_birth}`)
    }

    if (profile.gender) {
      lines.push(`Gender: ${profile.gender}`)
    }

    lines.push(``)
  }

  // ── NO CHART ────────────────────────────────────────────────────
  if (!chart) {
    lines.push(
      `The seeker has not yet completed their birth details or generated their Kundali.`
    )

    lines.push(
      `Gently encourage them to visit their Profile page to save birth details, then their Kundali page to generate the chart.`
    )

    lines.push(
      `You can still answer general Jyotish questions warmly.`
    )

    return lines.join('\n')
  }

  // ── CHART DATA ──────────────────────────────────────────────────
  lines.push(
    `── KUNDALI CHART DATA (Lahiri Ayanamsa, Whole Sign houses) ──`
  )

  // Lagna
  if (chart.lagna) {
    lines.push(
      `Lagna (Ascendant): ${chart.lagna.sign} (${chart.lagna.sign_sanskrit}) at ${Number(chart.lagna.degree).toFixed(2)}°`
    )
  }

  // Summary
  if (chart.summary) {
    lines.push(`Moon sign (Rashi): ${chart.summary.moon_sign}`)
    lines.push(`Sun sign: ${chart.summary.sun_sign}`)
    lines.push(`Moon Nakshatra: ${chart.summary.moon_nakshatra}`)
    lines.push(
      `Current Mahadasha lord: ${chart.summary.current_dasha_lord}`
    )
    lines.push(
      `Current Mahadasha ends: ${chart.summary.current_dasha_ends}`
    )

    const remedy = REMEDIES[chart.summary.current_dasha_lord]
    const lagnaSignIdx = chart.lagna?.sign_index ?? 0

    const personalized = CLASSICAL_PLANETS
      .map(p => ({ planet: p, nature: getFunctionalNature(p, lagnaSignIdx) }))
      .filter(r => r.nature === 'yogakaraka' || r.nature === 'benefic')
      .map(r => REMEDIES[r.planet])
      .filter(Boolean)

    if (personalized.length > 0) {
      lines.push(
        `Personalized gemstone recommendation (based on which houses each planet RULES for this Lagna — the correct classical method, NOT simply the current dasha lord's planet): ` +
        personalized.map(r => `${r.gemstone} (${r.gemstoneSanskrit}, substitute: ${r.substitute})`).join(' and ') + `. ` +
        `Favourable colours: ${personalized.map(r => r.color).join('; ')}. ` +
        `If asked "what is my gemstone" or similar, give THESE — never the generic gemstone of whichever planet's dasha happens to be running, unless that planet is also in this personalized list.`
      )
    }

    const mdNature = getFunctionalNature(chart.summary.current_dasha_lord, lagnaSignIdx)
    if (remedy) {
      lines.push(
        `Current Mahadasha lord ${chart.summary.current_dasha_lord}'s classical remedy (relevant mainly for THIS dasha period's timing, not as your primary gemstone unless it also appears in the personalized list above): ` +
        `Gemstone — ${remedy.gemstone} (${remedy.gemstoneSanskrit}). Mantra — "${remedy.mantra}". Charity (Daan) — ${remedy.charity}. Favourable day — ${remedy.day}.` +
        (mdNature === 'malefic' ? ` Note: this planet is a functional malefic for this Lagna — mention gemstone caution if asked, and favour mantra/charity remedies over wearing its gemstone.` : '') +
        ` Never invent a substance, herb, or gemstone not listed here or in the personalized recommendation above.`
      )
    }
  }

  // Moon Nakshatra detail
  if (chart.moon_nakshatra) {
    const n = chart.moon_nakshatra

    lines.push(
      `Moon Nakshatra detail: ${n.name}, Pada ${n.pada}, Nakshatra lord: ${n.lord}`
    )
  }

  // Yogini Dasha (secondary dasha system, alongside Vimshottari above)
  if (chart.current_yogini_dasha) {
    lines.push(
      `Current Yogini Dasha: ${chart.current_yogini_dasha.yogini} (ruled by ${chart.current_yogini_dasha.planet}), until ${chart.current_yogini_dasha.end}`
    )
  }

  lines.push(``)
  lines.push(
    `── OTHER FEATURES IN THIS APP ──`
  )
  lines.push(
    `If relevant to the seeker's question, you can point them to: Numerology (Mulank & Bhagyank), Bhavishya Fal (career/marriage/wealth/health predictions), Dasha Fal (current dasha reading with gemstone/mantra/charity remedies), and Shubh Ashubh (today's personal favorability). Only mention these if the seeker's question would genuinely benefit from that page — don't list them unprompted.`
  )
  lines.push(``)

  // Planets
  if (chart.planets?.length) {
    lines.push(``)
    lines.push(`Planetary Positions (sidereal, Lahiri):`)

    chart.planets.forEach((p: any) => {
      const retro = p.isRetrograde
        ? ' ℞ (retrograde)'
        : ''

      lines.push(
        `  ${p.symbol} ${p.name} (${p.sanskrit}): ` +
          `${p.sign} (${p.sign_sanskrit}), ` +
          `House ${p.house}, ` +
          `${Number(p.degree).toFixed(2)}° in sign` +
          retro
      )
    })
  }

  // Houses
  if (chart.houses?.length) {
    lines.push(``)
    lines.push(`House Cusps (Whole Sign):`)

    chart.houses.forEach((h: any) => {
      const occ =
        h.planets?.length > 0
          ? ` | Occupants: ${h.planets.join(', ')}`
          : ''

      lines.push(
        `  House ${h.number}: ${h.sign} (${h.sign_sanskrit})${occ}`
      )
    })
  }

  // ── DASHA TIMELINE ──────────────────────────────────────────────
  if (chart.vimshottari_dasha?.length) {
    lines.push(``)
    lines.push(`Vimshottari Dasha timeline:`)

    chart.vimshottari_dasha
      .slice(0, 5)
      .forEach((d: any) => {
        const cur = d.isCurrent ? ' ← CURRENT' : ''

        const rem =
          d.yearsRemaining != null
            ? ` (${d.yearsRemaining} yrs remaining)`
            : ''

        lines.push(
          `  ${d.lord} Mahadasha: ${d.start} → ${d.end} (${d.years} yrs)${rem}${cur}`
        )
      })

    // ── ADD: antardasha detail for current mahadasha ─────────────
    const currentMd = chart.vimshottari_dasha.find(
      (d: any) => d.isCurrent
    )

    if (currentMd?.antardashas?.length) {
      lines.push(``)
      lines.push(
        `Antardasha sub-periods within ${currentMd.lord} Mahadasha:`
      )

      currentMd.antardashas.forEach((ad: any) => {
        const cur = ad.isCurrent
          ? ' ← CURRENT NOW'
          : ''

        const past =
          new Date(ad.end) < new Date()
            ? ' (past)'
            : ''

        lines.push(
          `  ${currentMd.lord}/${ad.lord}: ${ad.start} → ${ad.end} ` +
            `(${ad.years} yrs)${past}${cur}`
        )
      })
    }
  }

  // ── CURRENT ANTARDASHA SUMMARY ─────────────────────────────────
  if (chart.summary?.current_antardasha_lord) {
    lines.push(``)

    lines.push(
      `The seeker is currently in ${chart.summary.current_dasha_lord}/${chart.summary.current_antardasha_lord} Antardasha, ` +
        `running until ${chart.summary.current_antardasha_ends}. ` +
        `Reference this sub-period specifically when discussing current timing and events.`
    )
  }

  // ── FINAL INSTRUCTIONS ─────────────────────────────────────────
  lines.push(``)

  lines.push(
    `Use this chart data to give specific, personalised Jyotish answers. ` +
      `Reference exact house placements, planetary dignities, nakshatra qualities, ` +
      `and the current dasha period directly in your responses. ` +
      `Be precise — name the planet, its sign, and its house when relevant.`
  )

  return lines.join('\n')
}