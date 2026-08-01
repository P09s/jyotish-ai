'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled root layout error:', error)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, { tags: { digest: error.digest } })
    }
  }, [error])

  // This replaces the ENTIRE root layout when it fires (per Next.js's own
  // requirement), so it needs its own <html>/<body> and can't lean on
  // ThemeProvider or next/font — kept intentionally simple and dependency-free.
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#060608', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 400 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(245,239,224,0.94)', marginBottom: 10 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(245,239,224,0.6)', lineHeight: 1.6, marginBottom: 22 }}>
            DAIVAM AI hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#F97316', color: '#fff', fontSize: 14, fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
