'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import Image from 'next/image'
import { Sun, Mail, Lock, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { MotionDiv, PageTransition } from '@/app/components/motion-wrapper'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import HelpButton from '@/app/components/HelpButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginClient() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <PageTransition>
      <style>{`
        .login-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 88px 20px 48px;
          box-sizing: border-box;
          position: relative;
        }
        .login-box {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .login-card-inner {
          padding: 28px 28px 24px;
        }
        @media (max-width: 480px) {
          .login-root {
            justify-content: flex-start;
            padding-top: 100px;
          }
          .login-card-inner {
            padding: 22px 18px 20px;
          }
          .login-h1 {
            font-size: 26px !important;
          }
        }
        @media (max-width: 360px) {
          .login-root {
            padding-left: 14px;
            padding-right: 14px;
          }
        }
      `}</style>

      <div className="landing-page login-root">
        <div className="stars" />

        <nav className="lp-nav" role="navigation" aria-label="Main navigation">
          <Link href="/" className="lp-nav-brand" aria-label="Daivam home">
            <Image 
              src="/logo.png" 
              alt="Daivam Logo" 
              width={24} 
              height={24} 
              priority 
            />
            <span className="lp-nav-name">DAIVAM AI</span>
          </Link>
          <div className="lp-nav-actions">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-pill, rgba(128,128,128,0.08))',
              border: '1px solid var(--border)',
              borderRadius: 9999,
              overflow: 'hidden',
              height: 34,
              }}>
              <ThemeToggle showSeparator={true} />
              <HelpButton page="login" /> {/* You can change "login" to "signup" on the signup page */}
            </div>
          </div>
        </nav>

        {/* Ambient glow */}
        <div style={{
          position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Content */}
        <div className="login-box" style={{ position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              margin: '0 auto 20px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image 
                src="/logo.png" 
                alt="Daivam Logo" 
                width={24} 
                height={24}
                priority
              />
            </div>
            <h1 className="login-h1 serif" style={{
              fontSize: 30, fontWeight: 600,
              color: 'var(--white)', marginBottom: 8,
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sign in to your Kundali
            </p>
          </div>

          {/* Card */}
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="card login-card-inner">
              {error && (
                <MotionDiv
                  initial={{ x: -6 }}
                  animate={{ x: [6, -4, 3, -2, 0] }}
                  transition={{ duration: 0.32 }}
                >
                  <div className="banner-error" style={{ marginBottom: 20 }}>{error}</div>
                </MotionDiv>
              )}

              <form onSubmit={handleLogin}>
                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', pointerEvents: 'none',
                    }}>
                      <Mail size={14} color="var(--text-muted)" strokeWidth={1.5} />
                    </div>
                    <input
                      type="email" required className="input-field"
                      placeholder="you@example.com"
                      style={{ paddingLeft: 38, width: '100%', boxSizing: 'border-box' }}
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 24 }}>
                  <label className="field-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', pointerEvents: 'none',
                    }}>
                      <Lock size={14} color="var(--text-muted)" strokeWidth={1.5} />
                    </div>
                    <input
                      type="password" required className="input-field"
                      placeholder="Your password"
                      style={{ paddingLeft: 38, width: '100%', boxSizing: 'border-box' }}
                      value={password} onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    width: '100%', justifyContent: 'center',
                    padding: '13px', fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                >
                  {loading ? 'Signing in...' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      Sign in <ChevronRight size={16} strokeWidth={2} />
                    </span>
                  )}
                </motion.button>
              </form>
            </div>
          </MotionDiv>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link href="/signup" style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}>
              Create your Kundali →
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}