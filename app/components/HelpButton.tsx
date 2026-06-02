'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type PageName = 'dashboard' | 'kundali' | 'milan' | 'panchang' | 'profile' | 'transits' | 'chat'

const HELP_DATA: Record<PageName, { title: string; content: React.ReactNode }> = {
  dashboard: {
    title: 'Dashboard Overview',
    content: (
      <>
        <p style={{ marginBottom: 12 }}><strong>Chart Active:</strong> If the green dot is pulsing, your birth details are saved and your personalized astrological chart is ready across all tools.</p>
        <p><strong>Quick Access:</strong> Navigate to your daily Panchang, live planetary transits, or detailed Kundali from the main grid.</p>
      </>
    )
  },
  kundali: {
    title: 'Reading Your Kundali',
    content: (
      <>
        <p style={{ marginBottom: 12 }}><strong>Lagna Chart:</strong> The North Indian diamond chart maps your 12 houses. The top center diamond is the 1st House (Ascendant/Lagna), representing the self.</p>
        <p style={{ marginBottom: 12 }}><strong>Vimshottari Dasha:</strong> This is your planetary timeline. It shows which planet is currently influencing your life period (Mahadasha) and sub-period (Antardasha).</p>
      </>
    )
  },
  panchang: {
    title: 'Understanding Panchang',
    content: (
      <>
        <p style={{ marginBottom: 12 }}>Panchang tracks five elements of time: <strong>Vara</strong> (Weekday), <strong>Tithi</strong> (Lunar Day), <strong>Nakshatra</strong> (Moon Star), <strong>Yoga</strong> (Sun/Moon angle), and <strong>Karana</strong> (Half-Tithi).</p>
        <p><strong>Muhurtas:</strong> These are specific time windows in the day. <em>Abhijit</em> is generally highly auspicious, while <em>Rahu Kaal</em> is considered challenging for starting new ventures.</p>
      </>
    )
  },
  transits: {
    title: 'Live Transits',
    content: (
      <>
        <p style={{ marginBottom: 12 }}>Transits (Gochar) show where the planets are in the sky <em>right now</em>, superimposed over your fixed birth chart.</p>
        <p><strong>Active Influences:</strong> Pay special attention to slow-moving planets like Saturn, Jupiter, Rahu, and Ketu, as their transits mark major life shifts.</p>
      </>
    )
  },
  milan: {
    title: 'Kundali Matching',
    content: (
      <>
        <p style={{ marginBottom: 12 }}>We use the traditional <strong>Ashtakoot system</strong>, which compares 8 specific categories (Kootas) between two charts to evaluate relationship compatibility.</p>
        <p>A score of 18 out of 36 is the traditional minimum for marriage, but the AI narrative provides deeper context beyond just the numbers.</p>
      </>
    )
  },
  profile: {
    title: 'Why Precision Matters',
    content: (
      <>
        <p style={{ marginBottom: 12 }}>Vedic astrology is highly mathematically sensitive. The Ascendant (Lagna) changes sign roughly every 2 hours.</p>
        <p>Even a 5 to 10-minute inaccuracy in your birth time can shift your divisional charts (like the Navamsha) and alter your predictions significantly.</p>
      </>
    )
  },
  chat: {
    title: 'AI Astrologer',
    content: (
      <>
        <p style={{ marginBottom: 12 }}>Your AI Astrologer reads your exact planetary degrees, dashas, and current transits.</p>
        <p><strong>Tip:</strong> Ask specific questions like <em>"What does my current Jupiter dasha mean for my career?"</em> or <em>"When will my Sade Sati end?"</em></p>
      </>
    )
  }
}

export default function HelpButton({ 
  page, 
  isLast = false 
}: { 
  page: PageName, 
  isLast?: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch for modals
  useEffect(() => setMounted(true), [])
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!mounted) return (
    <button style={{ width: 36, height: 34, background: 'none', border: 'none' }}>
      <HelpCircle size={18} color="var(--text-muted)" />
    </button>
  )

  const data = HELP_DATA[page]

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
          />
          
          {/* Modal Box */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ 
              position: 'relative', width: '100%', maxWidth: 420, 
              background: 'var(--bg-page)', 
              border: '1px solid var(--border)', 
              borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' 
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 6, background: 'var(--orange-glow)', borderRadius: 8, border: '1px solid var(--orange-border)', color: 'var(--orange)' }}>
                  <Info size={16} strokeWidth={2} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{data.title}</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 20px', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {data.content}
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px 20px', background: 'var(--bg-surface2)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'var(--orange)', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.2s' }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 36, 
          height: 34, 
          background: 'none', 
          border: 'none',
          borderRight: isLast ? 'none' : '1px solid var(--border)',
          cursor: 'pointer', 
          color: 'var(--text-secondary)',
          transition: 'color 0.2s',
          padding: 0
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        title="Help & Info"
      >
        <HelpCircle size={18} strokeWidth={1.5} />
      </button>
      
      {mounted && createPortal(modalContent, document.body)}
    </>
  )
}