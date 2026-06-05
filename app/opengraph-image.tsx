import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

// 🚨 We removed `export const runtime = 'edge'` to use the standard Node.js runtime!
// This gives you a 50MB limit instead of 1MB.

export const alt = 'DAIVAM AI — Vedic Kundali Chart Generator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  // 1. Read the image using standard Node.js
  const logoPath = join(process.cwd(), 'public', 'logo-full.png')
  const logoBuffer = readFileSync(logoPath)
  
  // 2. Convert to Base64 so the HTML img tag can read it instantly
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

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

        {/* 3. Use the Base64 string, keeping the clean CSS that Satori likes */}
        <img 
          src={logoBase64} 
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