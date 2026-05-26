'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sun } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

type Message = { role: 'user' | 'assistant'; content: string }
type Profile = {
  full_name: string | null; date_of_birth: string | null
  place_of_birth: string | null; gender: string | null; time_of_birth: string | null
}

const SUGGESTED = [
  'What does my Lagna say about my personality?',
  'Which planet is most powerful in my chart?',
  'What does my current Mahadasha mean for me?',
  'What does my chart say about career and finances?',
  'Tell me about my Moon Nakshatra and its significance',
]

export default function ChatInterface({
  profile, userId, sessionId, onSessionCreated
}: {
  profile: Profile | null
  userId: string
  sessionId: string
  onSessionCreated: (sessionId: string, firstMessage: string) => void
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load messages for this session
  useEffect(() => {
    setMessages([])
    setHistoryLoaded(false)
    setError('')
    async function load() {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      setMessages((data as Message[]) || [])
      setHistoryLoaded(true)
    }
    load()
  }, [sessionId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    const isFirst = messages.length === 0
    const userMessage: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    // Notify sidebar of new session
    if (isFirst) onSessionCreated(sessionId, msg)

    await supabase.from('chat_messages').insert({
      user_id: userId, role: 'user', content: msg, session_id: sessionId
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Chat failed')
      }
      const data = await res.json()
      const assistantMessage: Message = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMessage])
      await supabase.from('chat_messages').insert({
        user_id: userId, role: 'assistant', content: data.reply, session_id: sessionId
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!historyLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={20} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 20px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sun size={20} color="var(--orange)" strokeWidth={1.5} />
              </div>
              <h2 className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--white)', marginBottom: 8 }}>
                Namaste{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 🙏
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
                {profile?.date_of_birth
                  ? 'Your Kundali is ready. Ask me anything about your chart, life path, or timing.'
                  : 'Complete your birth details in Profile to unlock personalised readings.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 420, margin: '0 auto' }}>
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    padding: '10px 16px', borderRadius: 10, textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.2s', lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif'
                  }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor='rgba(249,115,22,0.25)'; el.style.background='rgba(249,115,22,0.05)'; el.style.color='#FDBA74' }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor='rgba(255,255,255,0.07)'; el.style.background='rgba(255,255,255,0.03)'; el.style.color='var(--text-secondary)' }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', marginBottom: 16,
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start', gap: 10
            }}>
              {m.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sun size={12} color="var(--orange)" strokeWidth={1.5} />
                </div>
              )}
              <div style={{
                maxWidth: '76%', padding: '11px 15px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user' ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${m.role === 'user' ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
                fontSize: 14, lineHeight: 1.75,
                color: m.role === 'user' ? '#FDBA74' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sun size={12} color="var(--orange)" strokeWidth={1.5} />
              </div>
              <div style={{
                padding: '12px 16px', borderRadius: '4px 16px 16px 16px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', gap: 5, alignItems: 'center'
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)', opacity: 0.7,
                    animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i*0.2}s`
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 12,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#FCA5A5', fontSize: 13
            }}>
              {error} — please try again.
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '10px 16px 14px',
        background: 'rgba(12,12,12,0.92)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your astrologer..."
            rows={1}
            style={{
              flex: 1, padding: '11px 15px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              resize: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
              transition: 'border-color 0.2s', minHeight: 44, maxHeight: 120
            }}
            onFocus={e => e.target.style.borderColor = 'var(--orange)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="btn-primary" style={{ padding: '11px 13px', borderRadius: 12, flexShrink: 0 }}>
            {loading
              ? <Loader2 size={15} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={15} strokeWidth={1.5} />
            }
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}