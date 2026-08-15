// app/terms/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ThemeToggle } from '@/app/components/ThemeProvider'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Terms of Service — Daivam',
  description: 'Terms and conditions for using the Daivam Vedic astrology platform.',
  alternates: { canonical: 'https://daivam.vercel.app/terms' },
}

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export default function TermsPage() {
  return (
    <div className="landing-page legal-page">

      {/* Navbar */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <Link href="/" className="lp-nav-brand" aria-label="Daivam home">
          <Image src="/logo.png" alt="Daivam Logo" width={24} height={24} priority />
          <span className="lp-nav-name">DAIVAM AI</span>
        </Link>
        <div className="lp-nav-links">
          <a href="/#how" className="lp-nav-link">How it works</a>
          <a href="/#features" className="lp-nav-link">Features</a>
          <a href="/#demo" className="lp-nav-link">Live demo</a>
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

      <div className="legal-container">
        <span className="legal-eyebrow">Legal</span>
        <h1 className="legal-h1">Terms of Service</h1>
        <span className="legal-date">Last updated: 1 June 2026</span>
        <div className="legal-divider" />

        <div className="legal-highlight">
          Daivam provides astrological guidance for entertainment and self-reflection purposes.
          Our AI interpretations are not a substitute for professional advice in legal, medical,
          financial, or psychological matters.
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">1. Acceptance of terms</h2>
          <p className="legal-p">
            By creating an account or using the Daivam platform (&ldquo;Service&rdquo;), you agree to
            be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use
            the Service. These Terms apply to all users, including visitors, registered users,
            and subscribers.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">2. Description of <em>service</em></h2>
          <p className="legal-p">
            Daivam is an AI-powered Vedic astrology platform that generates personalised
            astrological charts (Kundali) and interpretations based on birth data you provide.
            The Service includes Lagna charts, Vimshottari Dasha timelines,
            live transit analysis, daily Panchang, and a conversational AI astrologer.
          </p>
          <p className="legal-p">
            We reserve the right to modify, suspend, or discontinue any feature of the Service
            at any time with reasonable notice.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">3. User accounts</h2>
          <ul className="legal-ul">
            <li>You must be at least 13 years old to create an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must provide accurate information when creating your account.</li>
            <li>You may not share your account with others or create accounts on behalf of third parties without their consent.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">4. Acceptable use</h2>
          <p className="legal-p">You agree not to:</p>
          <ul className="legal-ul">
            <li>Use the Service for any illegal purpose or in violation of applicable law.</li>
            <li>Attempt to reverse engineer, scrape, or extract data from the Service at scale.</li>
            <li>Use automated tools (bots, scrapers) to access or interact with the Service without our written permission.</li>
            <li>Upload or transmit malicious code, viruses, or harmful content.</li>
            <li>Attempt to gain unauthorised access to other users&apos; accounts or data.</li>
            <li>Use the Service to harass, impersonate, or harm others.</li>
            <li>Resell or sublicense access to the Service without our written consent.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">5. Astrological content — <em>important disclaimer</em></h2>
          <p className="legal-p">
            The astrological interpretations, predictions, and guidance provided by Daivam are
            generated by artificial intelligence and are intended solely for entertainment,
            self-reflection, and educational purposes.
          </p>
          <p className="legal-p">
            Daivam&apos;s content is <strong>not</strong> professional advice of any kind. You should not
            rely on Daivam for decisions relating to your health, mental health, finances, legal
            matters, safety, or the welfare of others. Always consult qualified professionals
            for matters of consequence.
          </p>
          <p className="legal-p">
            Astrology is not a scientifically validated predictive system. We make no claims
            about the accuracy of astrological interpretations, and outcomes described in your
            Kundali are not guaranteed.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">6. Intellectual property</h2>
          <p className="legal-p">
            All content, design, code, and materials on the Daivam platform are owned by
            Daivam Technologies and protected by copyright and other intellectual property laws.
          </p>
          <p className="legal-p">
            You retain ownership of the birth data and any other personal information you
            provide to us. By submitting content or data, you grant us a limited licence to
            use it solely for the purpose of providing the Service to you.
          </p>
          <p className="legal-p">
            The astrological interpretations generated for your Kundali are personal to you.
            You may save and share them for personal, non-commercial use. You may not republish
            or sell them as your own work.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">7. Free tier and paid features</h2>
          <p className="legal-p">
            The core Daivam experience — Kundali generation, basic chart views, and limited
            AI consultations — is provided free of charge. We may offer premium features for
            a subscription fee in the future. Any paid features will be clearly labelled and
            you will not be charged without explicit confirmation.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">8. Termination</h2>
          <p className="legal-p">
            You may delete your account at any time from your account settings. Upon deletion,
            your personal data will be permanently removed within 30 days, except where
            retention is required by law.
          </p>
          <p className="legal-p">
            We may suspend or terminate your account if you violate these Terms, with or
            without notice depending on the severity of the violation. We will endeavour to
            provide notice and an opportunity to remedy minor violations before terminating.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">9. Limitation of liability</h2>
          <p className="legal-p">
            To the fullest extent permitted by law, Daivam Technologies shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages arising
            from your use of or inability to use the Service, even if advised of the possibility
            of such damages.
          </p>
          <p className="legal-p">
            Our total liability to you for any claim arising out of or relating to these Terms
            or the Service shall not exceed the amount you paid us (if any) in the 12 months
            preceding the claim, or INR 1,000, whichever is greater.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">10. Governing law</h2>
          <p className="legal-p">
            These Terms are governed by the laws of India. Any disputes shall be subject to
            the exclusive jurisdiction of the courts of Chandigarh, India. If you are a
            consumer in another jurisdiction, mandatory consumer protection laws of your country
            may also apply.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">11. Changes to these terms</h2>
          <p className="legal-p">
            We may update these Terms from time to time. We will notify you of material changes
            by email and by posting a notice in the app at least 14 days in advance. Continued
            use of the Service after that date constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">12. Contact</h2>
          <p className="legal-p">
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:hello@daivam.vercel.app" className="legal-a">hello@daivam.vercel.app</a>.
          </p>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/privacy" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px' }}>
            Privacy Policy
          </Link>
          <Link href="/" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px' }}>
            ← Back to home
          </Link>
        </div>
      </div>

    </div>
  )
}