import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Daivam — Vedic Kundali Chart Generator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0C0C0C',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
          display: 'flex',
        }} />

        <div style={{ fontSize: 72, marginBottom: 16, display: 'flex' }}>☉</div>

        <div style={{
          fontSize: 64, fontWeight: 600, color: '#FFFFFF',
          marginBottom: 8, display: 'flex', letterSpacing: '-1px',
        }}>
          Daivam
        </div>

        <div style={{
          fontSize: 22, color: 'rgba(249,115,22,0.8)',
          marginBottom: 4, display: 'flex', letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          दैवं — Of the Divine
        </div>

        <div style={{
          fontSize: 24, color: '#F97316',
          marginBottom: 24, display: 'flex',
        }}>
          Free Vedic Kundali · AI Astrologer
        </div>

        <div style={{
          fontSize: 18, color: 'rgba(255,255,255,0.45)',
          maxWidth: 680, textAlign: 'center', display: 'flex',
        }}>
          Enter your birth details. Get your chart + personalized Jyotish guidance.
        </div>

        <div style={{
          position: 'absolute', bottom: 40,
          fontSize: 16, color: 'rgba(249,115,22,0.5)',
          display: 'flex', letterSpacing: '0.05em',
        }}>
          daivam.app
        </div>
      </div>
    ),
    { ...size }
  )
}