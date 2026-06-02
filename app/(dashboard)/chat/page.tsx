import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sun, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ChatLayout from './ChatLayout'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import Navbar from '@/app/components/Navbar'

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
      <Navbar page="chat" showBack />

      <ChatLayout
        profile={profile}
        userId={user.id}
        initialSessions={chatSessions}
      />
    </div>
  )
}