// app/components/Navbar.tsx

import Link from 'next/link'
import Image from 'next/image'
import { Sun, ArrowLeft, LogOut, ChevronLeft } from 'lucide-react'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'

type PageName = 'dashboard' | 'kundali' | 'milan' | 'panchang' | 'profile' | 'transits' | 'chat' | 'numerology' | 'bhavishya-fal' | 'shubh-ashubh'

interface NavbarProps {
  page: PageName
  title?: string        // centred title on inner pages (e.g. "Kundali")
  showBack?: boolean
  extra?: React.ReactNode
}

export default function Navbar({ page, title, showBack = true, extra }: NavbarProps) {
  const isDashboard = !showBack

  // ── Dashboard layout: brand-left, pill-right ─────────────────────────────
  if (isDashboard) {
    return (
      <nav style={navBase}>
        <Brand />
        <ControlPill>
          <ThemeToggle showSeparator={true} />
          <HelpButton page={page} />
          {extra}
        </ControlPill>
        <MobileMedia />
      </nav>
    )
  }

  // ── Inner-page layout: back-icon | centred title | pill ───────────────────
  return (
    <nav style={{ ...navBase, display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
      {/* Left: back arrow */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>
      </div>

      {/* Centre: page title */}
      <span style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
      }}>
        {title ?? pageTitles[page]}
      </span>

      {/* Right: icon pill */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <ControlPill>
          <ThemeToggle showSeparator={true} />
          <HelpButton page={page} />
          {extra}
        </ControlPill>
      </div>
      <MobileMedia />
    </nav>
  )
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function Brand() {
  return (
    <Link 
      href="/dashboard" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 9, 
        textDecoration: 'none',
        padding: '5px 12px 5px 5px',
        borderRadius: 100,
      }}
    >
      <Image 
        src="/logo.png" 
        alt="Daivam Logo" 
        width={24} 
        height={24}
        priority
        style={{ display: 'block', flexShrink: 0 }}
      />
      <span className="serif" style={{ 
        fontSize: 17,                  
        fontWeight: 400, 
        color: 'var(--text-primary)',
        letterSpacing: '0.05em',       
      }}>
        DAIVAM AI
      </span>
    </Link>
  )
}
/** Frosted pill that groups all icon controls into one affordance */
function ControlPill({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--bg-pill, rgba(128,128,128,0.08))',
      border: '1px solid var(--border)',
      borderRadius: 9999,
      overflow: 'hidden',
      height: 34,
    }}>
      {children}
    </div>
  )
}

/** Injects mobile overrides — avoids a separate CSS file */
function MobileMedia() {
  return (
    <style>{`
      @media (max-width: 480px) {
        nav[data-daivam-nav] { padding: 0 12px !important; height: 50px !important; }
      }
    `}</style>
  )
}

const navBase: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(16px, 4vw, 48px)',
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'color-mix(in srgb, var(--bg-nav) 80%, transparent)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  borderBottom: '1px solid color-mix(in srgb, var(--orange-border) 40%, var(--border))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 24px rgba(0,0,0,0.12)',
}

const pageTitles: Record<string, string> = {
  kundali:  'Kundali',
  milan:    'Milan',
  panchang: 'Panchang',
  transits: 'Transits',
  profile:  'Profile',
  chat:     'Astrologer',
  numerology: 'Numerology',
  'bhavishya-fal': 'Bhavishya Fal',
  'shubh-ashubh': 'Shubh Ashubh',
}