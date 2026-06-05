// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/app/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

const BASE_URL = 'https://daivam.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'DAIVAM AI — Free Vedic Kundali Chart & AI Astrologer',
    template: '%s | DAIVAM AI',
  },
  description:
    'Generate your free Vedic Kundali chart instantly. Get AI-powered Jyotish insights on career, marriage, health & destiny based on your birth chart. North Indian chart, Vimshottari Dasha, 9 planets.',
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },

  keywords: [
    'kundali', 'free kundali', 'vedic astrology', 'jyotish', 'birth chart',
    'kundali chart', 'lagna chart', 'AI astrology', 'vimshottari dasha',
    'horoscope', 'nakshatra', 'online kundali', 'kundali matching',
    'north indian kundali', 'janam kundali', 'kundali online free',
    'daivam', 'daivam ai', 'daivam astrology',
  ],

  authors: [{ name: 'Parag Sharma', url: BASE_URL }],
  creator: 'Parag Sharma',
  publisher: 'DAIVAM AI',

  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BASE_URL,
    siteName: 'DAIVAM AI',
    title: 'DAIVAM AI — Free Vedic Kundali & AI Astrologer',
    description:
      'Enter your birth details. Get your Kundali chart + personalized Jyotish guidance powered by AI. Free forever.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DAIVAM AI — Vedic Kundali Chart Generator',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'DAIVAM AI — Free Vedic Kundali & AI Astrologer',
    description:
      'Generate your Kundali instantly. AI-powered Jyotish insights on career, relationships & destiny.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${BASE_URL}/#app`,
      name: 'Daivam',
      url: BASE_URL,
      description:
        'AI-powered Vedic astrology app that generates your Kundali chart and answers questions about career, marriage, health and destiny.',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '2400',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#org`,
      name: 'Daivam',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icon.png`,
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a Kundali chart?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A Kundali (or Janam Kundali) is a Vedic astrology birth chart that maps the positions of 9 planets across 12 houses at the time of your birth. It is used in Jyotish to understand personality, life events, and destiny.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Daivam free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Daivam is completely free. Enter your birth date, time, and place to instantly generate your Vedic Kundali chart and chat with the AI astrologer.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is Vimshottari Dasha?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Vimshottari Dasha is a 120-year planetary period cycle used in Vedic astrology to predict the timing of events in life. Each planet rules a period during which its themes and energies are most active.',
          },
        },
        {
          '@type': 'Question',
          name: 'How accurate is the Kundali calculation on Daivam?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Daivam uses precise astronomical calculations based on your exact birth date, time, and geographic coordinates. Accuracy depends on how precise your birth time is — even a 10-minute difference can shift your Ascendant sign.',
          },
        },
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/*
          ── Anti-flash script ──────────────────────────────────────────
          Runs synchronously before the page paints so there is no flash
          of the wrong theme. Reads localStorage first, falls back to the
          OS media query. Must be a raw <script> (not next/script) so it
          executes before React hydration.
          ──────────────────────────────────────────────────────────────
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var saved = localStorage.getItem('daivam-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
            `.trim(),
          }}
        />
      </head>
      <body
        className={`${inter.className} smooth-render`}
        style={{
          overflowX: 'hidden',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <ThemeProvider>
          <div className="gpu" style={{ minHeight: '100vh' }}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}