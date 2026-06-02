// app/(dashboard)/kundali/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, AlertTriangle, Loader2, Maximize2, X } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import { MotionDiv } from '@/app/components/motion-wrapper'
import { motion, AnimatePresence } from 'framer-motion'
import HelpButton from '@/app/components/HelpButton'

const PLANETS_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
const SYMBOLS: Record<string, string> = {
  Sun:'☉', Moon:'☽', Mars:'♂', Mercury:'☿',
  Jupiter:'♃', Venus:'♀', Saturn:'♄', Rahu:'☊', Ketu:'☋'
}
const SANSKRIT: Record<string, string> = {
  Sun:'Surya', Moon:'Chandra', Mars:'Mangal', Mercury:'Budha',
  Jupiter:'Guru', Venus:'Shukra', Saturn:'Shani', Rahu:'Rahu', Ketu:'Ketu'
}
const SIGN_ABBR = ['Ar','Ta','Ge','Ca','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi']

const PLANET_COLORS: Record<string, string> = {
  Su: '#FCD34D', Mo: '#93C5FD', Ma: '#F87171', Me: '#6EE7B7',
  Ju: '#FCA5A5', Ve: '#C4B5FD', Sa: '#94A3B8', Ra: '#FB923C', Ke: '#A3A3A3',
}

function planetColor(abbr: string): string {
  const key = abbr.replace(/[℞ᴿRᴿ]$/, '').slice(0, 2)
  return PLANET_COLORS[key] ?? 'var(--orange)'
}

const HOUSE_COLORS: Record<number, string> = {
  1:  'rgba(220,80,80,0.9)',
  2:  'rgba(80,200,160,0.9)',
  3:  'rgba(240,160,60,0.9)',
  4:  'rgba(80,140,240,0.9)',
  5:  'var(--orange)',
  6:  'rgba(80,200,160,0.9)',
  7:  'rgba(220,80,180,0.9)',
  8:  'rgba(220,80,180,0.9)',
  9:  'rgba(140,80,220,0.9)',
  10: 'rgba(200,200,200,0.7)',
  11: 'rgba(100,100,220,0.9)',
  12: 'rgba(140,80,220,0.9)',
}

// ── North Indian chart geometry ───────────────────────────────────────────────
const HOUSE_CENTERS: Record<number, [number, number]> = {
  1:  [350, 148], 2:  [210, 100], 3:  [ 90, 193], 4:  [185, 280],
  5:  [ 90, 368], 6:  [210, 460], 7:  [350, 412], 8:  [492, 460],
  9:  [612, 368], 10: [516, 280], 11: [612, 193], 12: [492, 100],
}

const RASHI_INSIDE: [number, number, string][] = [
  [350, 68, '9'], [130, 68, '10'], [572, 68, '8'], [68, 210, '11'],
  [632, 210, '7'], [68, 280, '12'], [632, 280, '6'], [68, 352, '1'],
  [632, 352, '5'], [130, 495, '2'], [572, 495, '4'], [350, 495, '3'],
]

const SIGN_LABEL_POS: Record<number, [number, number]> = {
  1: [350, 52], 2: [124, 52], 3: [52, 188], 4: [52, 280],
  5: [52, 374], 6: [124, 512], 7: [350, 512], 8: [576, 512],
  9: [648, 374], 10: [648, 280], 11: [648, 188], 12: [576, 52],
}

