'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sun, Menu, ArrowUp } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MotionDiv } from '@/app/components/motion-wrapper'

type Message = { role: 'user' | 'assistant'; content: string }

type Profile = {
  full_name: string | null
  date_of_birth: string | null
  place_of_birth: string | null
  gender: string | null
  time_of_birth: string | null
}

const SUGGESTED = [
  'What does my Lagna say about my personality?',
  'Which planet is most powerful in my chart?',
  'What does my current Mahadasha mean for me?',
  'What does my chart say about career and finances?',
  'Tell me about my Moon Nakshatra and its significance',
]

export default function ChatInterface({
  profile,
  userId,
  sessionId,
  onSessionCreated,
  onOpenSidebar,
}: {
  profile: Profile | null
  userId: string
  sessionId: string
  onSessionCreated: (sessionId: string, firstMessage: string) => void
  onOpenSidebar?: () => void
}) {
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Markdown components
  const mdComponents = {
    p: ({ children }: any) => (
      <p style={{ margin: '0 0 12px 0', lineHeight: 1.8, fontSize: 15 }}>
        {children}
      </p>
    ),
    strong: ({ children }: any) => (
      <strong style={{ color: 'var(--orange)', fontWeight: 600 }}>{children}</strong>
    ),
    em: ({ children }: any) => (
      <em style={{ color: 'var(--orange)', fontStyle: 'italic' }}>{children}</em>
    ),
    h1: ({ children }: any) => (
      <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--orange)', margin: '18px 0 8px', lineHeight: 1.4 }}>{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--orange)', margin: '16px 0 6px', lineHeight: 1.4 }}>{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--orange)', margin: '12px 0 5px', lineHeight: 1.4 }}>{children}</h3>
    ),
    ul: ({ children }: any) => (
      <ul style={{ paddingLeft: 22, margin: '6px 0 12px', listStyleType: 'disc' }}>{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{ paddingLeft: 22, margin: '6px 0 12px' }}>{children}</ol>
    ),
    li: ({ children }: any) => (
      <li style={{ marginBottom: 6, lineHeight: 1.75, color: 'var(--text-primary)', fontSize: 15 }}>{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote style={{
        borderLeft: '2px solid rgba(249,115,22,0.5)',
        paddingLeft: 14, margin: '10px 0',
        color: 'var(--text-secondary)', fontStyle: 'italic'
      }}>{children}</blockquote>
    ),
    code: ({ children }: any) => (
      <code style={{
        background: 'var(--bg-surface2)', padding: '2px 7px',
        borderRadius: 5, fontSize: 13, fontFamily: 'monospace', color: 'var(--orange)'
      }}>{children}</code>
    ),
    hr: () => (
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
    ),
  }

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
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading || isStreaming) return

    setInput('')
    setError('')

    const isFirst = messages.length === 0
    const userMessage: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setLoading(true)

    if (isFirst) onSessionCreated(sessionId, msg)

    await supabase.from('chat_messages').insert({
      user_id: userId, role: 'user', content: msg, session_id: sessionId
    })

    let streamStarted = false

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Chat failed')
      }
      if (!res.body) throw new Error('No response body')

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      setLoading(false)
      setIsStreaming(true)
      streamStarted = true

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: fullContent }
          return updated
        })
      }

      if (fullContent) {
        await supabase.from('chat_messages').insert({
          user_id: userId, role: 'assistant', content: fullContent, session_id: sessionId
        })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMessages(prev => {
        if (!streamStarted) return prev.slice(0, -1)
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -2)
        return prev
      })
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!historyLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={20} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  const canSend = input.trim().length > 0 && !loading && !isStreaming

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top bar: hamburger + session title ── */}
      <div style={{
        flexShrink: 0, height: 48,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10,
      }}>
        <button
          onClick={onOpenSidebar}
          style={{
            width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          title="Conversations"
        >
          {/* Changed color from hardcoded white to theme variable */}
          <Menu size={17} color="var(--text-secondary)" strokeWidth={1.8} />
        </button>
        <span style={{
          fontSize: 13, color: 'var(--text-muted)',
          fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em'
        }}>
          {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Kundali` : 'Daivam Astrologer'}
        </span>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        scrollBehavior: 'smooth',
        padding: '8px 0 24px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px' }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 32 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                margin: '0 auto 20px',
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sun size={22} color="var(--orange)" strokeWidth={1.5} />
              </div>

              <h2 className="serif" style={{
                fontSize: 22, fontWeight: 600,
                color: 'var(--text-primary)', marginBottom: 10
              }}>
                Namaste{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 🙏
              </h2>

              <p style={{
                fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75,
                maxWidth: 380, margin: '0 auto 32px'
              }}>
                {profile?.date_of_birth
                  ? 'Your Kundali is ready. Ask me anything about your chart, life path, or timing.'
                  : 'Complete your birth details in Profile to unlock personalised readings.'
                }
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 440, margin: '0 auto' }}>
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '11px 18px', borderRadius: 12, textAlign: 'left',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontSize: 13.5,
                      cursor: 'pointer', transition: 'all 0.2s',
                      lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--border-orange)'
                      e.currentTarget.style.background = 'var(--orange-glow)'
                      e.currentTarget.style.color = 'var(--orange)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-card)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((m, i) => {
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
            const showCursor = isLastAssistant && isStreaming

            return (
              <MotionDiv
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  marginBottom: m.role === 'user' ? 24 : 28,
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* Assistant avatar */}
                {m.role === 'assistant' && (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    flexShrink: 0, marginTop: 1,
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Sun size={13} color="var(--orange)" strokeWidth={1.5} />
                  </div>
                )}

                {/* Message content */}
                <div style={{
                  maxWidth: m.role === 'user' ? '72%' : '88%',
                  ...(m.role === 'user' ? {
                    // User bubble: pill-style warm fill
                    padding: '12px 18px',
                    borderRadius: '20px 20px 5px 20px',
                    background: 'rgba(249,115,22,0.13)',
                    border: '1px solid rgba(249,115,22,0.18)',
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: 'var(--orange)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  } : {
                    // Assistant: no bubble, just clean text
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word',
                    paddingTop: 2,
                  })
                }}>
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {m.content}
                      </ReactMarkdown>
                      {showCursor && (
                        <span style={{
                          display: 'inline-block', width: 7, height: 7,
                          borderRadius: '50%', background: 'var(--orange)',
                          marginLeft: 3, verticalAlign: 'middle',
                          animation: 'blink 1s ease-in-out infinite'
                        }} />
                      )}
                    </>
                  )}
                </div>
              </MotionDiv>
            )
          })}

          {/* Loading dots */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sun size={13} color="var(--orange)" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 7 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--orange-dim)',
                    animation: 'bounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.18}s`
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 14,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
              color: '#FCA5A5', fontSize: 13
            }}>
              {error} — please try again.
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 20px 18px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* Pill-shaped input container */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '8px 8px 8px 16px',
            transition: 'border-color 0.2s',
          }}
          onFocusCapture={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'
          }}
          onBlurCapture={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask your astrologer…"
              rows={1}
              disabled={isStreaming}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 15,
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                minHeight: 28,
                maxHeight: 160,
                padding: '2px 0',
                opacity: isStreaming ? 0.5 : 1,
              }}
            />

            {/* Send button — inside the pill */}
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              style={{
                flexShrink: 0,
                width: 36, height: 36,
                borderRadius: 10,
                border: 'none',
                cursor: canSend ? 'pointer' : 'default',
                background: canSend ? 'var(--orange)' : 'var(--bg-surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                transform: canSend ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              {loading
                ? <Loader2 size={15} color="white" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                /* Changed color from hardcoded white/opacity to theme variables */
                : <ArrowUp size={16} color={canSend ? 'white' : 'var(--text-muted)'} strokeWidth={2.5} />
              }
            </button>
          </div>

          <p style={{
            textAlign: 'center', fontSize: 11,
            color: 'var(--text-hint)', marginTop: 8,
            fontFamily: 'DM Sans, sans-serif'
          }}>
            {isStreaming ? 'Receiving response…' : 'Enter to send · Shift+Enter for new line'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0) }
          40% { transform: translateY(-5px) }
        }
        @keyframes spin {
          from { transform: rotate(0deg) }
          to   { transform: rotate(360deg) }
        }
        @keyframes blink {
          0%,100% { opacity: 1 }
          50%     { opacity: 0 }
        }
      `}</style>
    </div>
  )
}