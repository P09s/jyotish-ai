import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DAIVAM AI — Vedic Kundali Chart Generator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  // 1. Fetch the image directly as an ArrayBuffer (The official Next.js Edge method)
  const logoData = await fetch(
    new URL('../public/logo-full.png', import.meta.url)
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          background: '#060608',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Ambient Glow */}
        <div style={{
          position: 'absolute',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 60%)',
          display: 'flex',
        }} />

        {/* 2. Pass the ArrayBuffer to src. Removed objectFit and display: flex! */}
        <img 
          src={logoData as any} 
          height={280}
          style={{ marginBottom: 40 }} 
        />

        <div style={{
          fontSize: 22, color: 'rgba(255,255,255,0.6)',
          textAlign: 'center', display: 'flex', letterSpacing: '0.02em'
        }}>
          Enter your birth details. Get your chart + personalized Jyotish guidance.
        </div>
        
        <div style={{
          position: 'absolute', bottom: 40,
          fontSize: 16, color: 'rgba(249,115,22,0.4)',
          display: 'flex', letterSpacing: '0.05em',
        }}>
          daivam.vercel.app
        </div>
      </div>
    ),
    { ...size }
  )
}