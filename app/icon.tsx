import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#0C0C0C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F97316"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          {/* Center circle */}
          <circle cx="12" cy="12" r="4" />
          {/* 8 rays */}
          <line x1="12" y1="2"  x2="12" y2="4"  />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="4"  y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.93"  y1="4.93"  x2="6.34"  y2="6.34"  />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <line x1="19.07" y1="4.93"  x2="17.66" y2="6.34"  />
          <line x1="6.34"  y1="17.66" x2="4.93"  y2="19.07" />
        </svg>
      </div>
    ),
    { ...size }
  )
}