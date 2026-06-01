import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import { Sun, ArrowLeft, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-nav)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={16} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Daivam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <HelpButton page="profile" />
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <ArrowLeft size={14} strokeWidth={1.5} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Settings</p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Your Profile
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Update your birth details for accurate Kundali calculations</p>
        </div>

        <ProfileForm profile={profile} userId={user.id} />
      </div>
    </div>
  )
}