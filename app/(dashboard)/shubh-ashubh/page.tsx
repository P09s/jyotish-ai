'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Moon, Star } from 'lucide-react'
import Navbar from '@/app/components/Navbar'

type ShubhAshubh = {
  date: string
  tara: { name: string; quality: 'favorable' | 'unfavorable'; group: number }
  chandra: { houseDistance: number; quality: 'favorable' | 'neutral' | 'unfavorable' }
  yogas: { gajaKesari: boolean; kaalSarp: boolean }
  narrative: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
}

function qualityColor(q: string) {
  if (q === 'favorable') return { fg: '#86EFAC', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' }
  if (q === 'neutral')   return { fg: 'var(--text-muted)', bg: 'var(--bg-surface2)', border: 'var(--border)' }
  return { fg: '#FCA5A5', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' }
}

function BalaCard({ icon, label, value, quality, sub }: {
  icon: React.ReactNode; label: string; value: string; quality: string; sub: string
}) {
  const c = qualityColor(quality)
  return (
    <div className="card" style={{ padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
        }}>
          {icon}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{sub}</p>
      <span style={{
        fontSize: 10, padding: '3px 9px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
      }}>
        {quality}
      </span>
    </div>
  )
}

export default function ShubhAshubhPage() {
  const router = useRouter()
  const [data, setData] = useState<ShubhAshubh | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/shubh-ashubh')
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setData(json.shubhAshubh)
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <Navbar page="shubh-ashubh" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Muhurta
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Shubh Ashubh
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Today's personal favorability, based on your Tara & Chandra Bala
          </p>
        </div>

        {loading && (
          <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reading today's Moon transit…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0 }}>{error}</p>
            {error.includes('Kundali') && (
              <Link href="/kundali" style={{ fontSize: 12, color: '#FCA5A5', textDecoration: 'underline', flexShrink: 0 }}>
                Generate
              </Link>
            )}
          </div>
        )}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <BalaCard
                icon={<Star size={16} color="var(--orange)" strokeWidth={1.5} />}
                label="Tara Bala"
                value={data.tara.name}
                sub={`Group ${data.tara.group} of 9`}
                quality={data.tara.quality}
              />
              <BalaCard
                icon={<Moon size={16} color="var(--orange)" strokeWidth={1.5} />}
                label="Chandra Bala"
                value={`House ${data.chandra.houseDistance}`}
                sub="from your natal Moon"
                quality={data.chandra.quality}
              />
            </div>

            {(data.yogas.gajaKesari || data.yogas.kaalSarp) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {data.yogas.gajaKesari && (
                  <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 100, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
                    Gaja Kesari Yoga present in your chart
                  </span>
                )}
                {data.yogas.kaalSarp && (
                  <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 100, background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    Kaal Sarp Dosha present in your chart
                  </span>
                )}
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Jyotish Reading
            </p>
            <div className="card" style={{ padding: '24px 22px', marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                {stripMarkdown(data.narrative)}
              </p>
            </div>

            <Link href="/panchang" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '20px 24px', borderRadius: 16, cursor: 'pointer',
                background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    View today's full Panchang
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Tithi, nakshatra & auspicious timings for everyone
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