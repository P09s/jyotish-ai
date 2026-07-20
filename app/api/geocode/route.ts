import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const place = searchParams.get('place')

  if (!place) return NextResponse.json({ error: 'place is required' }, { status: 400 })

  try {
    // Nominatim — free, no key needed
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'JyotishAI/1.0' } }
    )
    const data = await res.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const { lat, lon, display_name } = data[0]

    // Get timezone from lat/lng using timeapi.io (free, no key)
    const tzRes = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`
    )
    const tzData = await tzRes.json()
    const timezone = tzData.timeZone || 'Asia/Kolkata'

    return NextResponse.json({
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      timezone,
      display_name
    })
  } catch (err) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}