// ── NorthIndianChart component ────────────────────────────────────────────────
function NorthIndianChart({ chart, isModal = false }: { chart: any; isModal?: boolean }) {
  const lagnaIdx: number = chart?.lagna?.sign_index ?? 0
  
  // Responsive styles: Thicker, darker lines and text when in modal view
  const gridColor = isModal ? 'var(--orange)' : 'var(--orange-border)'
  const gridOpacity = isModal ? 0.45 : 1
  const gw = isModal ? 2 : 1.3
  const outerStroke = isModal ? 'var(--orange)' : 'var(--orange-border)'
  const outerStrokeOpacity = isModal ? 0.7 : 1
  const outerStrokeWidth = isModal ? 2.5 : 1.6

  const houseMap: Record<number, string[]> = {}
  for (let i = 1; i <= 12; i++) houseMap[i] = []

  if (chart?.planets) {
    for (const p of chart.planets) {
      const signIdx = p.sign_index
      const houseNum = ((signIdx - lagnaIdx + 12) % 12) + 1

      const h = (houseNum >= 1 && houseNum <= 12) ? houseNum : p.house
      houseMap[h].push(
        p.isRetrograde ? `${p.name.slice(0, 2)}ᴿ` : p.name.slice(0, 2)
      )
    }
  }

  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      viewBox="0 0 700 560" width="100%" style={{ maxWidth: 580, display: 'block' }}>
      
      <rect 
        x="30" y="30" width="640" height="500" rx={isModal ? "8" : "3"} 
        style={{ fill: 'var(--bg-surface)' }} 
        stroke={outerStroke} strokeOpacity={outerStrokeOpacity} strokeWidth={outerStrokeWidth} 
      />
      
      <line x1="30"  y1="30"  x2="670" y2="530" stroke={gridColor} strokeOpacity={gridOpacity} strokeWidth={gw} />
      <line x1="670" y1="30"  x2="30"  y2="530" stroke={gridColor} strokeOpacity={gridOpacity} strokeWidth={gw} />
      <polygon points="350,30 670,280 350,530 30,280" fill="none" stroke={gridColor} strokeOpacity={gridOpacity} strokeWidth={gw} />

      {RASHI_INSIDE.map(([x, y, n]) => (
        <text key={`rashi-${n}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          style={{ 
            fontSize: isModal ? '16px' : '13px', 
            fill: isModal ? 'var(--text-secondary)' : 'var(--text-muted)', 
            fontFamily: 'sans-serif', 
            fontWeight: isModal ? '600' : '400' 
          }}>
          {n}
        </text>
      ))}

      {Array.from({ length: 12 }, (_, i) => {
        const house = i + 1
        const signIdx = (lagnaIdx + house - 1) % 12
        const [cx, cy] = HOUSE_CENTERS[house]
        const [sx, sy] = SIGN_LABEL_POS[house]
        const planets = houseMap[house]
        const isLagna = house === 1
        const hColor = HOUSE_COLORS[house]

        const count = planets.length
        const twoCol = count > 2

        const baseY = isLagna
          ? cy + (isModal ? 24 : 20)
          : cy - (twoCol ? Math.min(count - 1, 3) * (isModal ? 11 : 9) : Math.min(count - 1, 1) * (isModal ? 11 : 9))

        const hLabelY = isLagna ? cy - (isModal ? 38 : 34) : count > 0 ? baseY - (isModal ? 18 : 16) : cy - 6

        return (
          <g key={house}>
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle"
              style={{
                fontSize: isModal ? '12px' : '9px', 
                fill: isLagna ? 'var(--orange)' : (isModal ? 'var(--text-secondary)' : 'var(--text-muted)'),
                fontFamily: 'sans-serif', 
                fontWeight: isLagna ? '700' : (isModal ? '600' : '400'),
              }}>
              {SIGN_ABBR[signIdx]}
            </text>

            <text x={cx} y={hLabelY} textAnchor="middle" dominantBaseline="middle"
              style={{ 
                fontSize: isModal ? '13px' : '10px', 
                fontFamily: 'sans-serif', 
                fontWeight: isModal ? '700' : '500', 
                fill: hColor 
              }}>
              H{house}
            </text>

            {isLagna && (
              <>
                <text x={cx} y={cy - (isModal ? 20 : 16)} textAnchor="middle" dominantBaseline="middle"
                  style={{ 
                    fontSize: isModal ? '11px' : '8px', 
                    fill: 'var(--orange-dim)', 
                    fontFamily: 'sans-serif', 
                    fontWeight: isModal ? '600' : '400',
                    letterSpacing: '0.08em' 
                  }}>
                  ASC ↑
                </text>
                {planets.length === 0 && (
                  <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
                    style={{ 
                      fontSize: isModal ? '20px' : '17px', 
                      fontFamily: 'Georgia,serif', 
                      fontWeight: isModal ? '700' : '600', 
                      fill: 'var(--orange)' 
                    }}>
                    Asc
                  </text>
                )}
              </>
            )}

            {planets.slice(0, 5).map((abbr, pi) => {
              let xPos = cx
              let yPos = baseY

              if (twoCol) {
                const col = pi % 2
                const row = Math.floor(pi / 2)
                xPos = cx + (col === 0 ? (isModal ? -18 : -16) : (isModal ? 18 : 16))
                yPos = baseY + row * (isModal ? 22 : 18)
              } else {
                yPos = baseY + pi * (isModal ? 22 : 18)
              }

              return (
                <text key={abbr + pi} x={xPos} y={yPos} textAnchor="middle" dominantBaseline="middle"
                  style={{ 
                    fontSize: isModal ? (count >= 4 ? '15px' : '19px') : (count >= 4 ? '13px' : '15px'), 
                    fill: planetColor(abbr), 
                    fontFamily: 'Georgia,serif', 
                    fontWeight: isModal ? '800' : '700' 
                  }}>
                  {abbr}
                </text>
              )
            })}
          </g>
        )
      })}
    </motion.svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function KundaliPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [chart, setChart] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Responsive / Interactive states
  const [isMobile, setIsMobile] = useState(false)
  const [isChartExpanded, setIsChartExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isChartExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isChartExpanded])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const isComplete = prof?.profile_complete && prof?.date_of_birth && prof?.place_of_birth
      if (!isComplete) { setLoading(false); return }

      const geoRes = await fetch(`/api/geocode?place=${encodeURIComponent(prof.place_of_birth)}`)
      if (!geoRes.ok) { setError('Could not geocode birth place'); setLoading(false); return }
      const geo = await geoRes.json()

      const calcRes = await fetch('/api/kundali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_birth: prof.date_of_birth,
          time_of_birth: prof.time_of_birth || '12:00',
          latitude: geo.lat,
          longitude: geo.lng,
          timezone: geo.timezone,
        }),
      })
      
      if (!calcRes.ok) { 
        const errData = await calcRes.json().catch(() => ({}))
        setError(`Backend Error: ${errData.error || 'Chart calculation failed'}`)
        setLoading(false)
        return 
      }
      
      const calcData = await calcRes.json()
      setChart(calcData.chart)
      setLoading(false)
    }
    load()
  }, [])

  const isComplete = profile?.profile_complete && profile?.date_of_birth
  const planetMap: Record<string, any> = {}
  if (chart?.planets) for (const p of chart.planets) planetMap[p.name] = p
  const currentDasha = chart?.vimshottari_dasha?.find((d: any) => d.isCurrent)

  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-nav)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Daivam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <HelpButton page="kundali" />
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <ArrowLeft size={14} strokeWidth={1.5} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Vedic Chart</p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {profile?.full_name ? `${profile.full_name}'s Kundali` : 'Your Kundali'}
          </h1>
          {profile?.date_of_birth && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {profile.date_of_birth}
              {profile.time_of_birth ? ` · ${profile.time_of_birth}` : ''}
              {profile.place_of_birth ? ` · ${profile.place_of_birth}` : ''}
            </p>
          )}
        </div>

        {/* Alerts */}
        {!loading && !isComplete && (
          <div style={{ padding: '20px 24px', borderRadius: 14, marginBottom: 32, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="var(--orange)" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, color: 'var(--orange)', marginBottom: 6 }}>Birth details incomplete</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>Date, time, and place of birth are needed to calculate your chart.</p>
              <Link href="/profile">
                <button className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Complete profile →</button>
              </Link>
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 12, marginBottom: 24, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize: 13, color: '#FCA5A5' }}>{error}</p>
          </div>
        )}
        {loading && (
          <div className="card" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculating your chart…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* 1. Lagna Chart block */}
        {!loading && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div className="card" style={{ padding: '24px', marginBottom: 20, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Lagna Chart (North Indian)
                </p>
                {chart?.lagna && (
                  <span style={{ fontSize: 11, color: 'var(--orange)', padding: '3px 10px', borderRadius: 100, border: '1px solid var(--orange-border)' }}>
                    {chart.lagna.sign} Lagna · {Number(chart.lagna.degree).toFixed(1)}°
                  </span>
                )}
              </div>
              
              <div 
                style={{ 
                  display: 'flex', justifyContent: 'center', 
                  cursor: (isMobile && chart) ? 'zoom-in' : 'default' 
                }}
                onClick={() => { if (isMobile && chart) setIsChartExpanded(true) }}
              >
                {chart ? (
                  <NorthIndianChart chart={chart} isModal={false} />
                ) : (
                  <div style={{ width: 320, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Complete profile to generate chart</p>
                  </div>
                )}
              </div>

              {isMobile && chart && (
                <button
                  onClick={() => setIsChartExpanded(true)}
                  style={{
                    position: 'absolute', bottom: 16, right: 16,
                    background: 'var(--bg-surface2)', border: '1px solid var(--border)',
                    padding: '8px', borderRadius: '10px', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Maximize2 size={16} />
                </button>
              )}
            </div>
          </MotionDiv>
        )}

        {/* 2. Bento Box Summary Container */}
        {chart?.summary && (
          <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', 
              gap: isMobile ? 16 : 20 
            }}>
              {[
                ['Lagna',     chart.summary.lagna_sign],
                ['Moon Sign', chart.summary.moon_sign],
                ['Sun Sign',  chart.summary.sun_sign],
                ['Nakshatra', chart.summary.moon_nakshatra],
              ].map(([label, value]) => (
                <div key={label} style={{ borderBottom: isMobile ? '1px solid var(--border)' : 'none', paddingBottom: isMobile ? 8 : 0 }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
              <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto', marginTop: isMobile ? -8 : 0 }}>
                <p style={{ fontSize: 10, color: 'var(--orange-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Dasha Now</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--orange)' }}>
                  {currentDasha ? `${currentDasha.lord} till ${currentDasha.end?.slice(0, 7)}` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Planetary Positions (Stacked Cards on Mobile) */}
        {!loading && (
          <div className="card" style={{ padding: isMobile ? '16px' : '24px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Planetary Positions</p>

            {isMobile ? (
              // Mobile View: Stacked Flex blocks to prevent merging
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PLANETS_ORDER.map((name) => {
                  const p = planetMap[name]
                  let displayHouse = p?.house
                  if (p && chart?.lagna) {
                    displayHouse = ((p.sign_index - chart.lagna.sign_index + 12) % 12) + 1
                  }
                  
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--orange)', fontFamily: 'serif' }}>
                          {SYMBOLS[name]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {name} {p?.isRetrograde && <span style={{ fontSize: 10, color: 'var(--orange-dim)' }}>(R)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {p ? p.sign : 'No data'} • {p ? `${Number(p.degree).toFixed(0)}°` : ''}
                          </div>
                        </div>
                      </div>
                      
                      {p && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                           <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--orange)', background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', borderRadius: 6, padding: '4px 8px' }}>
                            H{displayHouse}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Desktop View: Table
              <>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
                  <div style={{ width: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1, paddingLeft: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Planet</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 90 }}>Sign</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 44, textAlign: 'right' }}>Deg</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 36, textAlign: 'center' }}>H</span>
                </div>

                {PLANETS_ORDER.map((name, i) => {
                  const p = planetMap[name]
                  let displayHouse = p?.house
                  if (p && chart?.lagna) {
                    displayHouse = ((p.sign_index - chart.lagna.sign_index + 12) % 12) + 1
                  }
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < PLANETS_ORDER.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 40, height: 36, borderRadius: 9, flexShrink: 0, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--orange)', fontFamily: 'serif' }}>
                        {SYMBOLS[name]}
                      </div>
                      <div style={{ flex: 1, paddingLeft: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 7 }}>{SANSKRIT[name]}</span>
                        {p?.isRetrograde && <span style={{ fontSize: 10, color: 'var(--orange-dim)', marginLeft: 5 }}>R</span>}
                      </div>
                      <span style={{ fontSize: 12, color: p ? 'var(--text-primary)' : 'var(--text-muted)', width: 90, fontStyle: p ? 'normal' : 'italic' }}>
                        {p ? p.sign : (isComplete ? '—' : 'No data')}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 44, textAlign: 'right' }}>
                        {p ? `${Number(p.degree).toFixed(0)}°` : ''}
                      </span>
                      {p ? (
                        <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--orange)', background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', borderRadius: 6, padding: '2px 5px' }}>
                            H{displayHouse}
                          </span>
                        </div>
                      ) : <div style={{ width: 36 }} />}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* 4. Vimshottari Dasha table */}
        {chart?.vimshottari_dasha && (
          <div className="card" style={{ padding: isMobile ? '16px' : '24px', marginBottom: 20 }}>
            <p style={{
              fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 16
            }}>Vimshottari Dasha</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chart.vimshottari_dasha.slice(0, 6).map((d: any) => {
                const isCur = d.isCurrent
                const curAD = d.antardashas?.find((ad: any) => ad.isCurrent)

                return (
                  <div key={d.lord + d.start}>

                    {/* ── Mahadasha row ──────────────────────────────────── */}
                    <div style={{
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      justifyContent: 'space-between',
                      gap: isMobile ? 4 : 12,
                      padding: '12px 14px', borderRadius: isCur ? '10px 10px 0 0' : 10,
                      background: isCur ? 'var(--orange-glow)' : 'var(--bg-surface)',
                      border: `1px solid ${isCur ? 'var(--orange-border)' : 'var(--border)'}`,
                      borderBottom: isCur ? 'none' : undefined,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: isCur ? 'var(--orange)' : 'var(--border2)'
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{
                            fontSize: 14, fontWeight: isCur ? 600 : 500,
                            color: isCur ? 'var(--text-primary)' : 'var(--text-muted)'
                          }}>
                            {d.lord} Mahadasha
                            {isCur && !isMobile && (
                              <span style={{ fontSize: 11, color: 'var(--orange)', marginLeft: 8 }}>
                                ← current
                              </span>
                            )}
                          </span>
                          {/* Duration pushed to right */}
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {d.start?.slice(0, 7)} – {d.end?.slice(0, 7)}
                          </span>
                        </div>
                      </div>
                      {isCur && isMobile && (
                         <span style={{ fontSize: 11, color: 'var(--orange)', marginLeft: 18, marginTop: 2 }}>
                           Current Phase
                         </span>
                      )}
                    </div>

                    {/* ── Antardasha rows — only for current mahadasha ───── */}
                    {isCur && d.antardashas?.length > 0 && (
                      <div style={{
                        padding: '8px 10px 10px',
                        background: 'var(--bg-surface2)',
                        border: '1px solid var(--orange-border)',
                        borderTop: 'none', borderRadius: '0 0 10px 10px',
                        display: 'flex', flexDirection: 'column', gap: 3
                      }}>
                        {/* Column headers */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '4px 8px 8px', gap: 8
                        }}>
                          <span style={{
                            fontSize: 10, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 13
                          }}>
                            Sub-period
                          </span>
                          <span style={{
                            fontSize: 10, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            flexShrink: 0
                          }}>
                            Duration
                          </span>
                        </div>

                        {d.antardashas.map((ad: any) => {
                          const isAdCur  = ad.isCurrent
                          const isPast   = new Date(ad.end) < new Date()
                          return (
                            <div key={ad.lord + ad.start} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                              padding: '8px', borderRadius: 8,
                              background: isAdCur
                                ? 'var(--orange-glow)'
                                : 'transparent',
                              border: isAdCur
                                ? '1px solid var(--orange-border)'
                                : '1px solid transparent',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Status dot */}
                                <div style={{
                                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                                  background: isAdCur
                                    ? 'var(--orange)'
                                    : isPast
                                    ? 'var(--text-muted)'
                                    : 'var(--border2)'
                                }} />

                                {/* Label */}
                                <span style={{
                                  fontSize: 13,
                                  color: isAdCur
                                    ? 'var(--orange)'
                                    : isPast
                                    ? 'var(--text-muted)'
                                    : 'var(--text-secondary)',
                                  fontWeight: isAdCur ? 600 : 400
                                }}>
                                  {d.lord}/{ad.lord}
                                  {isAdCur && (
                                    <span style={{
                                      fontSize: 10, color: 'var(--orange)',
                                      marginLeft: 6, opacity: 0.8
                                    }}>
                                      now
                                    </span>
                                  )}
                                </span>
                              </div>

                              {/* Date range */}
                              <span style={{
                                fontSize: 12, flexShrink: 0,
                                color: isAdCur
                                  ? 'var(--orange-dim)'
                                  : 'var(--text-hint)'
                              }}>
                                {ad.start?.slice(0, 7)} – {ad.end?.slice(0, 7)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary pill */}
            {chart.summary?.current_antardasha_lord && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6
              }}>
                Currently in{' '}
                <span style={{ color: 'var(--orange)', fontWeight: 500 }}>
                  {chart.summary.current_dasha_lord}/{chart.summary.current_antardasha_lord} Antardasha
                </span>
                {' '}ending{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {chart.summary.current_antardasha_ends?.slice(0, 7)}
                </span>
              </div>
            )}
          </div>
        )}

        {isComplete && !loading && (
          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <div style={{ padding: '20px 24px', borderRadius: 16, cursor: 'pointer', background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Ask your AI Astrologer</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Get personalised Jyotish insights based on your chart</p>
              </div>
              <span style={{ color: 'var(--orange)', fontSize: 20 }}>→</span>
            </div>
          </Link>
        )}

      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isChartExpanded && chart && isMobile && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              style={{ 
                position: 'fixed', inset: 0, 
                width: '100vw', height: '100dvh', 
                zIndex: 99999, 
                background: 'rgba(0,0,0,0.6)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 
              }}
              onClick={() => setIsChartExpanded(false)}
            >
              <motion.div 
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                style={{ 
                  background: 'var(--bg-surface)', 
                  padding: '48px 16px 24px', 
                  borderRadius: 24, position: 'relative', width: '100%', maxWidth: 450,
                  border: '1px solid var(--border)', 
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }} 
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setIsChartExpanded(false)} 
                  style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-surface2)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', zIndex: 10 }}
                >
                  <X size={18} />
                </button>
                <NorthIndianChart chart={chart} isModal={true} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}