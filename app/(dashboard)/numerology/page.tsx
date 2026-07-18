'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import Navbar from '@/app/components/Navbar'

type NumberInfo = {
  number: number
  planet: string
  sanskrit: string
  color: string
  day: string
  traits: string
}

type Numerology = {
  mulank: NumberInfo
  bhagyank: NumberInfo
  narrative: string
}

// ── Number card ───────────────────────────────────────────────────────────────
function NumberCard({ label, sublabel, info }: { label: string; sublabel: string; info: NumberInfo }) {
  return (
    <div className="card" style={{ padding: '20px 18px' }}>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
        {label} <span style={{ color: 'var(--orange-dim)' }}>· {sublabel}</span>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
          fontSize: 24, fontWeight: 700, color: 'var(--orange)',
        }}>
          {info.number}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {info.planet}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.sanskrit}</p>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        {info.traits}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 100,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)',
          color: 'var(--orange)',
        }}>
          {info.day}
        </span>
        <span style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 100,
          background: 'var(--bg-surface2)', border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}>
          {info.color}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NumerologyPage() {
  const router = useRouter()
  const [data, setData] = useState<Numerology | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/numerology')
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setData(json.numerology)
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <Navbar page="numerology" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Ank Jyotish
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Numerology
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Your Mulank & Bhagyank, derived from your date of birth
          </p>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculating your numbers…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0 }}>{error}</p>
            {error.includes('Profile') && (
              <Link href="/profile" style={{ fontSize: 12, color: '#FCA5A5', textDecoration: 'underline', flexShrink: 0 }}>
                Update
              </Link>
            )}
          </div>
        )}

        {data && (
          <>
            {/* -- Mulank / Bhagyank cards -- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <NumberCard label="Mulank" sublabel="Root Number" info={data.mulank} />
              <NumberCard label="Bhagyank" sublabel="Destiny Number" info={data.bhagyank} />
            </div>

            {/* -- Reading -- */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Jyotish Reading
            </p>
            <div className="card" style={{ padding: '24px 22px', marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                {data.narrative}
              </p>
            </div>

            {/* -- Ask AI -- */}
            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '20px 24px', borderRadius: 16, cursor: 'pointer',
                background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Ask about your numbers
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    How does Mulank {data.mulank.number} shape your career path?
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