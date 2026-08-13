import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import Groq from 'groq-sdk'
import { createChatCompletionWithFallback } from '@/app/lib/groq/client'
import { CLASSICAL_PLANETS, getOwnedHouses, getFunctionalNature, REMEDIES } from '@/app/lib/jyotish/remedies'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

const CHAT_RATE_LIMIT = 20        // requests
const CHAT_RATE_WINDOW_MS = 5 * 60 * 1000  // per 5 minutes
// The client always sends the FULL accumulated conversation (see
// ChatInterface.tsx), not just recent turns, so a long-but-completely-normal
// session can genuinely reach dozens of messages. MAX_MESSAGES only needs to
// guard against a pathological/scripted payload now — buildChatBudget below
// already safely trims however much history actually gets forwarded to Groq,
// regardless of how many messages exist, so this doesn't need to be tight.
const MAX_MESSAGES = 300
const MAX_MESSAGE_CHARS = 16000
const MAX_TOTAL_CHARS = 300000

// ── What actually gets forwarded to Groq (separate from the request-size
// sanity caps above, which just bound what a client is allowed to send) ────
//
// A message-COUNT cap (the original "last 10 messages" version of this) is
// not enough on its own: Groq's free tier enforces 8,000 tokens/minute per
// model, and — confirmed against real request logs — it counts
// input_tokens + max_completion_tokens (the full reserved completion budget,
// not just what's actually generated) against that ceiling on every single
// request. With verbose readings, even 4-5 exchanges' worth of "last 10
// messages" plus the chart-grounding system prompt was enough to blow past
// 8,000 on one request — which a retry/fallback can't fix, since ALL THREE
// models in GROQ_CHAT_MODEL_CHAIN share that identical 8K/min ceiling. The
// only real fix is guaranteeing the request itself can't get that big.
//
// A flat, low max_completion_tokens (the first attempt at this — 1024) fixes
// that but creates a worse problem: this system prompt deliberately asks for
// long, multi-section, structured answers, and 1024 tokens routinely wasn't
// enough — real requests came back with output stopped exactly at 1024,
// mid-sentence, with unclosed markdown. A visibly broken answer is worse
// than an occasional retry delay.
//
// So instead of a flat completion cap, the budget is adaptive: reserve room
// for the FULL desired completion length while trimming history, then only
// shrink the actual completion budget below that if the system prompt +
// kept history genuinely leaves no room — which should only happen in the
// rare case where even the single latest message (always kept, see
// trimHistoryToTokenBudget below) is unusually large on its own.
//
// ~3.5 chars/token (a bit more conservative than the common ~4 rule of
// thumb) plus TPM_SAFETY_MARGIN below both build in slack for this being an
// estimate, not an exact token count — real usage came in higher than a /4
// estimate predicted.
const approxTokens = (s: string) => Math.ceil(s.length / 3.5)

const GROQ_TPM_LIMIT = 8000              // Groq free-tier ceiling, identical across every model in the chain
const TPM_SAFETY_MARGIN = 800            // slack for token-estimate imprecision
const DESIRED_MAX_COMPLETION_TOKENS = 2048
const MIN_COMPLETION_TOKENS = 512        // below this, a "complete" answer isn't really complete either — see chatBudget

// Keeps the most recent messages that fit within tokenBudget (working
// backwards from the latest), always including at least the single most
// recent message even if it alone doesn't fit — dropping the user's actual
// question isn't an acceptable way to stay under budget.
function trimHistoryToTokenBudget(
  messages: { role: 'user' | 'assistant'; content: string }[],
  tokenBudget: number
): { role: 'user' | 'assistant'; content: string }[] {
  const kept: typeof messages = []
  let remaining = tokenBudget

  for (let i = messages.length - 1; i >= 0; i--) {
    const t = approxTokens(messages[i].content)
    if (kept.length > 0 && t > remaining) break
    remaining -= t
    kept.unshift(messages[i])
  }

  return kept
}

// Trims history to fit alongside the system prompt AND a full-length
// completion, then hands back however much completion budget is actually
// left over (normally the full DESIRED_MAX_COMPLETION_TOKENS — only reduced
// below that if the single latest message alone pushed input past what
// trimming can fix).
function buildChatBudget(systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const systemTokens = approxTokens(systemPrompt)
  const ceiling = GROQ_TPM_LIMIT - TPM_SAFETY_MARGIN

  const historyBudget = Math.max(0, ceiling - systemTokens - DESIRED_MAX_COMPLETION_TOKENS)
  const recentMessages = trimHistoryToTokenBudget(messages, historyBudget)

  const inputTokens = systemTokens + recentMessages.reduce((sum, m) => sum + approxTokens(m.content), 0)
  const maxCompletionTokens = Math.max(MIN_COMPLETION_TOKENS, Math.min(DESIRED_MAX_COMPLETION_TOKENS, ceiling - inputTokens))

  return { recentMessages, maxCompletionTokens }
}

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
        { error: `This conversation has gotten very long (max ${MAX_MESSAGES} messages). Please start a new conversation.` },
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
    const { recentMessages, maxCompletionTokens } = buildChatBudget(systemPrompt, messages)

    // ── Start Groq stream (with per-model rate-limit fallback) ──────
    let groqStream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>
    let modelUsed: string
    let usedFallback: boolean

    try {
      ;({ stream: groqStream, modelUsed, usedFallback } = await createChatCompletionWithFallback({
        maxCompletionTokens,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...recentMessages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }))
    } catch (err: unknown) {
      // Groq returns this as a 429 when a model's daily/minute budget is
      // genuinely exhausted, but as a 413 ("Request too large") when a
      // single request's own size (input + reserved completion tokens)
      // exceeds the TPM ceiling outright — a *different* HTTP status for
      // effectively the same underlying limit, so RateLimitError alone
      // (429-only) doesn't catch the 413 case. Checking the body's error
      // code catches both uniformly.
      const isRateLimitLike = err instanceof Groq.APIError && (err.error as { code?: string } | undefined)?.code === 'rate_limit_exceeded'

      if (isRateLimitLike) {
        // A 413 means the request itself is too big for any model in the
        // chain to accept (they all share the same 8K/min ceiling — a
        // fallback model can't rescue an oversized single request), so
        // retrying later won't help; the user needs a shorter conversation.
        const requestTooLarge = err.status === 413
        return NextResponse.json(
          {
            error: requestTooLarge
              ? 'This conversation has gotten too long to process in one go. Please start a new conversation.'
              : 'Daily free limit reached across all available models. Please try again tomorrow.',
          },
          { status: requestTooLarge ? 413 : 429 }
        )
      }

      // Never forward a raw provider error (which can include internal
      // details like org IDs) to the client — log it server-side and
      // return a generic message instead.
      console.error('Chat API error (Groq call):', err)
      return NextResponse.json({ error: 'Chat failed, please try again.' }, { status: 500 })
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
        // Lets the client show a subtle "answered by a backup model" note
        // instead of a silent voice/style shift when the primary model's
        // budget is exhausted for the day.
        'X-Answered-By': usedFallback ? 'fallback' : 'primary',
        'X-Model-Used': modelUsed,
      },
    })
  } catch (err: unknown) {
    console.error('Chat API error:', err)

    // Generic fallback only — provider/internal error text is never sent to
    // the client (see the inner catch above for the specific Groq cases).
    return NextResponse.json({ error: 'Chat failed, please try again.' }, { status: 500 })
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