'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Briefcase, Heart, Coins, Activity } from 'lucide-react'
import Navbar from '@/app/components/Navbar'

type HouseCtx = {
  house: number
  lord: string
  lordCurrentHouse: number | null
  lordSign: string | null
  lordDignity: string | null
  occupants: string[]
}

type BhavishyaFal = {
  areas: { career: HouseCtx; marriage: HouseCtx; wealth: HouseCtx; health: HouseCtx }
  narrative: string
}

const AREA_META = {
  career:   { label: 'Career',    sanskrit: 'Karma',    Icon: Briefcase },
  marriage: { label: 'Marriage',  sanskrit: 'Kalatra',  Icon: Heart },
  wealth:   { label: 'Wealth',    sanskrit: 'Artha',    Icon: Coins },
  health:   { label: 'Health',    sanskrit: 'Arogya',   Icon: Activity },
} as const

// Safety net: strip stray markdown (**, ##, leading -/*) in case the model
// slips despite the system prompt asking for plain text — this page renders
// plain text only, it does not parse markdown into HTML.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
}

function AreaCard({ areaKey, ctx }: { areaKey: keyof typeof AREA_META; ctx: HouseCtx }) {
  const meta = AREA_META[areaKey]
  const Icon = meta.Icon
  return (
    <div className="card" style={{ padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
        }}>
          <Icon size={16} color="var(--orange)" strokeWidth={1.5} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{meta.label}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{meta.sanskrit} · House {ctx.house}</p>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
        Lord <span style={{ color: 'var(--orange-dim)' }}>{ctx.lord}</span> in house {ctx.lordCurrentHouse}
        {ctx.lordDignity ? ` (${ctx.lordDignity})` : ''}.
        {ctx.occupants.length > 0 && ` Occupied by ${ctx.occupants.join(', ')}.`}
      </p>
    </div>
  )
}

export default function BhavishyaFalPage() {
  const router = useRouter()
  const [data, setData] = useState<BhavishyaFal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/bhavishya-fal')
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setData(json.bhavishyaFal)
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <Navbar page="bhavishya-fal" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Jyotish
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Bhavishya Fal
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Your future across career, marriage, wealth & health
          </p>
        </div>

        {loading && (
          <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reading the houses of your chart…</p>
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
              <AreaCard areaKey="career"   ctx={data.areas.career} />
              <AreaCard areaKey="marriage" ctx={data.areas.marriage} />
              <AreaCard areaKey="wealth"   ctx={data.areas.wealth} />
              <AreaCard areaKey="health"   ctx={data.areas.health} />
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Jyotish Reading
            </p>
            <div className="card" style={{ padding: '24px 22px', marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                {stripMarkdown(data.narrative)}
              </p>
            </div>

            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '20px 24px', borderRadius: 16, cursor: 'pointer',
                background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Ask about your future
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    What should I focus on for my career this year?
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