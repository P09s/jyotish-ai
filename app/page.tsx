// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import type { Metadata } from 'next'
import LandingScripts from '@/app/components/LandingScripts'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import '@/app/globals.css'

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
  </svg>
)

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(249,115,22,0.22)" strokeWidth="1.5" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
    <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
  </svg>
)

const FEATURES = [
  {
    wide: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
      </svg>
    ),
    title: 'Lagna Chart',
    body: 'Your rising sign, all 9 planets across 12 houses. The complete picture of who you are and how your life unfolds — rendered as a North Indian chart with full house interpretations.',
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    title: 'Navamsa (D9)',
    body: 'Marriage chart and soul purpose — the deeper layer of your destiny and spiritual calling.',
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: 'Vimshottari Dasha',
    body: 'Your 120-year life timeline. Know which planetary period you are in and what it activates.',
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Live Transits',
    body: "Today's planets over your natal chart. See what cosmic energies are active right now.",
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Daily Panchang',
    body: 'Tithi, Nakshatra, Yoga, Karana — auspicious timings tailored to your day and location.',
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'Kundali Matching',
    body: 'Ashtakoot Guna Milan — check compatibility with your partner across all 8 Kootas.',
  },
]

const TRUST_ITEMS = [
  'Vedic Kundali', 'Vimshottari Dasha', 'Lagna Chart', 'Navamsa D9',
  'All 9 Grahas', 'Nakshatra Analysis', 'Kundali Matching', 'Daily Panchang',
  'Career Timing', 'Marriage Guidance', 'Transit Analysis', 'AI Powered',
]

