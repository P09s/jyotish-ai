import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jyotish AI — Your Vedic Astrology Guide',
  description:
    'AI-powered Vedic astrology based on your personal Kundali',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${inter.className} smooth-render`}
        style={{
          overflowX: 'hidden',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div
          className="gpu"
          style={{
            minHeight: '100vh',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  )
}