import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import { getCached, setCached } from '@/app/lib/cache/route-cache'

// ── Navagraha number-planet mapping (Ank Jyotish) ──────────────────────────────
// Standard Vedic numerology: each digit 1-9 is ruled by one of the nine Grahas.
const PLANET_INFO: Record<number, {
  planet: string; sanskrit: string; color: string; day: string; traits: string
}> = {
  1: { planet: 'Sun',     sanskrit: 'Surya',   color: 'Orange & Gold',     day: 'Sunday',    traits: 'Leadership, confidence, independence and a natural drive to lead.' },
  2: { planet: 'Moon',    sanskrit: 'Chandra', color: 'White & Cream',     day: 'Monday',    traits: 'Intuition, sensitivity, cooperation and emotional depth.' },
  3: { planet: 'Jupiter', sanskrit: 'Guru',    color: 'Yellow',            day: 'Thursday',  traits: 'Wisdom, optimism, knowledge-seeking and steady growth.' },
  4: { planet: 'Rahu',    sanskrit: 'Rahu',    color: 'Smoky Blue & Grey', day: 'Saturday',  traits: 'Unconventional thinking, ambition and restless drive to break norms.' },
  5: { planet: 'Mercury', sanskrit: 'Budha',   color: 'Green',             day: 'Wednesday', traits: 'Communication, adaptability and a quick, versatile intellect.' },
  6: { planet: 'Venus',   sanskrit: 'Shukra',  color: 'Pink & White',      day: 'Friday',    traits: 'Harmony, artistry, love and an appreciation for comfort.' },
  7: { planet: 'Ketu',    sanskrit: 'Ketu',    color: 'Grey & Multicolor', day: 'Tuesday',   traits: 'Spirituality, introspection and a pull toward the unseen.' },
  8: { planet: 'Saturn',  sanskrit: 'Shani',   color: 'Dark Blue & Black', day: 'Saturday',  traits: 'Discipline, patience, hard work and karmic lessons learned slowly.' },
  9: { planet: 'Mars',    sanskrit: 'Mangal',  color: 'Red',               day: 'Tuesday',   traits: 'Courage, energy, determination and decisive action.' },
}

// ── Digital root (reduce to single digit 1-9) ──────────────────────────────────
function digitalRoot(n: number): number {
  while (n > 9) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d, 10), 0)
  }
  return n
}

// Mulank (Root/Birth Number) — from the day of birth alone
function calcMulank(day: number): number {
  return digitalRoot(day)
}

// Bhagyank (Destiny Number) — from all digits of the full DOB (DD+MM+YYYY)
function calcBhagyank(day: number, month: number, year: number): number {
  const sum = `${day}${month}${year}`.split('').reduce((s, d) => s + parseInt(d, 10), 0)
  return digitalRoot(sum)
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('date_of_birth, full_name').eq('id', user.id).single()

    if (!profile?.date_of_birth) {
      return NextResponse.json({ error: 'Please add your date of birth in Profile first.' }, { status: 400 })
    }

    const [year, month, day] = profile.date_of_birth.split('-').map((s: string) => parseInt(s, 10))
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Invalid date of birth on profile.' }, { status: 400 })
    }

    const mulank   = calcMulank(day)
    const bhagyank = calcBhagyank(day, month, year)
    const mulankInfo   = PLANET_INFO[mulank]
    const bhagyankInfo = PLANET_INFO[bhagyank]

    // Numerology never changes unless the DOB itself changes, so the cache key
    // is just the DOB string — a fresh Groq call only fires if it's different.
    const cacheKey = profile.date_of_birth
    const cached = await getCached(supabase, user.id, 'numerology', cacheKey)
    if (cached) return NextResponse.json({ success: true, numerology: cached })

    // ── Groq AI narrative ────────────────────────────────────────
    const systemPrompt = `You are Daivam — a warm, wise Vedic numerologist (Ank Jyotish specialist).
Keep your response to exactly 2 short paragraphs, under 130 words total:
1. What Mulank ${mulank} (ruled by ${mulankInfo.planet}) and Bhagyank ${bhagyank} (ruled by ${bhagyankInfo.planet}) together reveal about this person's personality and life path.
2. One practical piece of guidance — a favorable day, colour, or area of focus drawn from these numbers.
Use Sanskrit terms with English in brackets. Be warm and encouraging, never fatalistic.`

    const userMsg = `Name: ${profile.full_name || 'Seeker'}
Mulank (Root Number): ${mulank} — ${mulankInfo.planet} (${mulankInfo.sanskrit})
Bhagyank (Destiny Number): ${bhagyank} — ${bhagyankInfo.planet} (${bhagyankInfo.sanskrit})
Provide a personalised numerology reading.`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    })

    const narrative = completion.choices[0]?.message?.content ?? ''

    const numerology = {
      mulank:   { number: mulank,   ...mulankInfo },
      bhagyank: { number: bhagyank, ...bhagyankInfo },
      narrative,
    }
    await setCached(supabase, user.id, 'numerology', cacheKey, numerology)

    return NextResponse.json({ success: true, numerology })
  } catch (err: unknown) {
    console.error('Numerology error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Numerology calculation failed' }, { status: 500 })
  }
}