import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sun, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ChatLayout from './ChatLayout'
import { ThemeToggle } from '@/app/components/ThemeProvider'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  // Load chat sessions (grouped by session_id)
  const { data: sessions } = await supabase
    .from('chat_messages')
    .select('session_id, content, created_at')
    .eq('user_id', user.id)
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  // Deduplicate — first message per session as title
  const seen = new Set()
  const chatSessions = (sessions || []).reduce((acc: any[], row) => {
    if (!seen.has(row.session_id)) {
      seen.add(row.session_id)
      acc.push({
        session_id: row.session_id,
        title: row.content.slice(0, 52) + (row.content.length > 52 ? '...' : ''),
        created_at: row.created_at
      })
    }
    return acc
  }, [])

  return (
    <div className="relative" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="stars" />

      {/* Top nav */}
      <nav style={{
        flexShrink: 0, zIndex: 50, padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-nav)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)', position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={15} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>Daivam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            AI Astrologer online
          </div>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <ArrowLeft size={13} strokeWidth={1.5} /> Dashboard
          </Link>
        </div>
      </nav>

      <ChatLayout
        profile={profile}
        userId={user.id}
        initialSessions={chatSessions}
      />
    </div>
  )
}