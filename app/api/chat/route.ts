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
    `You are Jyotish AI — a warm, wise, and deeply knowledgeable Vedic astrologer.`
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

  lines.push(``)

  // ── PROFILE ─────────────────────────────────────────────────────
  if (profile) {
    lines.push(`── SEEKER PROFILE ──`)

    if (profile.full_name) {
      lines.push(`Name: ${profile.full_name}`)
    }

    if (profile.date_of_birth) {
      lines.push(`Date of birth: ${profile.date_of_birth}`)
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
  }

  // Moon Nakshatra detail
  if (chart.moon_nakshatra) {
    const n = chart.moon_nakshatra

    lines.push(
      `Moon Nakshatra detail: ${n.name}, Pada ${n.pada}, Nakshatra lord: ${n.lord}`
    )
  }

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