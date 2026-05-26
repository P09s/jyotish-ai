'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Sun, Mail, Lock, User, MapPin, ChevronRight } from 'lucide-react'

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
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12">
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
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="relative z-10 w-full" style={{ maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={22} color="var(--orange)" strokeWidth={1.5} />
          </div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
            {step === 'account' ? 'Create your Kundali' : 'Your birth details'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Step {step === 'account' ? '1' : '2'} of 2 —{' '}
            {step === 'account' ? 'Account details' : 'For accurate chart calculation'}
          </p>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 2, borderRadius: 2, background: 'var(--orange)' }} />
          <div style={{
            flex: 1, height: 2, borderRadius: 2,
            background: step === 'birth' ? 'var(--orange)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s'
          }} />
        </div>

        <div className="card" style={{ padding: '28px' }}>
          {error && <div className="banner-error" style={{ marginBottom: 20 }}>{error}</div>}

          {step === 'account' ? (
            <form onSubmit={handleAccountStep}>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex'
                  }}>
                    <Mail size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                  </div>
                  <input type="email" required className="input-field"
                    placeholder="you@example.com" style={{ paddingLeft: 38 }}
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label className="field-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex'
                  }}>
                    <Lock size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                  </div>
                  <input type="password" required className="input-field"
                    placeholder="Minimum 6 characters" style={{ paddingLeft: 38 }}
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  Continue <ChevronRight size={16} strokeWidth={2} />
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              {/* Full name */}
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Full name</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex'
                  }}>
                    <User size={14} color="rgba(250,250,249,0.3)" strokeWidth={1.5} />
                  </div>
                  <input type="text" required className="input-field"
                    placeholder="As per birth records" style={{ paddingLeft: 38 }}
                    value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
              </div>

              {/* DOB + TOB */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', display: 'flex'
                  }}>
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

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn-ghost"
                  onClick={() => setStep('account')} style={{ flex: 1, justifyContent: 'center' }}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? 'Creating Kundali...' : 'Create my Kundali ✨'}
                </button>
              </div>
            </form>
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
  )
}