import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import { Sun, ArrowLeft, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'
import Navbar from '@/app/components/Navbar'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="relative min-h-screen">
      <div className="stars" />

      <Navbar page="profile" showBack />

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