'use client'
import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { MotionDiv } from '@/app/components/motion-wrapper'

type Profile = {
  full_name: string | null
  date_of_birth: string | null
  time_of_birth: string | null
  place_of_birth: string | null
  gender: string | null
  timezone: string | null
}

// Helper function to safely parse AM/PM time strings into 24h HTML format
function formatTimeForInput(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  
  // If it's already in a valid 24h format (HH:mm or HH:mm:ss), return just HH:mm
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    return timeStr.substring(0, 5);
  }

  // Handle formats like "4:00 AM" or "4:00 PM"
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let [_, hours, minutes, modifier] = match;
    let hrs = parseInt(hours, 10);
    
    if (modifier.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
    if (modifier.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
    
    return `${hrs.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return timeStr;
}

export default function ProfileForm({ profile, userId }: { profile: Profile | null, userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [dob, setDob] = useState(profile?.date_of_birth || '')
  // Apply the helper function here
  const [tob, setTob] = useState(formatTimeForInput(profile?.time_of_birth))
  const [pob, setPob] = useState(profile?.place_of_birth || '')
  const [gender, setGender] = useState(profile?.gender || '')

  async function geocodePlace(place: string) {
    const res = await fetch(`/api/geocode?place=${encodeURIComponent(place)}`)
    if (!res.ok) return null
    return res.json() as Promise<{ lat: number; lng: number; timezone: string; display_name: string }>
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false); setStatus('')

    try {
      // Step 1 — Save profile
      setStatus('Saving profile...')
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        date_of_birth: dob,
        time_of_birth: tob || null,
        place_of_birth: pob,
        gender: gender || null,
        profile_complete: !!(fullName && dob && pob),
        updated_at: new Date().toISOString()
      })
      if (profileError) throw profileError

      // Step 2 — Geocode + compute Kundali if birth details complete
      if (fullName && dob && pob) {
        setStatus('Locating birth place...')
        const geo = await geocodePlace(pob)

        if (geo) {
          // Save coordinates + timezone to profile
          await supabase.from('profiles').update({
            latitude: geo.lat,
            longitude: geo.lng,
            timezone: geo.timezone
          }).eq('id', userId)

          // Step 3 — Calculate Kundali
          setStatus('Computing your Kundali...')
          const kundaliRes = await fetch('/api/kundali', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date_of_birth: dob,
              time_of_birth: tob || null,
              latitude: geo.lat,
              longitude: geo.lng,
              timezone: geo.timezone
            })
          })

          if (!kundaliRes.ok) {
            const errData = await kundaliRes.json()
            throw new Error(errData.error || 'Kundali calculation failed')
          }
        } else {
          // Geocoding failed — still save profile, just warn
          setError('Birth place could not be located. Try a more specific city name. Profile saved without chart.')
        }
      }

      setSaved(true)
      setStatus('')
      router.refresh()
      setTimeout(() => setSaved(false), 4000)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave}>
      {error && (
        <MotionDiv
        initial={{ x: -6 }}
        animate={{ x: [6, -4, 3, -2, 0] }}
        transition={{ duration: 0.32 }}
        >
          <div className="banner-error" style={{ marginBottom: 20 }}>{error}</div>
        </MotionDiv>
      )}

      {saved && !error && (
        <MotionDiv
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.22,
        }}
        >
          <div style={{
            padding: '12px 16px', marginBottom: 20, borderRadius: 10,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#86efac', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Check size={14} strokeWidth={2} />
            Profile saved & Kundali computed successfully
          </div>
        </MotionDiv>
      )}

      {/* Loading status pill */}
      {loading && status && (
        <div style={{
          padding: '10px 16px', marginBottom: 20, borderRadius: 10,
          background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
          color: 'var(--orange)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          {status}
        </div>
      )}

      {/* Personal section */}
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="card" style={{ padding: '24px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            Personal
          </p>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label">Full name</label>
            <input
              type="text" className="input-field" placeholder="As per birth records"
              style={{
                transition:
                  'border-color 0.2s ease, transform 0.2s ease',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
              onFocus={e => {
                e.target.style.transform = 'translateY(-1px)'
              }}
              onBlur={e => {
                e.target.style.transform = 'translateY(0)'
              }}
              value={fullName} onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">
              Gender <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <select
              className="input-field" value={gender}
              onChange={e => setGender(e.target.value)} style={{
                appearance: 'none',
                transition:
                  'border-color 0.2s ease, transform 0.2s ease',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
              onFocus={e => {
                e.target.style.transform = 'translateY(-1px)'
              }}
              onBlur={e => {
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </MotionDiv>

      {/* Birth details section */}
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.08,
          duration: 0.28,
        }}
      >
        <div className="card" style={{ padding: '24px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            Birth Details
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label className="field-label">Date of birth</label>
              <input
                type="date" className="input-field" 
                style={{
                  transition:
                    'border-color 0.2s ease, transform 0.2s ease',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                }}
                onFocus={e => {
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onBlur={e => {
                  e.target.style.transform = 'translateY(0)'
                }}
                value={dob} onChange={e => setDob(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">
                Time <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                type="time" className="input-field"
                style={{
                  transition:
                    'border-color 0.2s ease, transform 0.2s ease',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                }}
                onFocus={e => {
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onBlur={e => {
                  e.target.style.transform = 'translateY(0)'
                }}
                value={tob} onChange={e => setTob(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Place of birth</label>
            <input
              type="text" className="input-field"
              style={{
                transition:
                  'border-color 0.2s ease, transform 0.2s ease',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
              onFocus={e => {
                e.target.style.transform = 'translateY(-1px)'
              }}
              onBlur={e => {
                e.target.style.transform = 'translateY(0)'
              }}
              placeholder="City, State, Country e.g. Mumbai, Maharashtra, India"
              value={pob} onChange={e => setPob(e.target.value)}
            />
          </div>

          {/* Info note */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'var(--orange-glow)', border: '1px solid var(--orange-border)'
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
              ☉ Time of birth determines your Ascendant (Lagna). Even a 10-minute difference can change your rising sign. Your birth place is geocoded to precise coordinates for accurate calculations.
            </p>
          </div>
        </div>
      </MotionDiv>

      <MotionDiv
        whileHover={{
          y: -1,
        }}
        whileTap={{
          scale: 0.99,
        }}
      >
        <button
          type="submit" className="btn-primary" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              {status || 'Saving...'}
            </span>
          ) : saved ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Check size={15} strokeWidth={2} /> Saved
            </span>
          ) : (
            'Save & compute Kundali'
          )}
        </button>
      </MotionDiv>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}