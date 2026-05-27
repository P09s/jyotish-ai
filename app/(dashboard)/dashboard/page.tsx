import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sun, Star, MessageCircle, ChevronRight, AlertTriangle, MapPin, Clock, Globe, User } from 'lucide-react'
import ActionCard from './ActionCard'
import SignOutButton from './SignOutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const firstName = profile?.full_name?.split(' ')[0] || null

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(12,12,12,0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--white)' }}>Jyotish AI</span>
        </div>
        <SignOutButton />
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Dashboard</p>
          <h1 className="serif" style={{ fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 600, color: 'var(--white)', lineHeight: 1.15, marginBottom: 6 }}>
            {firstName ? `Namaste, ${firstName} 🙏` : 'Welcome, Seeker 🙏'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</p>
        </div>

        {/* Incomplete warning */}
        {!profile?.profile_complete && (
          <div style={{
            padding: '14px 18px', marginBottom: 28, borderRadius: 12,
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={15} color="#FDBA74" strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#FDBA74', lineHeight: 1.5 }}>
                Complete your birth details to generate your Kundali
              </span>
            </div>
            <Link href="/profile" style={{ fontSize: 12, color: 'var(--orange)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              Update <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* Birth details */}
        {profile?.profile_complete && (
          <div className="card" style={{ padding: '22px 24px', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', boxShadow: '0 0 8px var(--orange)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Birth Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              {[
                { icon: <Sun size={13} color="var(--orange)" strokeWidth={1.5} />, label: 'Date of Birth', value: profile.date_of_birth },
                { icon: <Clock size={13} color="var(--orange)" strokeWidth={1.5} />, label: 'Time of Birth', value: profile.time_of_birth || 'Not provided' },
                { icon: <MapPin size={13} color="var(--orange)" strokeWidth={1.5} />, label: 'Place of Birth', value: profile.place_of_birth },
                { icon: <Globe size={13} color="var(--orange)" strokeWidth={1.5} />, label: 'Timezone', value: profile.timezone },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action cards */}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quick access</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ActionCard href="/kundali" tag="Chart" title="View Kundali Chart" desc="Lagna chart, planetary positions, and all 12 houses" iconName="star" />
          <ActionCard href="/chat" tag="AI" title="Ask the Astrologer" desc="Career, relationships, health, destiny — ask anything" iconName="message" />
          <ActionCard href="/panchang" tag="Today"    title="Daily Panchang"        desc="Tithi, nakshatra, muhurta & auspicious timings for today" iconName="sun" />
          <ActionCard href="/transits" tag="Live" title="Planetary Transits" desc="Today's planets over your natal chart — active aspects & house positions" iconName="globe" />
          <ActionCard href="/profile" tag="Profile" title="Edit Profile" desc="Update your birth details or personal information" iconName="user" />
          <ActionCard href="/milan" tag="Gunn" title="Kundali Matching" desc="Add you details and your partner's details" iconName="heart" />
        </div>

        {/* Divider */}
        <div className="divider" style={{ margin: '36px 0 28px' }} />

        {/* Tip */}
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Sun size={14} color="rgba(249,115,22,0.6)" strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: '#FDBA74', fontWeight: 500 }}>Tip: </span>
              For the most accurate Kundali, make sure your time of birth is as precise as possible — even a 10-minute difference can shift your Ascendant sign.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}