'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, { tags: { digest: error.digest } })
    }
  }, [error])

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="stars" />
      <div className="card" style={{ maxWidth: 420, padding: '40px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
        }}>
          <AlertTriangle size={24} color="var(--orange)" strokeWidth={1.5} />
        </div>
        <h1 className="serif" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          The stars didn&apos;t align this time. Try again, or head back to your dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <Link href="/dashboard" style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13,
            border: '1px solid var(--orange-border)', color: 'var(--text-secondary)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
          }}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
