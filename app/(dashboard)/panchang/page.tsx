'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, Loader2, MapPin, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'

type Muhurta = { start: string; end: string } | null
type Panchang = {
  date: string; location: string; timezone: string
  vara:      { name: string; sanskrit: string; lord: string }
  tithi:     { index: number; name: string; paksha: string; number: number; pct: number }
  nakshatra: { index: number; name: string; lord: string; pada: number; pct: number }
  yoga:      { index: number; name: string; quality: 'auspicious' | 'inauspicious' | 'neutral' }
  karana:    { index: number; name: string }
  sunrise:   string | null; sunset: string | null
  muhurtas:  { brahma: Muhurta; abhijit: Muhurta; rahu: Muhurta; gulika: Muhurta }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null, tz: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: true
  }).toUpperCase()
}

function fmtDate(iso: string, tz: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz
  })
}

function isActive(m: Muhurta): boolean {
  if (!m) return false
  const now = Date.now()
  return now >= new Date(m.start).getTime() && now <= new Date(m.end).getTime()
}

function moonEmoji(tithiIndex: number): string {
  if (tithiIndex === 14) return '🌕'
  if (tithiIndex === 29) return '🌑'
  if (tithiIndex < 7)   return '🌒'
  if (tithiIndex === 7)  return '🌓'
  if (tithiIndex < 14)  return '🌔'
  if (tithiIndex < 22)  return '🌖'
  if (tithiIndex === 22) return '🌗'
  return '🌘'
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 3, background: 'var(--bg-surface2)', borderRadius: 2, marginTop: 10 }}>
      <div style={{
        height: '100%', borderRadius: 2,
        width: `${Math.min(100, pct * 100).toFixed(1)}%`,
        background: 'linear-gradient(90deg, rgba(249,115,22,0.5), rgba(249,115,22,0.9))',
        transition: 'width 0.4s ease'
      }} />
    </div>
  )
}

