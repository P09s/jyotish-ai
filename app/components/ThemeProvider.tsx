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
// Reads system preference on first load, then lets the user
// override via toggle(). Preference is persisted to localStorage
// and applied as  data-theme="light|dark"  on <html>.
// ─────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  // On mount: respect saved preference, fall back to system
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

    // Also watch for OS-level theme changes (no saved preference only)
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
// ThemeToggle — drop this anywhere in your nav/header
// ─────────────────────────────────────────────────────────────
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '1px solid var(--border2, rgba(245,239,224,0.13))',
        background: 'transparent',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        flexShrink: 0,
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

// Small inline SVG icons — no extra deps
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
      style={{ color: 'var(--orange, #F97316)' }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
      style={{ color: 'var(--orange, #F97316)' }}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}