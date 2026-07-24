'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, Loader2, MapPin, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'
import Navbar from '@/app/components/Navbar'

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
    <div style={{ height: 4, background: 'var(--bg-surface2)', borderRadius: 2, marginTop: 12 }}>
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
      padding: '14px 16px', borderRadius: 14,
      background: active
        ? (isGood ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.08)')
        : 'var(--bg-surface)',
      border: `1px solid ${active
        ? (isGood ? 'var(--orange-border)' : 'rgba(239,68,68,0.2)')
        : 'var(--border)'}`,
      transition: 'all 0.3s'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isGood ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isGood ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        {isGood 
          ? <Sparkles size={16} color="var(--orange)" /> 
          : <AlertTriangle size={16} color="#ef4444" />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: active ? (isGood ? 'var(--orange)' : '#FCA5A5') : 'var(--text-primary)'
        }}>
          {label}
          {active && (
            <span style={{
              fontSize: 10, marginLeft: 8,
              color: isGood ? 'var(--orange)' : '#F87171',
              background: isGood ? 'var(--orange-glow)' : 'rgba(239,68,68,0.1)',
              padding: '2px 8px', borderRadius: 100,
            }}>
              active now
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {m ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 500, color: active ? (isGood ? 'var(--orange)' : '#FCA5A5') : 'var(--text-secondary)' }}>
              {fmtTime(m.start, tz)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
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

// ── Adaptable Panchang Element Card ───────────────────────────────────────────
function PanchangCard({
  label, sanskrit, value, sub, pct, emoji, horizontal, badge
}: { 
  label: string; sanskrit: string; value: string; sub: string; 
  pct?: number; emoji?: string; horizontal?: boolean;
  badge?: { text: string; type: 'positive' | 'negative' | 'neutral' }
}) {
  const badgeEl = badge && (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 600, marginLeft: 8, textTransform: 'lowercase',
      background: badge.type === 'positive' ? 'rgba(34,197,94,0.15)' : badge.type === 'negative' ? 'rgba(239,68,68,0.15)' : 'var(--bg-surface2)',
      color: badge.type === 'positive' ? '#22c55e' : badge.type === 'negative' ? '#ef4444' : 'var(--text-primary)',
      border: `1px solid ${badge.type === 'positive' ? 'rgba(34,197,94,0.3)' : badge.type === 'negative' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
    }}>
      {badge.text}
    </span>
  )

  // Horizontal layout for Mobile Bento Box
  if (horizontal) {
    return (
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: emoji ? 18 : 0 }}>
        {emoji && <div style={{ fontSize: 34, lineHeight: 1, width: 44, textAlign: 'center', flexShrink: 0 }}>{emoji}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {label} <span style={{ color: 'var(--orange-dim)' }}>· {sanskrit}</span>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</p>
            {badgeEl}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>
          {pct !== undefined && <ProgressBar pct={pct} />}
        </div>
      </div>
    )
  }

  // Vertical layout for Desktop Grid
  return (
    <div className="card" style={{ padding: '16px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        {label} <span style={{ color: 'var(--orange-dim)' }}>· {sanskrit}</span>
      </p>
      {emoji && <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>{emoji}</div>}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </p>
        {badgeEl}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>{sub}</p>
      {pct !== undefined && <div style={{ marginTop: 'auto', paddingTop: 12 }}><ProgressBar pct={pct} /></div>}
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
  const [isMobile, setIsMobile] = useState(false)

  // Responsive Hook
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // getSession() reads the already-verified session locally (no network
      // round-trip) — middleware already ran the authoritative getUser()
      // check for this exact navigation before this component ever mounted.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
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
      <Navbar page="panchang" showBack />
      

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Daily Panchang
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
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

        {/* Loading / Error States */}
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
            {/* -- Sunrise / Sunset Bento Strip -- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { emoji: '🌅', label: 'Sunrise', time: fmtTime(p.sunrise, tz) },
                { emoji: '🌇', label: 'Sunset',  time: fmtTime(p.sunset,  tz) },
              ].map(({ emoji, label, time }) => (
                <div key={label} className="card" style={{
                  padding: isMobile ? '18px 16px' : '16px 20px',
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  alignItems: isMobile ? 'flex-start' : 'center', 
                  gap: isMobile ? 10 : 16
                }}>
                  <div style={{ fontSize: isMobile ? 32 : 28, lineHeight: 1 }}>{emoji}</div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: isMobile ? 4 : 2 }}>{label}</p>
                    <p style={{ fontSize: isMobile ? 18 : 16, fontWeight: 600, color: 'var(--text-primary)' }}>{time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* -- Panchang Elements Responsive Grid -- */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Panchang Elements
            </p>

            {isMobile ? (
              // Mobile Bento Box Stack
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                <PanchangCard label="Tithi" sanskrit="Lunar Day" value={p.tithi.name} sub={`${p.tithi.paksha} Paksha · #${p.tithi.number}`} pct={p.tithi.pct} emoji={moonEmoji(p.tithi.index)} horizontal />
                
                <PanchangCard label="Nakshatra" sanskrit="Moon Star" value={p.nakshatra.name} sub={`Pada ${p.nakshatra.pada} · Lord: ${p.nakshatra.lord}`} pct={p.nakshatra.pct} emoji="⭐" horizontal />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <PanchangCard label="Vara" sanskrit="Weekday" value={p.vara.name} sub={`Lord: ${p.vara.lord}`} emoji={{ Sunday:'☀️', Monday:'🌙', Tuesday:'🔴', Wednesday:'💚', Thursday:'🟡', Friday:'⚪', Saturday:'🔵' }[p.vara.name]} />
                  <PanchangCard label="Karana" sanskrit="Half-Tithi" value={p.karana.name} sub="Half of current Tithi" />
                </div>
                
                <PanchangCard label="Yoga" sanskrit="Nityayoga" value={p.yoga.name} sub="Sun + Moon combined longitude" badge={{ text: p.yoga.quality, type: p.yoga.quality === 'auspicious' ? 'positive' : p.yoga.quality === 'inauspicious' ? 'negative' : 'neutral' }} horizontal />
              </div>
            ) : (
              // Desktop Multi-Column Grid
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                  <PanchangCard label="Vara" sanskrit="Weekday" value={p.vara.name} sub={`Lord: ${p.vara.lord}`} emoji={{ Sunday:'☀️', Monday:'🌙', Tuesday:'🔴', Wednesday:'💚', Thursday:'🟡', Friday:'⚪', Saturday:'🔵' }[p.vara.name]} />
                  <PanchangCard label="Tithi" sanskrit="Lunar day" value={p.tithi.name} sub={`${p.tithi.paksha} Paksha · #${p.tithi.number}`} pct={p.tithi.pct} emoji={moonEmoji(p.tithi.index)} />
                  <PanchangCard label="Nakshatra" sanskrit="Moon star" value={p.nakshatra.name} sub={`Pada ${p.nakshatra.pada} · Lord: ${p.nakshatra.lord}`} pct={p.nakshatra.pct} emoji="⭐" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                  <PanchangCard label="Yoga" sanskrit="Nityayoga" value={p.yoga.name} sub="Sun + Moon combined longitude" badge={{ text: p.yoga.quality, type: p.yoga.quality === 'auspicious' ? 'positive' : p.yoga.quality === 'inauspicious' ? 'negative' : 'neutral' }} />
                  <PanchangCard label="Karana" sanskrit="Half-tithi" value={p.karana.name} sub="Half of current Tithi" />
                </div>
              </>
            )}

            {/* -- Muhurta timings -- */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Muhurta Timings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
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
                padding: '20px 24px', borderRadius: 16, cursor: 'pointer',
                background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Ask about today's Panchang
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    What does {p.tithi.paksha} {p.tithi.name} mean for you personally?
                  </p>
                </div>
                <span style={{ color: 'var(--orange)', fontSize: 20 }}>→</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}