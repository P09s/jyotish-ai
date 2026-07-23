import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

// Short in-memory cache for autocomplete suggestions. Nominatim's usage policy
// prohibits unthrottled autocomplete/typeahead use without caching — this,
// combined with the client-side debounce + 3-char minimum, keeps repeat
// keystrokes (and repeat visits searching the same city) from re-hitting
// Nominatim every time.
const suggestCache = new Map<string, { data: unknown; expires: number }>()
const SUGGEST_CACHE_TTL_MS = 10 * 60 * 1000

async function resolveTimezone(lat: number, lng: number): Promise<string> {
  try {
    const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`)
    const tzData = await tzRes.json()
    return tzData.timeZone || 'Asia/Kolkata'
  } catch {
    return 'Asia/Kolkata'
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const place = searchParams.get('place')
  const suggest = searchParams.get('suggest') === '1'
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  // Only the lightweight "suggest" mode (no timezone lookup) is allowed
  // pre-auth — it's used during signup's birth-details step, before an
  // account (and therefore a session) exists yet. Rate-limited by IP since
  // there's no user id to key on at that point.
  if (!user && !suggest) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimitKey = user
    ? `geocode:${user.id}`
    : `geocode-anon:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`
  const { allowed } = checkRateLimit(rateLimitKey, 30, 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    // Mode: user already picked a suggestion — resolve its timezone directly,
    // skipping a fresh (and possibly different) Nominatim text search.
    if (lat && lng) {
      const timezone = await resolveTimezone(parseFloat(lat), parseFloat(lng))
      return NextResponse.json({ lat: parseFloat(lat), lng: parseFloat(lng), timezone, display_name: place || '' })
    }

    if (!place || place.trim().length < 3) {
      return suggest
        ? NextResponse.json({ suggestions: [] })
        : NextResponse.json({ error: 'place is required (min 3 characters)' }, { status: 400 })
    }

    // Mode: lightweight autocomplete suggestions — no timezone lookup, so it
    // stays fast enough to call while the user is still typing.
    if (suggest) {
      const cacheKey = place.trim().toLowerCase()
      const cached = suggestCache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        return NextResponse.json({ suggestions: cached.data })
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=5`,
        { headers: { 'User-Agent': 'JyotishAI/1.0' } }
      )
      const data = await res.json()
      const suggestions = (data || []).map((d: any) => ({
        display_name: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }))

      suggestCache.set(cacheKey, { data: suggestions, expires: Date.now() + SUGGEST_CACHE_TTL_MS })
      return NextResponse.json({ suggestions })
    }

    // Original mode: resolve a single best match + timezone in one call.
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'JyotishAI/1.0' } }
    )
    const data = await res.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const { lat: rlat, lon: rlon, display_name } = data[0]
    const timezone = await resolveTimezone(parseFloat(rlat), parseFloat(rlon))

    return NextResponse.json({
      lat: parseFloat(rlat),
      lng: parseFloat(rlon),
      timezone,
      display_name
    })
  } catch (err) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}