// app/components/Navbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Single shared navbar used across ALL pages.
//
// Props:
//   page     – passed to HelpButton so it shows the right help content
//   showBack – renders "← Dashboard" link (true for all pages except dashboard)
//   extra    – any additional right-side nodes (e.g. <SignOutButton />)
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { Sun, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'

type PageName = 'dashboard' | 'kundali' | 'milan' | 'panchang' | 'profile' | 'transits' | 'chat'

interface NavbarProps {
  page: PageName
  showBack?: boolean
  extra?: React.ReactNode   // e.g. <SignOutButton /> on dashboard
}

export default function Navbar({
  page,
  showBack = true,
  extra,
}: NavbarProps) {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      boxSizing: 'border-box',
      padding: '0 28px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-nav)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
    }}>

      {/* ── Left: brand ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
        <span
          className="serif"
          style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          Daivam
        </span>
      </div>

      {/* ── Right: controls ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ThemeToggle />

        {/* Help button (all pages) */}
        <HelpButton page={page} />

        {/* Any page-specific extra element (e.g. SignOutButton on dashboard) */}
        {extra}

        {/* Back to Dashboard link — all pages except dashboard itself */}
        {showBack && (
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Dashboard
          </Link>
        )}
      </div>

      {/* ── Mobile: tighten padding below 480 px ────────────────────────── */}
      <style>{`
        @media (max-width: 480px) {
          nav[data-daivam-nav] {
            padding: 0 20px !important;
            height: 54px !important;
          }
        }
      `}</style>
    </nav>
  )
}