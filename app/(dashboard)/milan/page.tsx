// app/(dashboard)/milan/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, Heart, Loader2, AlertTriangle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'
import Navbar from '@/app/components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Koota {
  name: string; max: number; score: number; desc: string
}
interface AshtakootResult {
  total: number; percent: number; kootas: Koota[]
  moonSignA: string; moonSignB: string; nakA: string; nakB: string
  lagnaA: string; lagnaB: string
}

// ── Score colour ─────────────────────────────────────────────────────────────
function scoreColor(pct: number): string {
  if (pct >= 72) return '#4ADE80'
  if (pct >= 50) return 'var(--orange)'
  return '#F87171'
}
function scoreLabel(pct: number): string {
  if (pct >= 80) return 'Exceptional'
  if (pct >= 72) return 'Very Good'
  if (pct >= 60) return 'Good'
  if (pct >= 50) return 'Average'
  if (pct >= 36) return 'Below Average'
  return 'Challenging'
}

// ── Koota bar ──────────────────────────────────────────────────────────────────
function KootaRow({ k }: { k: Koota }) {
  const pct = (k.score / k.max) * 100
  const col = scoreColor(pct)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{k.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{k.desc}</span>
        </div>
        <span style={{ fontSize: 13, color: col, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {k.score}/{k.max}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-surface2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          background: col,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  )
}

// ── Dial SVG ──────────────────────────────────────────────────────────────────
function CompatDial({ percent, color }: { percent: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75          // 270° sweep
  const filled = arc * (percent / 100)
  const offset = circ * 0.125       // start at 135°

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {/* Track */}
      <circle cx={70} cy={70} r={r} fill="none"
        stroke="var(--border)" strokeWidth={10}
        strokeDasharray={`${arc} ${circ - arc}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform="rotate(0 70 70)"
      />
      {/* Fill */}
      <circle cx={70} cy={70} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={70} y={65} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 22, fontWeight: 700, fill: color, fontFamily: 'Georgia,serif' }}>
        {percent}%
      </text>
      <text x={70} y={84} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 10, fill: 'var(--orange-dim)', fontFamily: 'sans-serif', letterSpacing: '0.06em' }}>
        {scoreLabel(percent).toUpperCase()}
      </text>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MilanPage() {
  const router = useRouter()

  // Responsive state
  const [isMobile, setIsMobile] = useState(false)

  // User's own chart
  const [myChart, setMyChart] = useState<any>(null)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Partner form
  const [partnerName, setPartnerName] = useState('')
  const [partnerDOB, setPartnerDOB] = useState('')
  const [partnerTOB, setPartnerTOB] = useState('12:00')
  const [partnerPlace, setPartnerPlace] = useState('')

  // Results
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ ashtakoot: AshtakootResult; narrative: string } | null>(null)
  const [showAllKootas, setShowAllKootas] = useState(false)

  const mdComponents = {
    p: ({ children }: any) => (
      <p style={{ margin: '0 0 12px 0', lineHeight: 1.8, fontSize: 14 }}>{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong style={{ color: 'var(--orange)', fontWeight: 600 }}>{children}</strong>
    ),
    em: ({ children }: any) => (
      <em style={{ color: 'var(--orange)', fontStyle: 'italic' }}>{children}</em>
    ),
    ul: ({ children }: any) => (
      <ul style={{ paddingLeft: 22, margin: '6px 0 12px', listStyleType: 'disc' }}>{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{ paddingLeft: 22, margin: '6px 0 12px' }}>{children}</ol>
    ),
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyProfile(prof)

      const { data: chartRow } = await supabase
        .from('kundali_charts').select('chart_data')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      setMyChart(chartRow?.chart_data ?? null)
      setLoading(false)
    }
    load()
  }, [])

  async function handleCalculate() {
    if (!myChart) { setError('Generate your own Kundali first'); return }
    if (!partnerDOB) { setError('Enter partner date of birth'); return }
    if (!partnerPlace) { setError('Enter partner birth place'); return }

    setCalculating(true)
    setError(null)
    setResult(null)

    try {
      // Geocode partner place
      const geoRes = await fetch(`/api/geocode?place=${encodeURIComponent(partnerPlace)}`)
      if (!geoRes.ok) throw new Error('Could not geocode partner birth place')
      const geo = await geoRes.json()

      // Calculate partner chart
      const kundaliRes = await fetch('/api/kundali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_birth: partnerDOB,
          time_of_birth: partnerTOB || '12:00',
          latitude: geo.lat,
          longitude: geo.lng,
          timezone: geo.timezone,
        }),
      })
      if (!kundaliRes.ok) {
        const e = await kundaliRes.json().catch(() => ({}))
        throw new Error(e.error ?? 'Partner chart calculation failed')
      }
      const { chart: partnerChart } = await kundaliRes.json()

      // Milan calculation
      const milanRes = await fetch('/api/milan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartA: myChart,
          chartB: partnerChart,
          nameA: myProfile?.full_name ?? 'You',
          nameB: partnerName || 'Partner',
        }),
      })
      if (!milanRes.ok) {
        const e = await milanRes.json().catch(() => ({}))
        throw new Error(e.error ?? 'Compatibility calculation failed')
      }
      const data = await milanRes.json()
      setResult({ ashtakoot: data.ashtakoot, narrative: data.narrative })
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setCalculating(false)
    }
  }

  const color = result ? scoreColor(result.ashtakoot.percent) : 'var(--orange)'
  const visibleKootas = result
    ? (showAllKootas ? result.ashtakoot.kootas : result.ashtakoot.kootas.slice(0, 4))
    : []

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      {/* Nav */}
      <Navbar page="milan" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Compatibility
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Kundali Milan
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Vedic compatibility analysis using the traditional Ashtakoot (8-fold) system — 36 points total.
          </p>
        </div>

        {/* No chart warning */}
        {!loading && !myChart && (
          <div style={{ padding: '20px 24px', borderRadius: 14, marginBottom: 28, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="var(--orange)" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, color: 'var(--orange)', marginBottom: 6 }}>Your Kundali isn't generated yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                Generate your birth chart first to use Kundali Milan.
              </p>
              <Link href="/kundali">
                <button className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Go to Kundali →</button>
              </Link>
            </div>
          </div>
        )}

        {/* Your chart pill */}
        {!loading && myChart && (
          <div style={{ marginBottom: 24, padding: '12px 18px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your chart: <strong style={{ color: 'var(--text-primary)' }}>{myProfile?.full_name ?? 'You'}</strong>
              {' '}· Moon in <strong style={{ color: 'var(--orange)' }}>{myChart.summary?.moon_sign}</strong>
              {' '}· {myChart.moon_nakshatra?.name} Nakshatra
            </span>
          </div>
        )}

        {/* Partner form - REDESIGNED FOR RESPONSIVENESS */}
        <div className="card" style={{ padding: isMobile ? '20px' : '28px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            Partner Details
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: isMobile ? 16 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name (optional)</label>
              <input
                type="text"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                placeholder="e.g. Priya"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date of Birth *</label>
              <input
                type="date"
                value={partnerDOB}
                onChange={e => setPartnerDOB(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Time of Birth</label>
              <input
                type="time"
                value={partnerTOB}
                onChange={e => setPartnerTOB(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Birth Place *</label>
              <input
                type="text"
                value={partnerPlace}
                onChange={e => setPartnerPlace(e.target.value)}
                placeholder="e.g. Mumbai, India"
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 13, color: '#FCA5A5' }}>{error}</p>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleCalculate}
            disabled={calculating || loading || !myChart}
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: 15, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
              opacity: (calculating || !myChart) ? 0.6 : 1, 
              cursor: (calculating || !myChart) ? 'not-allowed' : 'pointer',
              borderRadius: 12
            }}
          >
            {calculating ? (
              <>
                <Loader2 size={18} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                Calculating…
              </>
            ) : (
              <>
                <Heart size={18} strokeWidth={1.5} />
                Calculate Compatibility
              </>
            )}
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Score dial */}
            <div className="card" style={{ padding: '28px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                <CompatDial percent={result.ashtakoot.percent} color={color} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Ashtakoot Score
                  </p>
                  <p className="serif" style={{ fontSize: 36, fontWeight: 600, color, marginBottom: 4, lineHeight: 1 }}>
                    {result.ashtakoot.total}<span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 400 }}>/36</span>
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {scoreLabel(result.ashtakoot.percent)} compatibility
                  </p>

                  {/* Moon sign summary */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: myProfile?.full_name?.split(' ')[0] ?? 'You', sign: result.ashtakoot.moonSignA, nak: result.ashtakoot.nakA },
                      { label: partnerName || 'Partner', sign: result.ashtakoot.moonSignB, nak: result.ashtakoot.nakB },
                    ].map(p => (
                      <div key={p.label} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{p.label}</p>
                        <p style={{ fontSize: 13, color: 'var(--orange)' }}>{p.sign} · {p.nak}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Narrative */}
            {result.narrative && (
              <div className="card" style={{ padding: '24px', marginBottom: 20, borderColor: 'var(--orange-border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Jyotish Reading
                </p>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {result.narrative}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Koota breakdown */}
            <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
                Koota Breakdown
              </p>
              {visibleKootas.map(k => <KootaRow key={k.name} k={k} />)}
              <button
                onClick={() => setShowAllKootas(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0', opacity: 0.8 }}
              >
                {showAllKootas ? <><ChevronUp size={13}/> Show less</> : <><ChevronDown size={13}/> Show all 8 kootas</>}
              </button>
            </div>

            {/* Recalculate nudge */}
            <div style={{ padding: '14px 20px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
              Want a deeper reading?{' '}
              <Link href="/chat" style={{ color: 'var(--orange)', textDecoration: 'none' }}>Ask your AI Astrologer →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Upgraded Input Styles
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  background: 'var(--bg-surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease',
}