'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, ArrowLeft, Loader2 } from 'lucide-react'

type CurPos  = { sign: string; sign_index: number; degree: number; isRetrograde: boolean }
type NatPos  = { sign: string; sign_index: number; degree: number; house: number }
type TPlanet  = { name: string; sanskrit: string; symbol: string; current: CurPos; natal: NatPos; transit_house: number; conjunct_natal: string[]; aspects_natal_houses: number[] }
type Special = { type: string; planet: string; severity: 'positive'|'caution'|'challenging'; label: string; description: string }
type Aspect  = { transit_planet: string; transit_symbol: string; natal_planet: string; natal_house: number; aspect_num: number }
type Transits = { date: string; natal_lagna: { sign: string; degree: number }; natal_moon_sign: string; planets: TPlanet[]; special_transits: Special[]; aspects: Aspect[] }

const PLANET_COLOR: Record<string,string> = {
  Sun:'#FCD34D', Moon:'#93C5FD', Mars:'#F87171', Mercury:'#6EE7B7',
  Jupiter:'#FDE68A', Venus:'#C4B5FD', Saturn:'#94A3B8', Rahu:'#FB923C', Ketu:'#A3A3A3',
}
const SEV: Record<string,{bg:string;border:string;dot:string;color:string}> = {
  positive:    { bg:'rgba(34,197,94,0.07)',  border:'rgba(34,197,94,0.2)',  dot:'#22c55e', color:'#86EFAC' },
  caution:     { bg:'rgba(234,179,8,0.07)',  border:'rgba(234,179,8,0.2)',  dot:'#eab308', color:'#FDE047' },
  challenging: { bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.2)',  dot:'#ef4444', color:'#FCA5A5' },
}

const ASPECT_LABEL: Record<number,string> = { 3:'3rd', 4:'4th', 5:'5th', 7:'7th', 8:'8th', 9:'9th', 10:'10th' }

