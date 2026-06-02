import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Sun, ChevronRight, AlertTriangle, MapPin,
  Clock, Globe, Sparkles, HelpCircle
} from 'lucide-react'
import ActionCard from './ActionCard'
import SignOutButton from './SignOutButton'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import { MotionDiv } from '@/app/components/motion-wrapper'
import HelpButton from '@/app/components/HelpButton'
import Navbar from '@/app/components/Navbar'
// import LanguageToggle from '@/app/components/LanguageToggle'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const firstName = profile?.full_name?.split(' ')[0] || null

  const featuredCard = {
    href: '/chat', tag: 'AI', featured: true,
    title: 'Ask the Astrologer',
    desc: 'Career, relationships, health, destiny — ask anything about your chart',
    iconName: 'message' as const,
  }

  const gridCards = [
    { href: '/kundali', tag: 'Chart', title: 'View Kundali', desc: 'Lagna chart, planetary positions & all 12 houses', iconName: 'star' as const },
    { href: '/panchang', tag: 'Today', title: 'Daily Panchang', desc: 'Tithi, nakshatra & auspicious timings', iconName: 'sun' as const },
    { href: '/transits', tag: 'Live', title: 'Transits', desc: "Today's planets over your natal chart", iconName: 'globe' as const },
    { href: '/milan', tag: 'Love', title: 'Kundali Matching', desc: 'Check compatibility with your partner', iconName: 'heart' as const },
    { href: '/profile', tag: 'Profile', title: 'Edit Profile', desc: 'Update birth details or personal info', iconName: 'user' as const },
  ]

  return (
    <div className="dashboard-root">
      <div className="stars" />

      {/* Nav */}
      <Navbar
  page="dashboard"
  showBack={false}
  extra={<SignOutButton />}
/>

      {/* Main content */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="dashboard-content"
      >

        {/* Hero greeting */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 40, position: 'relative' }}
        >
          <div style={{
            position: 'absolute', top: -40, right: -20,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, color: 'var(--orange)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
              Dashboard
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.6)', display: 'inline-block',
                animation: 'pulse-dot 2s ease-in-out infinite'
              }} />
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, letterSpacing: '0.08em' }}>Chart active</span>
            </span>
          </div>

          <h1 className="serif dashboard-heading">
            {firstName ? `Namaste, ${firstName} 🙏` : 'Welcome, Seeker 🙏'}
          </h1>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {profile?.date_of_birth
              ? `Born ${profile.date_of_birth}${profile.place_of_birth ? ` · ${profile.place_of_birth}` : ''}`
              : user.email}
          </p>
        </MotionDiv>

        {/* Incomplete profile warning */}
        {!profile?.profile_complete && (
          <MotionDiv
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
            style={{
              padding: '13px 18px', marginBottom: 28, borderRadius: 12,
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <AlertTriangle size={14} color="var(--orange)" strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--orange)', lineHeight: 1.5 }}>
                Complete your birth details to unlock your Kundali
              </span>
            </div>
            <Link href="/profile" style={{ fontSize: 12, color: 'var(--orange)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              Update <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </MotionDiv>
        )}

        {/* Birth details card */}
        {profile?.profile_complete && (
          <MotionDiv
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ padding: '18px 22px', marginBottom: 32, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)', boxShadow: '0 0 7px var(--orange)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Birth Details</span>
            </div>
            <div className="birth-details-grid">
              {[
                { icon: <Sun size={12} color="var(--orange)" strokeWidth={1.5} />, label: 'Date', value: profile.date_of_birth },
                { icon: <Clock size={12} color="var(--orange)" strokeWidth={1.5} />, label: 'Time', value: profile.time_of_birth || 'Not provided' },
                { icon: <MapPin size={12} color="var(--orange)" strokeWidth={1.5} />, label: 'Place', value: profile.place_of_birth },
                { icon: <Globe size={12} color="var(--orange)" strokeWidth={1.5} />, label: 'Timezone', value: profile.timezone },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 1 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 2, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </MotionDiv>
        )}

        {/* Section label */}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>
          Quick access
        </p>

        {/* Featured card */}
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} style={{ marginBottom: 12 }}>
          <ActionCard {...featuredCard} />
        </MotionDiv>

        {/* 2-column grid */}
        <div className="cards-grid">
          {gridCards.map((card, i) => (
            <MotionDiv key={card.href} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 + i * 0.05 }}>
              <ActionCard {...card} />
            </MotionDiv>
          ))}
        </div>

        {/* Divider */}
        <div className="divider" style={{ margin: '40px 0 28px' }} />

        {/* Tip */}
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)' }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Sparkles size={13} color="rgba(249,115,22,0.6)" strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>
              <span style={{ color: 'var(--orange)', fontWeight: 500 }}>Tip: </span>
              For the most accurate Kundali, make sure your time of birth is as precise as possible — even a 10-minute difference can shift your Ascendant sign.
            </p>
          </div>
        </MotionDiv>
      </MotionDiv>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1) }
          50% { opacity: 0.6; transform: scale(0.85) }
        }

        /* Root — fills the full viewport, clips any decorative overflow */
        .dashboard-root {
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        /* Nav — always full width, centered content inside */
        .dashboard-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          box-sizing: border-box;
          padding: 0 28px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-nav);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
        }

        /* Content — centred column, equal horizontal padding */
        .dashboard-content {
          max-width: 680px;
          width: 100%;
          margin: 0 auto;
          padding: 48px 28px 80px;
          position: relative;
          z-index: 1;
          box-sizing: border-box;
        }

        /* Heading */
        .dashboard-heading {
          font-size: clamp(26px, 6vw, 40px);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.15;
          margin-bottom: 8px;
        }

        /* Birth details 2-col grid */
        .birth-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 24px;
        }

        /* Action cards grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        /* ── Mobile (≤ 480px) ── */
        @media (max-width: 480px) {
          .dashboard-nav {
            padding: 0 20px;
            height: 54px;
          }

          .dashboard-content {
            /* Equal left/right padding so content feels centred */
            padding: 32px 20px 72px;
          }

          .dashboard-heading {
            font-size: clamp(22px, 7vw, 30px);
          }

          /* Birth details stays 2-col for visual balance */
          .birth-details-grid {
            grid-template-columns: 1fr 1fr;
            gap: 14px 16px;
          }

          /* Cards stack to full-width single column */
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Small tablets (481–640px) ── */
        @media (min-width: 481px) and (max-width: 640px) {
          .dashboard-nav { padding: 0 20px; }
          .dashboard-content { padding: 40px 20px 80px; }
        }
      `}</style>
    </div>
  )
}