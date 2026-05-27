import Link from 'next/link'
import {
  Sparkles, MapPin, Clock, MessageCircle, Star,
  Moon, Sun, TrendingUp, Heart, ChevronRight, Zap
} from 'lucide-react'
import { MotionDiv } from '@/app/components/motion-wrapper'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <div className="stars" />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(12,12,12,0.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={18} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--white)' }}>Jyotish AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login">
            <button className="btn-ghost" style={{ fontSize: 13, padding: '7px 16px' }}>Sign in</button>
          </Link>
          <Link href="/signup">
            <button className="btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>Get started free</button>
          </Link>
        </div>
      </nav>
      
      {/* ── Hero ── */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px', textAlign: 'center',
        position: 'relative', zIndex: 1
      }}>
        {/* Eyebrow pill */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.05,
            duration: 0.3,
          }}
        >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
          padding: '6px 16px', borderRadius: 100,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)'
        }}>
          <Sparkles size={12} color="var(--orange)" strokeWidth={1.5} />
          <span style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', fontWeight: 400, textTransform: 'uppercase' }}>
            Vedic Astrology · AI Powered
          </span>
        </div>
        </MotionDiv>

        {/* Kundali SVG — fixed: transparent fill, visible strokes */}
        <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 40 }}>
          <svg viewBox="0 0 180 180" width="180" height="180" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
            <defs>
              <style>{`
                @keyframes kspin  { to { transform: rotate(360deg);  } }
                @keyframes krspin { to { transform: rotate(-360deg); } }
                @keyframes kpulse { 0%,100%{opacity:.5} 50%{opacity:1} }
                .kr1 { transform-origin:90px 90px; animation: kspin  60s linear infinite; }
                .kr2 { transform-origin:90px 90px; animation: krspin 42s linear infinite; }
                .kr3 { transform-origin:90px 90px; animation: kspin  44s linear infinite; }
                .kcore { animation: kpulse 3s ease-in-out infinite; }
              `}</style>
            </defs>

            {/* Outer ring */}
            <g className="kr3">
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="1" />
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
                const r = deg * Math.PI / 180
                return <circle key={i} cx={90 + 80*Math.cos(r)} cy={90 + 80*Math.sin(r)}
                  r={i % 3 === 0 ? 3 : 1.5}
                  fill={i % 3 === 0 ? '#F97316' : 'rgba(249,115,22,0.5)'} />
              })}
            </g>

            {/* Mid ring */}
            <g className="kr2">
              <circle cx="90" cy="90" r="57" fill="none" stroke="rgba(249,115,22,0.2)" strokeWidth="1" strokeDasharray="3 7" />
              {[0,45,90,135,180,225,270,315].map((deg, i) => {
                const r = deg * Math.PI / 180
                return <circle key={i} cx={90 + 57*Math.cos(r)} cy={90 + 57*Math.sin(r)}
                  r="2.5" fill={i % 2 === 0 ? '#F97316' : 'rgba(255,255,255,0.6)'} />
              })}
            </g>

            {/* Inner ring */}
            <g className="kr1">
              <circle cx="90" cy="90" r="34" fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth="1" />
              {[0,60,120,180,240,300].map((deg, i) => {
                const r = deg * Math.PI / 180
                return <circle key={i} cx={90 + 34*Math.cos(r)} cy={90 + 34*Math.sin(r)}
                  r="2" fill="#F97316" />
              })}
            </g>

            {/* Core — no fill, just stroke ring + symbol */}
            <g className="kcore">
              <circle cx="90" cy="90" r="16" fill="rgba(249,115,22,0.1)" stroke="#F97316" strokeWidth="1.5" />
              <text x="90" y="95" textAnchor="middle" fontSize="16"
                fill="#F97316" fontFamily="serif" fontWeight="400">☉</text>
            </g>
          </svg>

          {/* Ambient glow */}
          <div style={{
            position: 'absolute', inset: -30, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 68%)',
            zIndex: -1, pointerEvents: 'none'
          }} />
        </div>

        {/* Heading */}
        <h1 className="serif" style={{
          fontSize: 'clamp(44px, 8.5vw, 72px)', fontWeight: 600,
          lineHeight: 1.05, letterSpacing: '-0.02em',
          color: 'var(--white)', marginBottom: 18, maxWidth: 580
        }}>
          Your stars,<br />
          <span style={{ color: 'var(--orange)' }}>decoded by AI</span>
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75,
          maxWidth: 440, marginBottom: 10, fontWeight: 300
        }}>
          Enter your birth details once. Get deep, personalised Vedic astrology guidance on career, relationships, health, and destiny.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 40, letterSpacing: '0.03em' }}>
          Based on your unique Kundali · Powered by Claude AI · Free forever
        </p>

        <Link href="/signup">
          <button className="btn-primary" style={{ fontSize: 15, padding: '14px 36px', borderRadius: 12, gap: 8 }}>
            Create your free Kundali
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </Link>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>No credit card · 2 minutes · All devices</p>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 32, marginTop: 52,
          flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {[['2,400+','Kundalis created'],['9','Planets tracked'],['4.9★','Avg. rating']].map(([n, l], i) => (
            <MotionDiv
            key={l}
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3 + i * 0.08,
              duration: 0.25,
            }}
            style={{ textAlign: 'center' }}
            >
            <div key={l} style={{ textAlign: 'center' }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--orange)' }}>{n}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: 2 }}>{l}</div>
            </div>
            </MotionDiv>
          ))}
        </div>
      </section>
      </MotionDiv>

      {/* ── Curved divider down ── */}
      <div style={{ marginTop: -2, lineHeight: 0, position: 'relative', zIndex: 1 }}>
        <svg viewBox="0 0 1440 60" width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path d="M0,0 Q720,60 1440,0 L1440,60 L0,60 Z" fill="rgba(249,115,22,0.04)" />
          <path d="M0,0 Q720,60 1440,0" fill="none" stroke="rgba(249,115,22,0.12)" strokeWidth="1" />
        </svg>
      </div>

      {/* ── How it works — horizontal flow ── */}
      <MotionDiv
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
      >
      <section style={{ padding: '72px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>How it works</p>
          <h2 className="serif" style={{ textAlign: 'center', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 600, color: 'var(--white)', marginBottom: 52 }}>
            Three steps to clarity
          </h2>

          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 28, left: '16.5%', right: '16.5%', height: 1,
              background: 'linear-gradient(90deg, rgba(249,115,22,0.3), rgba(249,115,22,0.15), rgba(249,115,22,0.3))',
              zIndex: 0
            }} />

            {[
              { icon: <MapPin size={20} color="var(--orange)" strokeWidth={1.5} />, n: '01', title: 'Enter birth details', body: 'Date, time, and place of birth. Takes under 2 minutes.' },
              { icon: <Moon size={20} color="var(--orange)" strokeWidth={1.5} />, n: '02', title: 'We compute your Kundali', body: 'Planetary positions, house placements, and Dasha — calculated instantly.' },
              { icon: <MessageCircle size={20} color="var(--orange)" strokeWidth={1.5} />, n: '03', title: 'Ask anything', body: 'Chat with your personal AI astrologer in plain language.' },
            ].map(({ icon, n, title, body }) => (
              <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 16px', position: 'relative', zIndex: 1 }}>
                {/* Icon circle */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(12,12,12,0.9)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, flexShrink: 0
                }}>{icon}</div>
                <div className="serif" style={{ fontSize: 11, color: 'rgba(249,115,22,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>{n}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </MotionDiv>

      {/* ── Curved divider up ── */}
      <div style={{ lineHeight: 0, position: 'relative', zIndex: 1 }}>
        <svg viewBox="0 0 1440 50" width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path d="M0,50 Q720,0 1440,50 L1440,0 L0,0 Z" fill="rgba(249,115,22,0.03)" />
          <path d="M0,50 Q720,0 1440,50" fill="none" stroke="rgba(249,115,22,0.1)" strokeWidth="1" />
        </svg>
      </div>

      {/* ── Bento features grid ── */}
      <MotionDiv
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45 }}
      >
      <section
        style={{
          padding: '72px 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--orange)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            What's inside
          </p>

          <h2
            className="serif"
            style={{
              textAlign: 'center',
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 600,
              color: 'var(--white)',
              marginBottom: 40,
            }}
          >
            Everything your Kundali holds
          </h2>

          {/* GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'auto auto',
              gap: 12,
            }}
          >
            {/* Lagna */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              style={{
                gridColumn: 'span 2',
              }}
            >
              <div
                className="card"
                style={{
                  padding: '28px 28px',
                  display: 'flex',
                  gap: 20,
                  alignItems: 'flex-start',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: 'rgba(249,115,22,0.1)',
                    border:
                      '1px solid rgba(249,115,22,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sun
                    size={20}
                    color="var(--orange)"
                    strokeWidth={1.5}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    Lagna Chart
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      lineHeight: 1.65,
                    }}
                  >
                    Your rising sign, planetary
                    positions across all 12 houses.
                    The complete picture of who you
                    are and how the world sees you.
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Navamsa */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="card"
                style={{
                  padding: '24px 20px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    marginBottom: 16,
                    background: 'rgba(249,115,22,0.08)',
                    border:
                      '1px solid rgba(249,115,22,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Heart
                    size={18}
                    color="var(--orange)"
                    strokeWidth={1.5}
                  />
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  Navamsa
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  Marriage & soul purpose chart
                </div>
              </div>
            </MotionDiv>

            {/* AI Astrologer */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              style={{
                gridRow: 'span 2',
              }}
            >
              <div
                className="card"
                style={{
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      marginBottom: 20,
                      background: 'rgba(249,115,22,0.1)',
                      border:
                        '1px solid rgba(249,115,22,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageCircle
                      size={20}
                      color="var(--orange)"
                      strokeWidth={1.5}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 8,
                    }}
                  >
                    AI Astrologer
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                    }}
                  >
                    Ask anything in plain language.
                    Career, marriage, health, timing
                    — your personal guide answers
                    with Kundali context.
                  </div>
                </div>

                {/* Chat Preview */}
                <div style={{ marginTop: 24 }}>
                  {[
                    {
                      q: true,
                      t: 'When is a good time to change careers?',
                    },
                    {
                      q: false,
                      t: 'Saturn enters your 10th house in late 2025...',
                    },
                  ].map(({ q, t }, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 8,
                        padding: '8px 12px',
                        borderRadius: 10,
                        fontSize: 11,
                        background: q
                          ? 'rgba(249,115,22,0.08)'
                          : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${
                          q
                            ? 'rgba(249,115,22,0.15)'
                            : 'rgba(255,255,255,0.07)'
                        }`,
                        color: q
                          ? '#FDBA74'
                          : 'var(--text-secondary)',
                        textAlign: q ? 'right' : 'left',
                        lineHeight: 1.5,
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </MotionDiv>

            {/* Vimshottari */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="card"
                style={{
                  padding: '24px 20px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    marginBottom: 16,
                    background: 'rgba(249,115,22,0.08)',
                    border:
                      '1px solid rgba(249,115,22,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp
                    size={18}
                    color="var(--orange)"
                    strokeWidth={1.5}
                  />
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  Vimshottari Dasha
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  Life timeline & planetary periods
                </div>
              </div>
      </MotionDiv>

            {/* 9 Grahas */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="card"
                style={{
                  padding: '24px 20px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    marginBottom: 16,
                    background: 'rgba(249,115,22,0.08)',
                    border:
                      '1px solid rgba(249,115,22,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star
                    size={18}
                    color="var(--orange)"
                    strokeWidth={1.5}
                  />
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  9 Grahas
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  All planetary influences mapped
                </div>
              </div>
            </MotionDiv>

            {/* Instant */}
            <MotionDiv
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="card"
                style={{
                  padding: '24px 20px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    marginBottom: 16,
                    background: 'rgba(249,115,22,0.08)',
                    border:
                      '1px solid rgba(249,115,22,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap
                    size={18}
                    color="var(--orange)"
                    strokeWidth={1.5}
                  />
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
                  }}
                >
                  Instant results
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  Chart computed in seconds
                </div>
              </div>
            </MotionDiv>
          </div>
        </div>
      </section>
      </MotionDiv>

      {/* ── Final CTA ── */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4 }}
      >
      <section style={{ padding: '60px 24px 100px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          maxWidth: 480, margin: '0 auto', padding: '48px 32px',
          borderRadius: 24,
          background: 'rgba(249,115,22,0.04)',
          border: '1px solid rgba(249,115,22,0.15)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Ambient shape */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <Sun size={28} color="var(--orange)" strokeWidth={1.5} style={{ marginBottom: 20 }} />
          <h2 className="serif" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 600, color: 'var(--white)', marginBottom: 12 }}>
            Ready to read your stars?
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
            Join thousands of seekers who've unlocked the ancient wisdom of Jyotish with modern AI.
          </p>
          <Link href="/signup">
            <button className="btn-primary" style={{ fontSize: 15, padding: '13px 36px' }}>
              Create your Kundali — it's free →
            </button>
          </Link>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--orange)', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </section>
      </MotionDiv>

      {/* ── Footer ── */}
      <footer style={{
        padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={14} color="var(--orange)" strokeWidth={1.5} />
          <span className="serif" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Jyotish AI</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rooted in Vedic tradition · Powered by modern AI</p>
      </footer>
    </div>
  )
}