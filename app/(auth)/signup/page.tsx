'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import Image from 'next/image'
import { Sun, Mail, Lock, User, MapPin, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { MotionDiv, PageTransition } from '@/app/components/motion-wrapper'

type Step = 'account' | 'birth'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [tob, setTob] = useState('')
  const [pob, setPob] = useState('')
  const [gender, setGender] = useState('')
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setStep('birth'); setError('')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (signupError) throw signupError
      if (!data.user) throw new Error('Signup failed')
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        date_of_birth: dob,
        time_of_birth: tob || null,
        place_of_birth: pob,
        gender: gender || null,
        profile_complete: true,
        updated_at: new Date().toISOString()
      })
      if (profileError) throw profileError
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <PageTransition>
      <style>{`
        .signup-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 88px 20px 48px;
        }
        .signup-inner {
          width: 100%;
          max-width: 420px;
        }
        .signup-card {
          padding: 28px;
        }
        .signup-header h1 {
          font-size: 28px;
        }
        .dob-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .signup-actions {
          display: flex;
          gap: 10px;
        }
        .signup-actions .btn-ghost {
          flex: 1;
          justify-content: center;
        }
        .signup-actions .btn-primary {
          flex: 2;
          justify-content: center;
        }

        @media (max-width: 480px) {
          .signup-wrapper {
            padding: 80px 16px 40px;
            align-items: flex-start;
          }
          .signup-card {
            padding: 20px 16px !important;
          }
          .signup-header h1 {
            font-size: 24px !important;
          }
          .signup-header .sun-icon {
            width: 44px !important;
            height: 44px !important;
            margin-bottom: 14px !important;
          }
          .dob-grid {
            grid-template-columns: 1fr !important;
          }
          .signup-actions {
            flex-direction: column !important;
          }
          .signup-actions .btn-ghost,
          .signup-actions .btn-primary {
            flex: none !important;
            width: 100% !important;
          }
          /* Reorder: primary first on mobile */
          .signup-actions .btn-primary {
            order: -1;
          }
          .signup-submit-btn {
            font-size: 14px !important;
            padding: 12px !important;
          }
        }

        @media (max-width: 360px) {
          .signup-wrapper {
            padding: 76px 12px 32px;
          }
        }
      `}</style>

      <div className="relative signup-wrapper">
        <div className="stars" />

        {/* Back to home */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          padding: '14px 20px',
        }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Image 
              src="/logo.png" 
              alt="Daivam Logo" 
              width={24} 
              height={24}
              priority
            />
            <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>Daivam</span>
          </Link>
        </div>

        {/* Ambient glow */}
        <div style={{
          position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        <div className="signup-inner" style={{ position: 'relative', zIndex: 10 }}>

          {/* Header */}
          <div className="signup-header" style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="sun-icon" style={{
              width: 52, height: 52, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Image src="/logo.png" alt="Daivam" width={28} height={28} />
            </div>
            <h1 className="serif" style={{ fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
              {step === 'account' ? 'Create your Kundali' : 'Your birth details'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Step {step === 'account' ? '1' : '2'} of 2 —{' '}
              {step === 'account' ? 'Account details' : 'For accurate chart calculation'}
            </p>
          </div>

          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            <motion.div
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              style={{ flex: 1, height: 2, borderRadius: 2, background: 'var(--orange)' }}
            />
            <motion.div
              animate={{
                backgroundColor: step === 'birth' ? 'rgb(249,115,22)' : 'rgba(255,255,255,0.08)',
                scaleX: step === 'birth' ? 1 : 0.92,
                opacity: step === 'birth' ? 1 : 0.7,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ flex: 1, height: 2, borderRadius: 2, transformOrigin: 'left' }}
            />
          </div>

          <div className="card signup-card">
            {error && <div className="banner-error" style={{ marginBottom: 20 }}>{error}</div>}

            {step === 'account' ? (
              <MotionDiv initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
                <form onSubmit={handleAccountStep}>
                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label">Email address</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                        <Mail size={14} color="var(--text-muted)" strokeWidth={1.5} />
                      </div>
                      <input type="email" required className="input-field"
                        placeholder="you@example.com" style={{ paddingLeft: 38 }}
                        value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <label className="field-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                        <Lock size={14} color="var(--text-muted)" strokeWidth={1.5} />
                      </div>
                      <input type="password" required className="input-field"
                        placeholder="Minimum 6 characters" style={{ paddingLeft: 38 }}
                        value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary signup-submit-btn"
                    style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      Continue <ChevronRight size={16} strokeWidth={2} />
                    </span>
                  </button>
                </form>
              </MotionDiv>
            ) : (
              <MotionDiv initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
                <form onSubmit={handleSignup}>

                  {/* Full name */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label">Full name</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                        <User size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                      </div>
                      <input type="text" required className="input-field"
                        placeholder="As per birth records" style={{ paddingLeft: 38 }}
                        value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                  </div>

                  {/* DOB + TOB — stacks to 1 col on mobile */}
                  <div className="dob-grid">
                    <div>
                      <label className="field-label">Date of birth</label>
                      <input type="date" required className="input-field"
                        value={dob} onChange={e => setDob(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">
                        Time <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                      </label>
                      <input type="time" className="input-field"
                        value={tob} onChange={e => setTob(e.target.value)} />
                    </div>
                  </div>

                  {/* Place */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label">Place of birth</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                        <MapPin size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                      </div>
                      <input type="text" required className="input-field"
                        placeholder="City, State, Country" style={{ paddingLeft: 38 }}
                        value={pob} onChange={e => setPob(e.target.value)} />
                    </div>
                  </div>

                  {/* Gender */}
                  <div style={{ marginBottom: 20 }}>
                    <label className="field-label">
                      Gender <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                    </label>
                    <select className="input-field" value={gender}
                      onChange={e => setGender(e.target.value)} style={{ appearance: 'none' }}>
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Tip */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                    background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)'
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      ☉ Time of birth determines your Ascendant (Lagna). Even a 10-minute difference can change your rising sign.
                    </p>
                  </div>

                  {/* Actions — stacks on mobile, primary first */}
                  <div className="signup-actions">
                    <button type="button" className="btn-ghost"
                      onClick={() => setStep('account')}>
                      ← Back
                    </button>
                    <button type="submit" className="btn-primary signup-submit-btn"
                      disabled={loading}>
                      {loading ? 'Creating Kundali...' : 'Create my Kundali ✨'}
                    </button>
                  </div>

                </form>
              </MotionDiv>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
            {step === 'account' ? 'Already have an account? ' : 'Changed your mind? '}
            <Link href="/login" style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}