'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sun } from 'lucide-react'
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
  onSessionCreated
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
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Markdown styles
  const mdComponents = {
    p: ({ children }: any) => (
      <p style={{ margin: '0 0 10px 0', lineHeight: 1.75 }}>
        {children}
      </p>
    ),

    strong: ({ children }: any) => (
      <strong style={{ color: '#FDBA74', fontWeight: 600 }}>
        {children}
      </strong>
    ),

    em: ({ children }: any) => (
      <em style={{
        color: 'rgba(253,186,116,0.8)',
        fontStyle: 'italic'
      }}>
        {children}
      </em>
    ),

    h1: ({ children }: any) => (
      <h1 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#FDBA74',
        margin: '14px 0 6px',
        lineHeight: 1.4
      }}>
        {children}
      </h1>
    ),

    h2: ({ children }: any) => (
      <h2 style={{
        fontSize: 15,
        fontWeight: 600,
        color: '#FDBA74',
        margin: '12px 0 5px',
        lineHeight: 1.4
      }}>
        {children}
      </h2>
    ),

    h3: ({ children }: any) => (
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'rgba(253,186,116,0.85)',
        margin: '10px 0 4px',
        lineHeight: 1.4
      }}>
        {children}
      </h3>
    ),

    ul: ({ children }: any) => (
      <ul style={{
        paddingLeft: 20,
        margin: '6px 0 10px',
        listStyleType: 'disc'
      }}>
        {children}
      </ul>
    ),

    ol: ({ children }: any) => (
      <ol style={{
        paddingLeft: 20,
        margin: '6px 0 10px'
      }}>
        {children}
      </ol>
    ),

    li: ({ children }: any) => (
      <li style={{
        marginBottom: 5,
        lineHeight: 1.65,
        color: 'var(--text-primary)'
      }}>
        {children}
      </li>
    ),

    blockquote: ({ children }: any) => (
      <blockquote style={{
        borderLeft: '2px solid rgba(249,115,22,0.4)',
        paddingLeft: 12,
        margin: '8px 0',
        color: 'rgba(255,255,255,0.65)',
        fontStyle: 'italic'
      }}>
        {children}
      </blockquote>
    ),

    code: ({ children }: any) => (
      <code style={{
        background: 'rgba(255,255,255,0.08)',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#FDBA74'
      }}>
        {children}
      </code>
    ),

    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        margin: '12px 0'
      }} />
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
      bottomRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  async function sendMessage(text?: string) {

    const msg = (text || input).trim()

    if (!msg || loading || isStreaming) return

    setInput('')
    setError('')

    const isFirst = messages.length === 0

    const userMessage: Message = {
      role: 'user',
      content: msg
    }

    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setLoading(true)

    if (isFirst) {
      onSessionCreated(sessionId, msg)
    }

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      content: msg,
      session_id: sessionId
    })

    let streamStarted = false

    try {

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: newMessages
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Chat failed')
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '' }
      ])

      setLoading(false)
      setIsStreaming(true)

      streamStarted = true

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let fullContent = ''

      while (true) {

        const { done, value } = await reader.read()

        if (done) break

        fullContent += decoder.decode(value, {
          stream: true
        })

        setMessages(prev => {

          const updated = [...prev]

          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullContent
          }

          return updated
        })
      }

      if (fullContent) {

        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          content: fullContent,
          session_id: sessionId
        })
      }

    } catch (err: unknown) {

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong'
      )

      setMessages(prev => {

        if (!streamStarted) {
          return prev.slice(0, -1)
        }

        const last = prev[prev.length - 1]

        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -2)
        }

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
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Loader2
          size={20}
          color="var(--orange)"
          strokeWidth={1.5}
          style={{
            animation: 'spin 1s linear infinite'
          }}
        />

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg) }
            to   { transform: rotate(360deg) }
          }
        `}</style>
      </div>
    )
  }

  return (

    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        scrollBehavior: 'smooth',
        padding: '48px 20px 20px'
      }}>

        <div style={{
          maxWidth: 680,
          margin: '0 auto'
        }}>

          {messages.length === 0 && (

            <div style={{
              textAlign: 'center',
              paddingTop: 24,
              paddingBottom: 28
            }}>

              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                margin: '0 auto 16px',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>

                <Sun
                  size={20}
                  color="var(--orange)"
                  strokeWidth={1.5}
                />

              </div>

              <h2
                className="serif"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--white)',
                  marginBottom: 8
                }}
              >
                Namaste
                {profile?.full_name
                  ? `, ${profile.full_name.split(' ')[0]}`
                  : ''
                } 🙏
              </h2>

              <p style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                maxWidth: 360,
                margin: '0 auto 24px'
              }}>
                {profile?.date_of_birth
                  ? 'Your Kundali is ready. Ask me anything about your chart, life path, or timing.'
                  : 'Complete your birth details in Profile to unlock personalised readings.'
                }
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                maxWidth: 420,
                margin: '0 auto'
              }}>

                {SUGGESTED.map(q => (

                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      textAlign: 'left',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      lineHeight: 1.4,
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'rgba(249,115,22,0.25)'
                      el.style.background = 'rgba(249,115,22,0.05)'
                      el.style.color = '#FDBA74'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'rgba(255,255,255,0.07)'
                      el.style.background = 'rgba(255,255,255,0.03)'
                      el.style.color = 'var(--text-secondary)'
                    }}
                  >
                    {q}
                  </button>
                ))}

              </div>

            </div>
          )}

          {messages.map((m, i) => {

            const isLastAssistant =
              m.role === 'assistant' &&
              i === messages.length - 1

            const showCursor =
              isLastAssistant &&
              isStreaming

            return (

              <MotionDiv
                  key={i}
                  initial={{
                    opacity: 0,
                    y: 6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.18,
                    ease: 'easeOut',
                  }}
                  style={{
                  display: 'flex',
                  marginBottom: 16,
                  justifyContent: m.role === 'user'
                    ? 'flex-end'
                    : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 10
                }}
              >

                {m.role === 'assistant' && (

                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 2,
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>

                    <Sun
                      size={12}
                      color="var(--orange)"
                      strokeWidth={1.5}
                    />

                  </div>
                )}

                <div style={{
                  maxWidth: '76%',
                  willChange: 'transform, opacity',
                  transform: 'translateZ(0)',
                  padding: '11px 15px',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: m.role === 'user'
                    ? '16px 16px 4px 16px'
                    : '4px 16px 16px 16px',
                  background: m.role === 'user'
                    ? 'rgba(249,115,22,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    m.role === 'user'
                      ? 'rgba(249,115,22,0.2)'
                      : 'rgba(255,255,255,0.07)'
                  }`,
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: m.role === 'user'
                    ? '#FDBA74'
                    : 'var(--text-primary)',
                  whiteSpace: m.role === 'user'
                    ? 'pre-wrap'
                    : 'normal',
                  wordBreak: 'break-word'
                }}>

                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={mdComponents}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}

                  {showCursor && (
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--orange)',
                      marginTop: 6,
                      animation: 'blink 1s ease-in-out infinite'
                    }} />
                  )}

                </div>

              </MotionDiv>
            )
          })}

          {/* Loading dots */}
          {loading && (

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 16
            }}>

              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>

                <Sun
                  size={12}
                  color="var(--orange)"
                  strokeWidth={1.5}
                />

              </div>

              <div style={{
                padding: '12px 16px',
                borderRadius: '4px 16px 16px 16px',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                gap: 5,
                alignItems: 'center'
              }}>

                {[0,1,2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--orange)',
                      opacity: 0.7,
                      animation: 'bounce 1.4s ease-in-out infinite',
                      transform: 'translateZ(0)',
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}

              </div>

            </div>
          )}

          {error && (

            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              marginBottom: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#FCA5A5',
              fontSize: 13
            }}>
              {error} — please try again.
            </div>
          )}

          <div ref={bottomRef} />

        </div>

      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        padding: '10px 16px 14px',
        background: 'rgba(12,12,12,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>

        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end'
        }}>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your astrologer..."
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '11px 15px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.5,
              transition: 'border-color 0.2s, opacity 0.2s',
              minHeight: 44,
              maxHeight: 120,
              opacity: isStreaming ? 0.5 : 1,
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--orange)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || isStreaming}
            className="btn-primary"
            style={{
              padding: '11px 13px',
              borderRadius: 12,
              flexShrink: 0
            }}
          >

            {loading
              ? (
                <Loader2
                  size={15}
                  strokeWidth={1.5}
                  style={{
                    animation: 'spin 1s linear infinite'
                  }}
                />
              )
              : (
                <Send
                  size={15}
                  strokeWidth={1.5}
                />
              )
            }

          </button>

        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 8
        }}>
          {isStreaming
            ? 'Receiving response…'
            : 'Enter to send · Shift+Enter for new line'
          }
        </p>

      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100% {
            transform: translateY(0)
          }
          40% {
            transform: translateY(-5px)
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg)
          }
          to {
            transform: rotate(360deg)
          }
        }

        @keyframes blink {
          0%,100% {
            opacity: 1
          }
          50% {
            opacity: 0
          }
        }
      `}</style>

    </div>
  )
}