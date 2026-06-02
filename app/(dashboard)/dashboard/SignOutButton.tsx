'use client'

import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// ⚠️ Adjust this import path to point to wherever you saved your ThemeProvider
import { useTheme } from '@/app/components/ThemeProvider' 

export default function SignOutButton({ isLast = false }: { isLast?: boolean }) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  // Handle Escape key to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus dialog for accessibility when opened
  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  const dialog = (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '0 24px',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
          borderRadius: 24,
          padding: '32px 24px 24px',
          width: '100%',
          maxWidth: 300,
          textAlign: 'center',
          outline: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)' 
        }}
      >
        {/* Icon circle */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: isDark ? '#3a1a1a' : '#ffe4e4',
          border: isDark ? '1px solid #7f1d1d' : '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <LogOut size={22} color={isDark ? '#f87171' : '#dc2626'} strokeWidth={1.5} />
        </div>

        <h2
          id="signout-title"
          style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 700,
            color: isDark ? '#f5f5f5' : '#111111',
          }}
        >
          Sign out?
        </h2>
        <p style={{
          margin: '0 0 28px',
          fontSize: 14,
          color: isDark ? '#a0a0a0' : '#6b6b6b',
          lineHeight: 1.55,
        }}>
          You'll need to sign back in to access your Kundali and chart data.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Cancel Button */}
          <button
            onClick={() => setOpen(false)}
            disabled={loading}
            style={{
              padding: '12px 0',
              borderRadius: 14,
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
              backgroundColor: isDark ? '#2c2c2e' : '#f4f4f4',
              fontSize: 15,
              fontWeight: 500,
              color: isDark ? '#f5f5f5' : '#111111',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Cancel
          </button>

          {/* Sign out Button */}
          <button
            onClick={handleSignOut}
            disabled={loading}
            style={{
              padding: '12px 0',
              borderRadius: 14,
              border: isDark ? '1px solid #7f1d1d' : '1px solid #fca5a5',
              backgroundColor: isDark ? '#3a1a1a' : '#fee2e2',
              fontSize: 15,
              fontWeight: 600,
              color: isDark ? '#f87171' : '#dc2626',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.opacity = '1' }}
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Control Pill Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Sign out"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 34,
          background: 'none',
          border: 'none',
          borderRight: isLast ? 'none' : '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'color 0.2s',
          padding: 0
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        title="Sign Out"
      >
        <LogOut size={16} strokeWidth={1.5} />
      </button>

      {mounted && open && createPortal(dialog, document.body)}
    </>
  )
}