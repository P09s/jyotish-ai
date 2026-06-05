// app/privacy/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Privacy Policy — Daivam',
  description: 'How Daivam collects, uses, and protects your personal information.',
  alternates: { canonical: 'https://daivam.vercel.app/privacy' },
}

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export default function PrivacyPage() {
  return (
    <div className="landing-page legal-page">

      {/* Navbar */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <Link href="/" className="lp-nav-brand" aria-label="Daivam home">
          <Image src="/logo.png" alt="Daivam Logo" width={24} height={24} priority />
          <span className="lp-nav-name">Daivam</span>
        </Link>
        <div className="lp-nav-actions">
          <ThemeToggle />
          <span className="lp-nav-divider" aria-hidden="true" />
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">
            Get started <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      <div className="legal-container">
        <span className="legal-eyebrow">Legal</span>
        <h1 className="legal-h1">Privacy Policy</h1>
        <span className="legal-date">Last updated: 1 June 2026</span>
        <div className="legal-divider" />

        <div className="legal-highlight">
          Your birth data is personal. We treat it that way. We never sell your data, never share
          it with advertisers, and you can delete your account and all associated data at any time.
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">1. Who we are</h2>
          <p className="legal-p">
            Daivam (&ldquo;Daivam&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a Vedic astrology platform
            that uses artificial intelligence to provide personalised astrological guidance. We are
            operated by Daivam Technologies. Our primary contact is{' '}
            <a href="mailto:hello@daivam.vercel.app" className="legal-a">hello@daivam.vercel.app</a>.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">2. What data we collect</h2>
          <p className="legal-p">We collect only what is necessary to provide our service:</p>
          <ul className="legal-ul">
            <li><strong>Account data:</strong> email address, name, and password (stored as a secure hash).</li>
            <li><strong>Birth data:</strong> date, time, and place of birth that you enter to generate your Kundali.</li>
            <li><strong>Usage data:</strong> pages visited, features used, and session duration — collected anonymously to improve the product.</li>
            <li><strong>Device data:</strong> browser type, operating system, and IP address for security and fraud prevention.</li>
            <li><strong>Communications:</strong> if you contact us by email, we retain that correspondence.</li>
          </ul>
          <p className="legal-p">
            We do <strong>not</strong> collect payment card information directly — payments, if any, are processed
            by third-party providers (e.g. Stripe) under their own privacy policies.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">3. How we use your data</h2>
          <ul className="legal-ul">
            <li>To generate your Kundali and provide AI-powered astrological interpretations.</li>
            <li>To maintain and improve the Daivam platform.</li>
            <li>To send you service-related emails (account confirmation, security alerts).</li>
            <li>To send you the weekly forecast newsletter, if you subscribed — you can unsubscribe at any time.</li>
            <li>To comply with legal obligations and prevent fraud or abuse.</li>
          </ul>
          <p className="legal-p">
            We do <strong>not</strong> use your birth data to train AI models without explicit consent, and we do
            not use your personal data for targeted advertising.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">4. How we store and protect your data</h2>
          <p className="legal-p">
            Your data is stored on servers provided by Supabase (PostgreSQL), which operates
            data centres in the EU and US. All data is encrypted in transit (TLS 1.3) and at rest
            (AES-256). Access to production databases is restricted to authorised engineers and
            protected by multi-factor authentication.
          </p>
          <p className="legal-p">
            We retain your account data for as long as your account is active, plus a 30-day grace
            period after deletion to allow account recovery.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">5. Sharing your data</h2>
          <p className="legal-p">We share your data only with:</p>
          <ul className="legal-ul">
            <li><strong>Infrastructure providers</strong> (Supabase, Vercel, Anthropic API) necessary to operate the service — under data processing agreements.</li>
            <li><strong>Analytics tools</strong> (e.g. Posthog, anonymised) that help us understand product usage.</li>
            <li><strong>Legal authorities</strong> if required by applicable law or a valid court order.</li>
          </ul>
          <p className="legal-p">
            We never sell, rent, or broker your personal data to third parties.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">6. Your <em>rights</em></h2>
          <p className="legal-p">You have the right to:</p>
          <ul className="legal-ul">
            <li><strong>Access:</strong> request a copy of all personal data we hold about you.</li>
            <li><strong>Correction:</strong> update or correct inaccurate data via your account settings.</li>
            <li><strong>Deletion:</strong> delete your account and all associated data from your account settings, or by emailing us.</li>
            <li><strong>Portability:</strong> receive your data in a machine-readable format (JSON/CSV).</li>
            <li><strong>Objection:</strong> object to processing for direct marketing at any time.</li>
            <li><strong>Withdraw consent:</strong> unsubscribe from marketing emails via the unsubscribe link in any email.</li>
          </ul>
          <p className="legal-p">
            To exercise any right, email us at{' '}
            <a href="mailto:privacy@daivam.vercel.app" className="legal-a">privacy@daivam.vercel.app</a>.
            We will respond within 30 days.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">7. Cookies</h2>
          <p className="legal-p">
            We use only essential cookies: session tokens (to keep you logged in) and a theme
            preference cookie. We do not use third-party advertising cookies. You can clear
            cookies at any time via your browser settings, which will log you out.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">8. Children&apos;s privacy</h2>
          <p className="legal-p">
            Daivam is not directed at children under 13. We do not knowingly collect personal
            data from anyone under 13. If you believe a child has provided us with personal data,
            contact us and we will delete it promptly.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">9. Changes to this policy</h2>
          <p className="legal-p">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by email and by displaying a notice in the app at least 14 days before the
            changes take effect. Continued use of Daivam after that date constitutes acceptance
            of the updated policy.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">10. Contact</h2>
          <p className="legal-p">
            Questions about this policy? Reach us at{' '}
            <a href="mailto:privacy@daivam.vercel.app" className="legal-a">privacy@daivam.vercel.app</a> or
            write to us at: Daivam Technologies, India.
          </p>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/terms" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px' }}>
            Terms of Service
          </Link>
          <Link href="/" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px' }}>
            ← Back to home
          </Link>
        </div>
      </div>

    </div>
  )
}