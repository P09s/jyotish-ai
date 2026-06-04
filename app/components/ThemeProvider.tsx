'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

// ─────────────────────────────────────────────────────────────
// ThemeProvider
// ─────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('daivam-theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      apply(saved)
      setTheme(saved)
    } else {
      const system: Theme = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      apply(system)
      setTheme(system)
    }

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('daivam-theme')) {
        const next: Theme = e.matches ? 'light' : 'dark'
        apply(next)
        setTheme(next)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      localStorage.setItem('daivam-theme', next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

// ─────────────────────────────────────────────────────────────
// ThemeToggle
// ─────────────────────────────────────────────────────────────
export function ThemeToggle({ 
  className = '', 
  showSeparator = false 
}: { 
  className?: string, 
  showSeparator?: boolean 
}) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className}
      style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 36, 
        height: 34, 
        background: 'none', 
        border: 'none',
        borderRight: showSeparator ? '1px solid var(--border)' : 'none',
        cursor: 'pointer', 
        color: 'var(--text-secondary)',
        transition: 'color 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
      style={{ color: 'var(--orange, #F97316)' }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
      style={{ color: 'var(--orange, #F97316)' }}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}