export default function TransitsPage() {
  const router = useRouter()
  const [data,    setData]    = useState<Transits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const res  = await fetch('/api/transits')
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed'); setLoading(false); return }
      setData(json.transits)
      setLoading(false)
    }
    load()
  }, [])

  const t = data

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <nav style={{
        position:'sticky', top:0, zIndex:50, padding:'0 28px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(12,12,12,0.85)', backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize:17, fontWeight:600, color:'var(--white)' }}>Jyotish AI</span>
        </div>
        <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-secondary)', textDecoration:'none' }}>
          <ArrowLeft size={14} strokeWidth={1.5} /> Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'44px 24px 80px', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:11, color:'var(--orange)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>
            Planetary Transits
          </p>
          <h1 className="serif" style={{ fontSize:'clamp(26px,4vw,36px)', fontWeight:600, color:'var(--white)', marginBottom:6 }}>
            {t ? new Date(t.date+'T12:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : 'Today'}
          </h1>
          {t && (
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>
              {t.natal_lagna.sign} Lagna · {t.natal_moon_sign} Moon · current sky over your natal chart
            </p>
          )}
        </div>

        {loading && (
          <div className="card" style={{ padding:'48px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation:'spin 1s linear infinite' }} />
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>Calculating transits…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding:'16px 20px', borderRadius:12, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'#FCA5A5', marginBottom: error.includes('Kundali') ? 8 : 0 }}>{error}</p>
            {error.includes('Kundali') && (
              <Link href="/kundali" style={{ fontSize:12, color:'var(--orange)' }}>Generate your Kundali first →</Link>
            )}
          </div>
        )}

        {t && (
          <>
            {/* Active influences */}
            {t.special_transits.length > 0 && (
              <>
                <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  Active Influences
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
                  {t.special_transits.map(s => {
                    const st = SEV[s.severity]
                    return (
                      <div key={s.type} style={{ padding:'16px 18px', borderRadius:12, background:st.bg, border:`1px solid ${st.border}`, display:'flex', gap:14, alignItems:'flex-start' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:st.dot, flexShrink:0, marginTop:5 }} />
                        <div>
                          <p style={{ fontSize:13, fontWeight:500, color:st.color, marginBottom:5 }}>{s.label}</p>
                          <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.65 }}>{s.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Transit table */}
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
              Transiting Planets
            </p>
            <div className="card" style={{ padding:0, marginBottom:20, overflow:'hidden' }}>
              {/* Header row */}
              <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 36px 1fr', padding:'9px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
                {['Planet','Now','H','Natal'].map(h => (
                  <span key={h} style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
                ))}
              </div>

              {t.planets.map((p, i) => {
                const col     = PLANET_COLOR[p.name] ?? 'var(--orange)'
                const moved   = p.current.sign_index !== p.natal.sign_index
                const isLast  = i === t.planets.length - 1

                return (
                  <div key={p.name} style={{
                    display:'grid', gridTemplateColumns:'140px 1fr 36px 1fr',
                    padding:'11px 16px', alignItems:'center',
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    background: p.conjunct_natal.length > 0 ? 'rgba(249,115,22,0.03)' : 'transparent',
                  }}>
                    {/* Name */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:17, color:col, fontFamily:'serif', lineHeight:1, flexShrink:0 }}>{p.symbol}</span>
                      <div>
                        <span style={{ fontSize:13, color:'var(--text-primary)' }}>{p.name}</span>
                        {p.current.isRetrograde && (
                          <span style={{ fontSize:10, color:'rgba(249,115,22,0.7)', marginLeft:4 }}>℞</span>
                        )}
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.sanskrit}</div>
                      </div>
                    </div>

                    {/* Current */}
                    <div>
                      <span style={{ fontSize:13, color: moved ? '#FDBA74' : 'var(--text-secondary)', fontWeight: moved ? 500 : 400 }}>
                        {p.current.sign}
                      </span>
                      <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:4 }}>
                        {p.current.degree.toFixed(0)}°
                      </span>
                      {p.conjunct_natal.length > 0 && (
                        <div style={{ fontSize:10, color:'rgba(249,115,22,0.65)', marginTop:2 }}>
                          near natal {p.conjunct_natal.slice(0,2).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Transit house badge */}
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:500, padding:'2px 5px', borderRadius:5,
                      color: p.transit_house !== p.natal.house ? 'var(--orange)' : 'var(--text-muted)',
                      background: p.transit_house !== p.natal.house ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${p.transit_house !== p.natal.house ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                      H{p.transit_house}
                    </span>

                    {/* Natal */}
                    <div>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{p.natal.sign}</span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginLeft:4 }}>
                        {p.natal.degree.toFixed(0)}° · H{p.natal.house}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Aspects */}
            {t.aspects.length > 0 && (
              <>
                <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  Active Aspects <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(slow planets only)</span>
                </p>
                <div className="card" style={{ padding:'4px 16px', marginBottom:24 }}>
                  {t.aspects.map((a, i) => {
                    const tc = PLANET_COLOR[a.transit_planet] ?? 'var(--orange)'
                    const nc = PLANET_COLOR[a.natal_planet]   ?? 'rgba(255,255,255,0.4)'
                    return (
                      <div key={`${a.transit_planet}-${a.natal_planet}-${i}`} style={{
                        display:'flex', alignItems:'center', gap:8, padding:'10px 0',
                        borderBottom: i < t.aspects.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        flexWrap:'wrap',
                      }}>
                        <span style={{ fontSize:15, color:tc, fontFamily:'serif' }}>{a.transit_symbol}</span>
                        <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1, minWidth:80 }}>
                          Transit {a.transit_planet}
                        </span>
                        <span style={{ fontSize:11, padding:'1px 8px', borderRadius:5, background:'rgba(255,255,255,0.05)', color:'var(--text-muted)', border:'1px solid rgba(255,255,255,0.07)' }}>
                          {ASPECT_LABEL[a.aspect_num] ?? `${a.aspect_num}th`} aspect
                        </span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>→</span>
                        <span style={{ fontSize:15, color:nc, fontFamily:'serif' }}>
                          {t.planets.find(p=>p.name===a.natal_planet)?.symbol}
                        </span>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                          Natal {a.natal_planet}
                        </span>
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'rgba(249,115,22,0.08)', color:'rgba(249,115,22,0.7)', border:'1px solid rgba(249,115,22,0.15)' }}>
                          H{a.natal_house}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* CTA */}
            <Link href="/chat" style={{ textDecoration:'none' }}>
              <div style={{
                padding:'20px 24px', borderRadius:14, cursor:'pointer',
                background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)',
                display:'flex', alignItems:'center', justifyContent:'space-between'
              }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', marginBottom:4 }}>
                    Ask about your transits
                  </p>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                    How do Saturn and Jupiter's current positions affect you?
                  </p>
                </div>
                <span style={{ color:'var(--orange)', fontSize:18 }}>→</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}