'use client'

import { useState, useEffect } from 'react'
import { Languages } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LanguageToggle() {
  // Simple state for UI. Later, you can tie this to a Cookie or Context 
  // to actually swap your JSON translation dictionaries.
  const [lang, setLang] = useState<'EN' | 'HI'>('EN')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function toggleLanguage() {
    setLang(prev => (prev === 'EN' ? 'HI' : 'EN'))
    // TODO: Add your i18n logic here (e.g., set cookie, update context, or router.refresh())
  }

  if (!mounted) return <div style={{ width: 44, height: 18 }} /> // Placeholder to prevent layout shift

  return (
    <button
      onClick={toggleLanguage}
      style={{
        background: 'var(--bg-surface2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '2px 8px 2px 4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--text-secondary)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--orange-border)'
        e.currentTarget.style.color = 'var(--orange)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
      title="Switch Language"
    >
      <Languages size={15} strokeWidth={1.5} />
      <div style={{ position: 'relative', width: 16, height: 14, overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={lang}
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 15, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              left: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
              lineHeight: '14px'
            }}
          >
            {lang}
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  )
}