const KHOUSES = [
  { num: '12', planet: 'Ket',          corner: 'corner'  },
  { num: '1',  planet: 'Lag',          corner: ''        },
  { num: '2',  planet: 'Sun\u00A0Mer', corner: 'corner2' },
  { num: '11', planet: 'Sat',          corner: ''        },
  { num: '',   planet: '',             corner: 'center'  },
  { num: '3',  planet: 'Ven',          corner: ''        },
  { num: '10', planet: 'Mar',          corner: 'corner2' },
  { num: '9',  planet: 'Jup',          corner: ''        },
  { num: '4',  planet: 'Moon',         corner: 'corner'  },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="landing-page">

      {/* ── Navbar ── */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <Link href="/" className="lp-nav-brand" aria-label="Daivam home">
          <Image src="/logo.png" alt="Daivam Logo" width={24} height={24} priority />
          <span className="lp-nav-name">DAIVAM AI</span>
        </Link>
        <div className="lp-nav-links">
          <a href="#how" className="lp-nav-link">How it works</a>
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#demo" className="lp-nav-link">Live demo</a>
        </div>
        <div className="lp-nav-actions">
          <ThemeToggle />
          <span className="lp-nav-divider" aria-hidden="true" />
          <Link href="/login" className="btn-ghost nav-signin-btn">Sign in</Link>
          <Link href="/signup" className="btn-primary nav-cta-btn">
            <span>Get started</span><span className="hide-mobile">&nbsp;</span> <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <StarIcon />
            दैवम् &middot; Jyotish &middot; AI Astrologer
          </div>
          <span className="hero-shloka deva" aria-label="Bhagavad Gita 2.47 in Sanskrit">
            कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।<br />
            मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
          </span>
          <span className="hero-shloka-trans">
            Bhagavad Gita 2.47 — Act rightly; the stars reveal the path, not the chains.
          </span>
          <h1 className="hero-h1" id="hero-heading">
            Your chart.<br />
            <em>Your destiny.</em><br />
            Illuminated.
          </h1>
          <p className="hero-sub">
            Enter your birth details once. Receive deep, personal Vedic guidance on career,
            love, health and destiny — from an AI that truly understands Jyotish.
          </p>
          <div className="hero-cta-row">
            <Link href="/signup" className="btn-primary btn-primary-lg">
              Create your free Kundali <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-ghost-lg">Sign in</Link>
          </div>
          <p className="hero-note">
            Free forever &nbsp;<span>·</span>&nbsp;
            No credit card &nbsp;<span>·</span>&nbsp;
            2 minutes
          </p>
        </div>

        <div className="hero-right" aria-label="Animated Vedic birth chart">
          <div className="hero-chart-wrap">
            <div className="hero-chart-glow" aria-hidden="true" />
            <div className="orbit-ring orbit1" aria-hidden="true"><div className="orbit-dot" /></div>
            <div className="orbit-ring orbit2" aria-hidden="true"><div className="orbit-dot2" /></div>
            <div className="kundali-grid" role="img" aria-label="North Indian Vedic birth chart">
              {KHOUSES.map((h, i) =>
                h.corner === 'center' ? (
                  <div key={i} className="khouse center">
                    <span className="center-symbol deva" aria-label="Aum">ॐ</span>
                  </div>
                ) : (
                  <div key={i} className={`khouse ${h.corner}`}>
                    <span className="hnum">{h.num}</span>
                    <span className="planet">{h.planet}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust marquee ── */}
      <div className="trust-bar" aria-label="Feature highlights">
        <div className="trust-track" aria-hidden="true">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
            <span key={i} className="trust-item">
              <span className="trust-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="section reveal" id="how" aria-labelledby="how-heading">
        <p className="section-label">How it works</p>
        <h2 className="section-h2" id="how-heading">Three steps to <em>clarity</em></h2>
        <div className="steps-wrap">
          <div className="step reveal reveal-d1">
            <div className="step-num">01</div>
            <div className="step-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="step-title">Enter birth details</div>
            <div className="step-body">Date, time, and place of birth — takes under 2 minutes. Precision in input means precision in insight.</div>
          </div>
          <div className="step-arrow"><ChevronRight /></div>
          <div className="step reveal reveal-d2">
            <div className="step-num">02</div>
            <div className="step-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" /><path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="step-title">Your Kundali is cast</div>
            <div className="step-body">Planetary positions, house placements, Dasha cycles — computed instantly with Swiss Ephemeris precision.</div>
          </div>
          <div className="step-arrow"><ChevronRight /></div>
          <div className="step reveal reveal-d3">
            <div className="step-num">03</div>
            <div className="step-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="step-title">Ask anything</div>
            <div className="step-body">Chat in plain language. Career, love, timing — your AI astrologer answers using your complete chart context.</div>
          </div>
        </div>
      </section>

      {/* ── Chat demo ── */}
      <div className="chat-section reveal" id="demo" aria-label="Live AI demo">
        <div className="chat-inner">
          <p className="section-label">Live example</p>
          <h2 className="section-h2" style={{ maxWidth: 520, margin: '0 auto' }}>
            Ask anything.<br /><em>Your chart answers.</em>
          </h2>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--lp-text3)', marginTop: 16, lineHeight: 1.75, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Not generic horoscopes. Every answer drawn from{' '}
            <em style={{ color: 'rgba(253,186,116,0.8)', fontStyle: 'italic' }}>your exact Kundali</em>
            {' '}— planets, houses, Dasha, Nakshatra.
          </p>
          <div className="chat-window" role="region" aria-label="Sample conversation">
            <div className="chat-titlebar">
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Image src="/logo.png" alt="Daivam Logo" width={16} height={16} />
              </div>
              <span className="chat-name">DAIVAM AI Astrologer</span>
              <div className="online-pill">
                <span className="online-dot" aria-hidden="true" /> online
              </div>
            </div>
            <div className="chat-messages" id="chat-msgs">
              <div className="msg-user" id="lp-msg1" style={{ opacity: 0, transition: 'opacity 0.4s' }}>
                When is a good time to change careers?
              </div>
              <div className="msg-ai" id="lp-msg2" style={{ opacity: 0, transition: 'opacity 0.4s' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Image src="/logo.png" alt="Daivam Logo" width={16} height={16} />
                </div>
                <div className="msg-text" id="lp-msg2-text" />
              </div>
              <div className="msg-user" id="lp-msg3" style={{ opacity: 0, transition: 'opacity 0.4s' }}>
                What about marriage — is there a good period coming?
              </div>
              <div className="msg-ai" id="lp-msg4" style={{ opacity: 0, transition: 'opacity 0.4s' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Image src="/logo.png" alt="Daivam Logo" width={16} height={16} />
                </div>
                <div className="msg-text" id="lp-msg4-text" />
              </div>
            </div>
            <div className="chat-input-bar">
              <span className="chat-fake-input">Ask about your Nakshatra, health, or finances…</span>
              <div className="chat-send-btn" role="button" aria-label="Send message" tabIndex={0}>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="section reveal" id="features" aria-labelledby="features-heading">
        <p className="section-label">What&apos;s inside</p>
        <h2 className="section-h2" id="features-heading">Everything your<br /><em>Kundali holds</em></h2>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`f-card${f.wide ? ' wide' : ''}`} tabIndex={0}>
              <div className="f-icon" aria-hidden="true">{f.icon}</div>
              <div>
                <div className="f-title">{f.title}</div>
                <div className="f-body">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <div className="cta-section reveal">
        <div className="cta-box">
          <div className="cta-top-glow" aria-hidden="true" />
          <Image
            src="/logo-full.png"
            alt="Daivam Logo"
            width={120}
            height={120}
            style={{ margin: '0 auto 14px', display: 'block' }}
          />
          <span className="cta-shloka deva" aria-label="Bhagavad Gita 4.7 in Sanskrit">
            यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।<br />
            अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥
          </span>
          <h2 className="cta-h2">
            Your chart has been<br /><em>waiting since birth.</em>
          </h2>
          <p className="cta-body">
            The stars wrote your story at the moment you arrived. Discover what is written —
            with the clarity of ancient Jyotish and the precision of modern AI.
          </p>
          <Link href="/signup" className="btn-primary btn-primary-lg" style={{ display: 'inline-flex' }}>
            Begin your reading — it&apos;s free <ArrowRight size={16} />
          </Link>
          <p className="cta-signin">
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          FOOTER — Redesigned 2026
      ══════════════════════════════════════════════ */}
      <footer className="lp-footer">

        {/* Top: brand col | divider | link cols */}
        <div className="lp-footer-top">

          {/* Brand + social + newsletter */}
          <div className="lp-footer-brand-col">
            <Link href="/" className="footer-brand" aria-label="Daivam home">
              <Image
                src="/logo.png"
                alt="Daivam"
                width={28}
                height={28}
              />
              <span className="lp-footer-brand-name">DAIVAM AI</span>
            </Link>

            <p className="lp-footer-tagline">
              Ancient Jyotish wisdom,<br />illuminated by modern AI.
            </p>

            {/* Social — LinkedIn only for now */}
            <div className="lp-footer-social">
              <a
                href="https://linkedin.com/company/daivam-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-footer-social-btn"
                aria-label="Follow on LinkedIn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              <a
                href="mailto:hello@daivam.vercel.app"
                className="lp-footer-social-btn"
                aria-label="Email us"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </a>
            </div>

            {/* Newsletter micro-CTA */}
            <div className="lp-footer-newsletter">
              <p className="lp-footer-nl-label">Weekly forecast</p>
              <p className="lp-footer-nl-desc">
                Get your personalised planetary forecast every Monday morning.
              </p>
              <div className="lp-footer-nl-row">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="lp-footer-nl-input"
                  aria-label="Email address for weekly forecast"
                />
                <button className="lp-footer-nl-btn" type="button">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Vertical divider (desktop only) */}
          <div className="lp-footer-vdivider" aria-hidden="true" />

          {/* Link columns */}
          <div className="lp-footer-links-wrap">
            <div className="lp-footer-col">
              <p className="lp-footer-col-label">Product</p>
              <a href="#how" className="lp-footer-link">How it works</a>
              <a href="#features" className="lp-footer-link">Features</a>
              <a href="#demo" className="lp-footer-link">Live demo</a>
              <Link href="/signup" className="lp-footer-link">Create Kundali</Link>
            </div>
            <div className="lp-footer-col">
              <p className="lp-footer-col-label">Account</p>
              <Link href="/login" className="lp-footer-link">Sign in</Link>
              <Link href="/signup" className="lp-footer-link">Sign up free</Link>
              <Link href="/login" className="lp-footer-link">Dashboard</Link>
              <Link href="/login" className="lp-footer-link">Edit profile</Link>
            </div>
            <div className="lp-footer-col">
              <p className="lp-footer-col-label">Explore</p>
              <Link href="/login" className="lp-footer-link">Lagna Chart</Link>
              <Link href="/login" className="lp-footer-link">Daily Panchang</Link>
              <Link href="/login" className="lp-footer-link">Transits</Link>
              <Link href="/login" className="lp-footer-link">Kundali Matching</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="lp-footer-bottom">
          <span className="lp-footer-bottom-text">© 2026 DAIVAM AI. All rights reserved.</span>
          <span className="lp-footer-bottom-center">Rooted in Vedic tradition · Powered by modern AI</span>
          <div className="lp-footer-bottom-links">
            <Link href="/privacy" className="lp-footer-bottom-link">Privacy Policy</Link>
            <Link href="/terms" className="lp-footer-bottom-link">Terms of Service</Link>
          </div>
        </div>

      </footer>
      <LandingScripts />
    </div>
  )
}