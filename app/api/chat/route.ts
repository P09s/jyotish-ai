import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL_CHAT } from '@/app/lib/groq/client'
import { CLASSICAL_PLANETS, getOwnedHouses, getFunctionalNature, REMEDIES } from '@/app/lib/jyotish/remedies'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

const CHAT_RATE_LIMIT = 20        // requests
const CHAT_RATE_WINDOW_MS = 5 * 60 * 1000  // per 5 minutes
const MAX_MESSAGES = 40
const MAX_MESSAGE_CHARS = 16000
const MAX_TOTAL_CHARS = 80000

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed, retryAfterMs } = await checkRateLimit(`chat:${user.id}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment before sending another message.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array required' },
        { status: 400 }
      )
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Too many messages in one request (max ${MAX_MESSAGES}).` },
        { status: 400 }
      )
    }

    // Client only ever sends its own turns — 'system' (or anything else) here
    // would let a caller inject a fake system-role message straight into the
    // Groq call, overriding buildSystemPrompt's instructions. Reject instead
    // of trusting the client-supplied role.
    if (messages.some((m: any) => (m?.role !== 'user' && m?.role !== 'assistant') || typeof m?.content !== 'string')) {
      return NextResponse.json(
        { error: 'Each message must have role "user" or "assistant" and string content.' },
        { status: 400 }
      )
    }

    const totalChars = messages.reduce((sum: number, m: any) => sum + (typeof m?.content === 'string' ? m.content.length : 0), 0)
    if (totalChars > MAX_TOTAL_CHARS || messages.some((m: any) => typeof m?.content === 'string' && m.content.length > MAX_MESSAGE_CHARS)) {
      return NextResponse.json(
        { error: 'Message too long.' },
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
        model: GROQ_MODEL_CHAT,
        // gpt-oss-120b is a reasoning model — reasoning tokens are generated
        // before the visible answer and count against this budget. Keeping
        // reasoning_effort low (this is conversational Q&A, not a multi-step
        // logic puzzle) and giving a generous token budget avoids the answer
        // getting cut off mid-generation once reasoning eats into the cap.
        max_completion_tokens: 2048,
        reasoning_effort: 'low',
        temperature: 0.7,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role,
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

// Same formula as app/api/numerology/route.ts — computed here too so the chat
// AI states the real Mulank/Bhagyank instead of trying to derive it itself
// (LLMs are unreliable at multi-step arithmetic and will hallucinate the math).
function digitalRoot(n: number): number {
  while (n > 9) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d, 10), 0)
  }
  return n
}

function buildSystemPrompt(profile: any, chart: any): string {
  const lines: string[] = []

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const currentYear = new Date().getFullYear()

  lines.push(
    `Today's actual date is ${todayStr}. This is not a guess and not your training cutoff — it is live, current, and authoritative. Use it for every date/year reference in your answer.`
  )
  lines.push(
    `If the seeker asks about "this year", "currently", "right now", or any career/life-area outlook without naming a year, that means ${currentYear} — not 2024, not 2025, not any other year you might otherwise default to. Never title or reference an outlook with a year other than ${currentYear} unless the seeker explicitly named a different year.`
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
    `Give a substantive, specific answer grounded in the actual chart facts below (exact planets, houses, dignities, dasha timing) — not generic Jyotish platitudes that could apply to anyone. If a claim isn't tied to a specific fact from this person's chart, cut it.`
  )

  lines.push(
    `Use whatever length and structure genuinely fits the question — a few tight sentences for a simple question, a longer explanation with a short list for a multi-part one. Don't pad a simple answer to hit a paragraph count, and don't compress a genuinely layered answer into a shallow 2-3 point summary just to keep it short.`
  )

  lines.push(
    `Never end with a vague invitation like "let me know if you'd like to explore this further" or "feel free to ask if you want more details" — that's a filler hook, not real content. If there's a genuinely useful next question the seeker would naturally have, ask it specifically (referencing what it would cover) or just don't end with a question at all.`
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
      .map(p => ({ planet: p, nature: getFunctionalNature(p, lagnaSignIdx), houses: getOwnedHouses(p, lagnaSignIdx) }))
      .filter(r => r.nature === 'yogakaraka' || r.nature === 'benefic')
      .map(r => ({ ...r, remedy: REMEDIES[r.planet] }))
      .filter(r => r.remedy)

    if (personalized.length > 0) {
      lines.push(
        `Personalized gemstone recommendation (based on which houses each planet RULES for this Lagna — the correct classical method, NOT simply the current dasha lord's planet). ` +
        `ONLY the 7 classical grahas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) rule houses — Rahu and Ketu are shadow planets and NEVER rule a house or appear in this list, so never attribute house lordship or a gemstone to them. ` +
        `Here is the exact, complete reasoning — use ONLY these facts if asked "why", do not invent alternate house-lord chains or connections beyond what's stated here:`
      )
      personalized.forEach(r => {
        lines.push(
          `— ${r.planet} rules house(s) ${r.houses.join(', ')} for this Lagna, making it a ${r.nature === 'yogakaraka' ? 'Yogakaraka (rules a Kendra AND a Trikona, or is the Lagna lord itself — the strongest possible benefic)' : 'functional benefic (rules a Trikona house — 5th or 9th)'}. Its gemstone is ${r.remedy.gemstone} (${r.remedy.gemstoneSanskrit}, substitute: ${r.remedy.substitute}, colour: ${r.remedy.color}).`
        )
      })
      lines.push(
        `If asked "what is my gemstone" give these stones; if asked "why", explain using only the house numbers and Yogakaraka/benefic reasoning stated above for that specific planet — never substitute a different planet's gemstone for the reasoning given.`
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