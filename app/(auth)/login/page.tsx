'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Sun, Mail, Lock, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  MotionDiv,
  PageTransition,
} from '@/app/components/motion-wrapper'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <PageTransition>
      <div className="relative min-h-screen flex items-center justify-center px-5">
      <div className="stars" />

      {/* Back to home */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '16px 24px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={14} color="var(--orange)" strokeWidth={1.5} />
          </div>
          <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>Jyotish AI</span>
        </Link>
      </div>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="relative z-10 w-full" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={22} color="var(--orange)" strokeWidth={1.5} />
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, color: 'var(--white)', marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sign in to your Kundali</p>
        </div>

        {/* Card */}
        <MotionDiv
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.25,
          }}
        >
          <div className="card" style={{ padding: '28px 28px 24px' }}>
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
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', pointerEvents: 'none'
                  }}>
                    <Mail size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                  </div>
                  <input
                    type="email" required className="input-field"
                    placeholder="you@example.com"
                    style={{ paddingLeft: 38 }}
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label className="field-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', pointerEvents: 'none'
                  }}>
                    <Lock size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                  </div>
                  <input
                    type="password" required className="input-field"
                    placeholder="Your password"
                    style={{ paddingLeft: 38 }}
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.99,
                }}
                type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
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