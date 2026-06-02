'use client'
import { useState, useEffect } from 'react'
import { Plus, MessageCircle, Trash2, Sun, Menu, X } from 'lucide-react'
import ChatInterface from './ChatInterface'
import { createClient } from '@/app/lib/supabase/client'

type Session = { session_id: string; title: string; created_at: string }
type Profile = { full_name: string | null; date_of_birth: string | null; place_of_birth: string | null; gender: string | null; time_of_birth: string | null }

export default function ChatLayout({
  profile, userId, initialSessions
}: {
  profile: Profile | null
  userId: string
  initialSessions: Session[]
}) {
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessions[0]?.session_id || null
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function newChat() {
    const newId = crypto.randomUUID()
    setActiveSessionId(newId)
    setSidebarOpen(false)
  }

  function handleSessionCreated(sessionId: string, firstMessage: string) {
    const newSession: Session = {
      session_id: sessionId,
      title: firstMessage.slice(0, 52) + (firstMessage.length > 52 ? '...' : ''),
      created_at: new Date().toISOString()
    }
    setSessions(prev => {
      const exists = prev.find(s => s.session_id === sessionId)
      if (exists) return prev
      return [newSession, ...prev]
    })
  }

  async function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(sessionId)
    await supabase.from('chat_messages').delete()
      .eq('user_id', userId).eq('session_id', sessionId)
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.session_id !== sessionId)
      setActiveSessionId(remaining[0]?.session_id || null)
    }
    setDeletingId(null)
  }

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId)
    setSidebarOpen(false)
  }

  function groupByDate(sessions: Session[]) {
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const week = new Date(today); week.setDate(week.getDate() - 7)
    const groups: Record<string, Session[]> = {
      'Today': [], 'Yesterday': [], 'Last 7 days': [], 'Older': []
    }
    sessions.forEach(s => {
      const d = new Date(s.created_at); d.setHours(0,0,0,0)
      if (d >= today) groups['Today'].push(s)
      else if (d >= yesterday) groups['Yesterday'].push(s)
      else if (d >= week) groups['Last 7 days'].push(s)
      else groups['Older'].push(s)
    })
    return groups
  }

  const grouped = groupByDate(sessions)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'all' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* ── Sidebar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 272,
        zIndex: 30,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        background: 'var(--bg-page)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: sidebarOpen ? '8px 0 40px rgba(0,0,0,0.7)' : 'none',
      }}>

        {/* Sidebar header row: title + close button */}
        <div style={{
          padding: '16px 14px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)'
          }}>
            Conversations
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
              background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s', opacity: 0.4, flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
          >
            <X size={14} color="var(--text-primary)" strokeWidth={2} />
          </button>
        </div>

        {/* New conversation button */}
        <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
          <button onClick={newChat} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
            color: 'var(--orange)', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)' }}
          >
            <Plus size={14} strokeWidth={2.5} color="var(--orange)" />
            New conversation
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '28px 12px', textAlign: 'center' }}>
              <MessageCircle size={20} color="rgba(249,115,22,0.3)" strokeWidth={1.5} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                No conversations yet. Start asking your astrologer!
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null
              return (
                <div key={label} style={{ marginBottom: 8 }}>
                  <p style={{
                    fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em',
                    textTransform: 'uppercase', padding: '8px 10px 4px', fontWeight: 500
                  }}>{label}</p>
                  {items.map(session => (
                    <div key={session.session_id}
                      onClick={() => selectSession(session.session_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                        background: activeSessionId === session.session_id
                          ? 'rgba(249,115,22,0.1)' : 'transparent',
                        border: `1px solid ${activeSessionId === session.session_id
                          ? 'rgba(249,115,22,0.2)' : 'transparent'}`,
                        transition: 'all 0.15s', marginBottom: 2, position: 'relative'
                      }}
                      onMouseEnter={e => {
                        if (activeSessionId !== session.session_id)
                          e.currentTarget.style.background = 'var(--bg-surface)'
                      }}
                      onMouseLeave={e => {
                        if (activeSessionId !== session.session_id)
                          e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <MessageCircle size={13} strokeWidth={1.5}
                        color={activeSessionId === session.session_id ? 'var(--orange)' : 'var(--text-muted)'}
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{
                        flex: 1, fontSize: 13, lineHeight: 1.4, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: activeSessionId === session.session_id ? 'var(--orange)' : 'var(--text-secondary)'
                      }}>
                        {session.title}
                      </span>
                      <button
                        onClick={(e) => deleteSession(session.session_id, e)}
                        style={{
                          flexShrink: 0, padding: '2px', background: 'none', border: 'none',
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s',
                          display: 'flex', alignItems: 'center'
                        }}
                        className="delete-btn"
                      >
                        <Trash2 size={12} color="rgba(239,68,68,0.7)" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{
          flexShrink: 0, padding: '12px 14px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sun size={13} color="var(--orange)" strokeWidth={1.5} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'Seeker'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {profile?.date_of_birth ? `Born ${profile.date_of_birth}` : 'No birth data'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <ChatInterface
          key={activeSessionId || 'new'}
          profile={profile}
          userId={userId}
          sessionId={activeSessionId || crypto.randomUUID()}
          onSessionCreated={handleSessionCreated}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </div>

      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.2); border-radius: 2px; }
      `}</style>
    </div>
  )
}