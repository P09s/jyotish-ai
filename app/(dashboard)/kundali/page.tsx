import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, AlertTriangle } from 'lucide-react'

const PLANETS = [
  { symbol: '☉', name: 'Sun', sanskrit: 'Surya' },
  { symbol: '☽', name: 'Moon', sanskrit: 'Chandra' },
  { symbol: '♂', name: 'Mars', sanskrit: 'Mangal' },
  { symbol: '☿', name: 'Mercury', sanskrit: 'Budha' },
  { symbol: '♃', name: 'Jupiter', sanskrit: 'Guru' },
  { symbol: '♀', name: 'Venus', sanskrit: 'Shukra' },
  { symbol: '♄', name: 'Saturn', sanskrit: 'Shani' },
  { symbol: '☊', name: 'Rahu', sanskrit: 'Rahu' },
  { symbol: '☋', name: 'Ketu', sanskrit: 'Ketu' },
]

const HOUSES = Array.from({ length: 12 }, (_, i) => i + 1)

export default async function KundaliPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const isComplete = profile?.profile_complete && profile?.date_of_birth

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(12,12,12,0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--white)' }}>Jyotish AI</span>
        </div>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={14} strokeWidth={1.5} /> Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Vedic Chart</p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
            {profile?.full_name ? `${profile.full_name}'s Kundali` : 'Your Kundali'}
          </h1>
          {profile?.date_of_birth && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {profile.date_of_birth}{profile.time_of_birth ? ` · ${profile.time_of_birth}` : ''}{profile.place_of_birth ? ` · ${profile.place_of_birth}` : ''}
            </p>
          )}
        </div>

        {!isComplete && (
          <div style={{
            padding: '20px 24px', borderRadius: 14, marginBottom: 32,
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
            display: 'flex', gap: 14, alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} color="#FDBA74" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, color: '#FDBA74', marginBottom: 6 }}>Birth details incomplete</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                Your date, time, and place of birth are needed to calculate planetary positions.
              </p>
              <Link href="/profile">
                <button className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Complete profile →</button>
              </Link>
            </div>
          </div>
        )}

        {/* North Indian chart grid */}
        <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lagna Chart (North Indian)</p>
            {!isComplete && <span style={{ fontSize: 11, color: 'rgba(249,115,22,0.5)', padding: '3px 10px', borderRadius: 100, border: '1px solid rgba(249,115,22,0.2)' }}>Preview</span>}
          </div>

          {/* North Indian diamond grid — 4×4 SVG */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 320 }}>
              <defs>
                <style>{`.hl{fill:none;stroke:rgba(249,115,22,0.25);stroke-width:1} .ht{font-size:9px;fill:rgba(250,250,249,0.35);font-family:serif} .hb{fill:rgba(249,115,22,0.04)}`}</style>
              </defs>
              {/* Outer border */}
              <rect x="10" y="10" width="300" height="300" className="hl" rx="2" />
              {/* Inner diamond */}
              <polygon points="160,10 310,160 160,310 10,160" className="hl" />
              {/* 4 corner diagonals */}
              <line x1="10" y1="10" x2="160" y2="160" className="hl" />
              <line x1="310" y1="10" x2="160" y2="160" className="hl" />
              <line x1="10" y1="310" x2="160" y2="160" className="hl" />
              <line x1="310" y1="310" x2="160" y2="160" className="hl" />

              {/* House number labels */}
              {[
                [160, 42, '1'], [235, 92, '2'], [278, 160, '3'], [235, 228, '4'],
                [160, 278, '5'], [85, 228, '6'], [42, 160, '7'], [85, 92, '8'],
                [118, 118, '9'], [202, 118, '10'], [202, 202, '11'], [118, 202, '12'],
              ].map(([x, y, n]) => (
                <text key={n} x={x} y={y} className="ht" textAnchor="middle" dominantBaseline="middle">{n}</text>
              ))}

              {/* Coming soon overlay if incomplete */}
              {!isComplete && (
                <>
                  <rect x="10" y="10" width="300" height="300" fill="rgba(12,12,12,0.7)" rx="2" />
                  <text x="160" y="152" textAnchor="middle" fontSize="13" fill="rgba(249,115,22,0.7)" fontFamily="serif">Complete your</text>
                  <text x="160" y="172" textAnchor="middle" fontSize="13" fill="rgba(249,115,22,0.7)" fontFamily="serif">birth details first</text>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Planets table */}
        <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Planetary Overview</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PLANETS.map((p, i) => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 0',
                borderBottom: i < PLANETS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: 'var(--orange)', fontFamily: 'serif'
                }}>{p.symbol}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 400 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.sanskrit}</span>
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
                  padding: '4px 12px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  {isComplete ? '—' : 'Needs birth data'}
                </div>
              </div>
            ))}
          </div>
          {isComplete && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.6, padding: '12px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }}>
              ☉ Full planetary position calculation (Swiss Ephemeris integration) coming soon. Use the AI Chat to get personalised insights based on your chart right now.
            </p>
          )}
        </div>

        {/* CTA to chat */}
        {isComplete && (
          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '20px 24px', borderRadius: 14, cursor: 'pointer',
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Ask your AI Astrologer</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Get personalised Jyotish insights right now</p>
              </div>
              <span style={{ color: 'var(--orange)', fontSize: 18 }}>→</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}