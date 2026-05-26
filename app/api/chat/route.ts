import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch latest kundali chart
    const { data: chartRow } = await supabase
      .from('kundali_charts')
      .select('chart_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const chart = chartRow?.chart_data

    // Build rich system prompt
    const systemPrompt = buildSystemPrompt(profile, chart)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content
        }))
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Claude API error')
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'I could not generate a response. Please try again.'

    return NextResponse.json({ reply })

  } catch (err: unknown) {
    console.error('Chat API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    )
  }
}

// ── System prompt builder ────────────────────────────────
function buildSystemPrompt(profile: any, chart: any): string {
  const lines: string[] = []

  lines.push(`You are Jyotish AI — a warm, wise, and deeply knowledgeable Vedic astrologer.`)
  lines.push(`You are trained in classical Jyotish texts: Brihat Parashara Hora Shastra, Jataka Parijata, Phaladeepika, and Saravali.`)
  lines.push(`Your tone is calm, grounded, encouraging, and personal — like a trusted guide, not a fortune teller.`)
  lines.push(`Always use Sanskrit terms followed by their English meaning in brackets on first use. Keep responses to 3-4 paragraphs unless a detailed breakdown is asked for.`)
  lines.push(`Never be fatalistic. Jyotish shows tendencies and timing — free will always plays a role.`)
  lines.push(``)

  if (profile) {
    lines.push(`── USER PROFILE ──`)
    if (profile.full_name)     lines.push(`Name: ${profile.full_name}`)
    if (profile.date_of_birth) lines.push(`Date of birth: ${profile.date_of_birth}`)
    if (profile.time_of_birth) lines.push(`Time of birth: ${profile.time_of_birth}`)
    if (profile.place_of_birth) lines.push(`Place of birth: ${profile.place_of_birth}`)
    if (profile.gender)        lines.push(`Gender: ${profile.gender}`)
    if (profile.timezone)      lines.push(`Timezone: ${profile.timezone}`)
    lines.push(``)
  }

  if (chart) {
    lines.push(`── KUNDALI CHART DATA ──`)

    if (chart.lagna) {
      lines.push(`Lagna (Ascendant): ${chart.lagna.sign} (${chart.lagna.sign_sanskrit}) at ${chart.lagna.degree}°`)
    }

    if (chart.summary) {
      lines.push(`Moon sign (Rashi): ${chart.summary.moon_sign}`)
      lines.push(`Sun sign: ${chart.summary.sun_sign}`)
      lines.push(`Moon Nakshatra: ${chart.summary.moon_nakshatra}`)
      lines.push(`Current Mahadasha lord: ${chart.summary.current_dasha_lord}`)
      lines.push(`Current Mahadasha ends: ${chart.summary.current_dasha_ends}`)
    }

    if (chart.planets?.length) {
      lines.push(``)
      lines.push(`Planetary Positions:`)
      chart.planets.forEach((p: any) => {
        lines.push(`  ${p.symbol} ${p.name} (${p.sanskrit}): ${p.sign} (${p.sign_sanskrit}), House ${p.house}, ${p.degree}°${p.isRetrograde ? ' ℞' : ''}`)
      })
    }

    if (chart.houses?.length) {
      lines.push(``)
      lines.push(`House Signs (Whole Sign system):`)
      chart.houses.forEach((h: any) => {
        const planets = h.planets.length > 0 ? ` [${h.planets.join(', ')}]` : ''
        lines.push(`  House ${h.number}: ${h.sign} (${h.sign_sanskrit})${planets}`)
      })
    }

    if (chart.vimshottari_dasha?.length) {
      lines.push(``)
      lines.push(`Vimshottari Dasha Timeline:`)
      chart.vimshottari_dasha.slice(0, 5).forEach((d: any) => {
        const current = d.isCurrent ? ' ← CURRENT' : ''
        lines.push(`  ${d.lord} Mahadasha: ${d.start} → ${d.end} (${d.years} years)${current}`)
      })
    }

    if (chart.moon_nakshatra) {
      lines.push(``)
      lines.push(`Moon Nakshatra details:`)
      lines.push(`  Nakshatra: ${chart.moon_nakshatra.name}, Pada ${chart.moon_nakshatra.pada}, Lord: ${chart.moon_nakshatra.lord}`)
    }

    lines.push(``)
    lines.push(`Use this chart data to give specific, accurate, personalised answers. Reference house placements, planetary dignities, and dasha periods directly in your responses.`)

  } else {
    lines.push(`The user has not yet completed their birth details or computed their Kundali.`)
    lines.push(`Gently encourage them to go to their Profile page and save their birth details to unlock personalised readings.`)
    lines.push(`You can still answer general Jyotish questions warmly.`)
  }

  return lines.join('\n')
}