// ── Muhurta row ───────────────────────────────────────────────────────────────
function MuhurtaRow({
  label, sublabel, m, tz, isGood
}: { label: string; sublabel: string; m: Muhurta; tz: string; isGood: boolean }) {
  const active = isActive(m)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderRadius: 10,
      background: active
        ? (isGood ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.08)')
        : 'var(--bg-surface)',
      border: `1px solid ${active
        ? (isGood ? 'var(--orange-border)' : 'rgba(239,68,68,0.2)')
        : 'var(--border)'}`,
      transition: 'all 0.3s'
    }}>
      {/* Icon dot — Increased contrast backgrounds and mapped Lucide icons instead of emojis */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isGood ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isGood ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        {isGood 
          ? <Sparkles size={16} color="var(--orange)" /> 
          : <AlertTriangle size={16} color="#ef4444" />
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: active ? (isGood ? 'var(--orange)' : '#FCA5A5') : 'var(--text-primary)'
        }}>
          {label}
          {active && (
            <span style={{
              fontSize: 10, marginLeft: 8,
              color: isGood ? 'var(--orange)' : '#F87171',
              background: isGood ? 'var(--orange-glow)' : 'rgba(239,68,68,0.1)',
              padding: '2px 7px', borderRadius: 100,
            }}>
              active now
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>
      </div>

      {/* Times */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {m ? (
          <>
            <div style={{ fontSize: 13, color: active ? (isGood ? 'var(--orange)' : '#FCA5A5') : 'var(--text-secondary)' }}>
              {fmtTime(m.start, tz)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              → {fmtTime(m.end, tz)}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
        )}
      </div>
    </div>
  )
}

// ── Panchang element card ─────────────────────────────────────────────────────
function PanchangCard({
  label, sanskrit, value, sub, pct, emoji
}: { label: string; sanskrit: string; value: string; sub: string; pct?: number; emoji?: string }) {
  return (
    <div className="card" style={{ padding: '16px', flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {label} <span style={{ color: 'var(--orange-dim)' }}>· {sanskrit}</span>
      </p>
      <div style={{ fontSize: emoji ? 22 : 0, marginBottom: emoji ? 4 : 0, lineHeight: 1 }}>{emoji}</div>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</p>
      {pct !== undefined && <ProgressBar pct={pct} />}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PanchangPage() {
  const router = useRouter()
  const [panchang, setPanchang] = useState<Panchang | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [clock,    setClock]    = useState(new Date())

  // Live clock — re-renders muhurta active state every 30s
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
  
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
  
      if (!profile?.place_of_birth) {
        setError('Please set your birth place in Profile first.')
        setLoading(false)
        return
      }
  
      const geoRes = await fetch(`/api/geocode?place=${encodeURIComponent(profile.place_of_birth)}`)
      if (!geoRes.ok) { setError('Could not geocode birth place.'); setLoading(false); return }
      const geo = await geoRes.json()
  
      const params = new URLSearchParams({
        lat: geo.lat, lon: geo.lng,
        timezone: geo.timezone,
        location: profile.place_of_birth,
      })
      
      const res = await fetch(`/api/panchang?${params}`)
      const data = await res.json()
      
      if (!res.ok) { 
        setError(`Panchang error: ${data.error}`); 
        setLoading(false); 
        return 
      }
  
      setPanchang(data.panchang)
      setLoading(false)
    }
    load()
  }, [])

  const p = panchang
  const tz = p?.timezone || 'Asia/Kolkata'

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-nav)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Daivam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <div style={{ cursor: 'pointer' }} title="Help & Info">
            <HelpButton page="panchang" />
          </div>
          {p && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} strokeWidth={1.5} />
              {p.location}
            </span>
          )}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <ArrowLeft size={14} strokeWidth={1.5} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Daily Panchang
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {p ? fmtDate(p.date, tz) : 'Today'}
          </h1>
          {p && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {p.vara.sanskrit} · {p.vara.lord} rules today · {
                clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: true }).toUpperCase()
              }
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculating today's Panchang…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize: 13, color: '#FCA5A5' }}>{error}</p>
          </div>
        )}

        {p && (
          <>
            {/* -- Sunrise / Sunset strip -- */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { emoji: '🌅', label: 'Sunrise', time: fmtTime(p.sunrise, tz) },
                { emoji: '🌇', label: 'Sunset',  time: fmtTime(p.sunset,  tz) },
              ].map(({ emoji, label, time }) => (
                <div key={label} className="card" style={{
                  flex: 1, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* -- Five Panchang elements -- */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Panchang Elements
            </p>

            {/* -- Row 1: Vara + Tithi + Nakshatra -- */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <PanchangCard
                label="Vara"       sanskrit="Weekday"
                value={p.vara.name} sub={`Lord: ${p.vara.lord}`}
                emoji={{ Sunday:'☀️', Monday:'🌙', Tuesday:'🔴', Wednesday:'💚', Thursday:'🟡', Friday:'⚪', Saturday:'🔵' }[p.vara.name]}
              />
              <PanchangCard
                label="Tithi"      sanskrit="Lunar day"
                value={p.tithi.name}
                sub={`${p.tithi.paksha} Paksha · #${p.tithi.number}`}
                pct={p.tithi.pct}
                emoji={moonEmoji(p.tithi.index)}
              />
              <PanchangCard
                label="Nakshatra"  sanskrit="Moon star"
                value={p.nakshatra.name}
                sub={`Pada ${p.nakshatra.pada} · Lord: ${p.nakshatra.lord}`}
                pct={p.nakshatra.pct}
                emoji="⭐"
              />
            </div>

            {/* -- Row 2: Yoga + Karana -- */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <div className="card" style={{ flex: 1, padding: '16px' }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Yoga <span style={{ color: 'var(--orange-dim)' }}>· Nityayoga</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{p.yoga.name}</p>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 500,
                    // Updated so it remains highly readable on white
                    background: p.yoga.quality === 'auspicious'
                      ? 'rgba(34,197,94,0.15)' : p.yoga.quality === 'inauspicious'
                      ? 'rgba(239,68,68,0.15)' : 'var(--bg-surface2)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${p.yoga.quality === 'auspicious'
                      ? 'rgba(34,197,94,0.3)' : p.yoga.quality === 'inauspicious'
                      ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  }}>
                    {p.yoga.quality}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sun + Moon combined longitude</p>
              </div>

              <div className="card" style={{ flex: 1, padding: '16px' }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Karana <span style={{ color: 'var(--orange-dim)' }}>· Half-tithi</span>
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {p.karana.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Half of current Tithi</p>
              </div>
            </div>

            {/* -- Muhurta timings -- */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Muhurta Timings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <MuhurtaRow
                key="brahma"
                label="Brahma Muhurta"
                sublabel="Ideal for meditation, study & spiritual practice"
                m={p.muhurtas.brahma}  tz={tz} isGood={true}
                />
                <MuhurtaRow
                key="abhijit"
                label="Abhijit Muhurta"
                sublabel="Most auspicious time — good for new beginnings"
                m={p.muhurtas.abhijit} tz={tz} isGood={true}
                />
                <MuhurtaRow
                key="rahu"
                label="Rahu Kaal"
                sublabel="Inauspicious — avoid starting new ventures"
                m={p.muhurtas.rahu}    tz={tz} isGood={false}
                />
                <MuhurtaRow
                key="gulika"
                label="Gulika Kaal"
                sublabel="Inauspicious — avoid important decisions"
                m={p.muhurtas.gulika}  tz={tz} isGood={false}
                />
            </div>

            {/* -- Ask AI about today -- */}
            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '20px 24px', borderRadius: 14, cursor: 'pointer',
                background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Ask about today's Panchang
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    What does {p.tithi.paksha} {p.tithi.name} mean for you personally?
                  </p>
                </div>
                <span style={{ color: 'var(--orange)', fontSize: 18 }}>→</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}