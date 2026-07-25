'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles, Download, Wand2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/app/components/Navbar'

type Traits = {
  temperament?: string
  vibe?: string
  style?: string
  complexion_tone?: string
}

type SpousePortrait = {
  traits: Traits
  narrative: string
  imageBase64: string
  imageMimeType: string
  disclaimer: string
}

const TRAIT_LABELS: Record<keyof Traits, string> = {
  temperament: 'Temperament',
  vibe: 'Vibe',
  style: 'Style',
  complexion_tone: 'Tone',
}

export default function SpousePortraitPage() {
  const router = useRouter()
  const [data, setData] = useState<SpousePortrait | null>(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Same flag as the dashboard card and the API route. Checked here too so
  // a direct link/bookmark to this page (bypassing the hidden dashboard
  // card) doesn't just hit a raw 404 from the API with no explanation.
  const enabled = process.env.NEXT_PUBLIC_SPOUSE_PORTRAIT_ENABLED === 'true'

  // Just confirm auth up front; the actual generation is opt-in via the
  // reveal button below, since it costs a real image-generation call.
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [router])

  async function handleReveal() {
    if (!gender) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/spouse-portrait?gender=${gender}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        setLoading(false)
        return
      }
      setData(json.spousePortrait)
      setLoading(false)
      // Small delay so the loading -> reveal transition doesn't feel abrupt
      setTimeout(() => setRevealed(true), 150)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!data || !canvasRef.current) return
    setDownloading(true)
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const W = 1080, H = 1350 // portrait aspect, share-friendly
      canvas.width = W
      canvas.height = H

      // Background
      ctx.fillStyle = '#0B0B12'
      ctx.fillRect(0, 0, W, H)

      // Portrait image, top ~72% — drawn with a "cover" crop so a square
      // source image isn't squashed into the taller target area (the bug:
      // drawImage(img, 0, 0, W, imgH) used to force-stretch regardless of
      // the source's actual aspect ratio).
      const img = new window.Image()
      img.src = `data:${data.imageMimeType};base64,${data.imageBase64}`
      await new Promise((resolve) => { img.onload = resolve })
      const imgH = H * 0.72
      const srcRatio = img.width / img.height
      const targetRatio = W / imgH
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (srcRatio > targetRatio) {
        // source is wider than target — crop left/right, keep full height
        sw = img.height * targetRatio
        sx = (img.width - sw) / 2
      } else {
        // source is taller than target — crop top/bottom, keep full width
        sh = img.width / targetRatio
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, imgH)

      // Bottom gradient fade for text legibility
      const grad = ctx.createLinearGradient(0, imgH - 220, 0, imgH)
      grad.addColorStop(0, 'rgba(11,11,18,0)')
      grad.addColorStop(1, 'rgba(11,11,18,1)')
      ctx.fillStyle = grad
      ctx.fillRect(0, imgH - 220, W, 220)

      // Trait line — previously a single fillText() call with a maxWidth
      // argument, which doesn't wrap text: it horizontally SQUISHES it to
      // fit, which is why 4 traits joined together looked compressed/
      // misaligned. Now properly wrapped across as many lines as needed,
      // and everything below uses a running y-cursor instead of fixed
      // offsets, so the layout adapts instead of assuming one line.
      let y = imgH + 55

      ctx.fillStyle = '#F97316'
      ctx.font = '600 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const traitLine = Object.entries(data.traits)
        .filter(([, v]) => v)
        .map(([, v]) => v)
        .join('   ·   ')
      const traitLines = wrapLines(ctx, traitLine, W - 100)
      const traitLineHeight = 38
      traitLines.forEach((line) => {
        y += traitLineHeight
        ctx.fillText(line, W / 2, y)
      })

      // Narrative
      y += 30
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '400 26px sans-serif'
      const narrativeLineHeight = 36
      let narrativeLines = wrapLines(ctx, data.narrative, W - 140)
      const maxNarrativeLines = 4
      if (narrativeLines.length > maxNarrativeLines) {
        narrativeLines = narrativeLines.slice(0, maxNarrativeLines)
        narrativeLines[maxNarrativeLines - 1] = narrativeLines[maxNarrativeLines - 1].replace(/\s*\S*$/, '') + '…'
      }
      narrativeLines.forEach((line) => {
        y += narrativeLineHeight
        ctx.fillText(line, W / 2, y)
      })

      // Watermark — uses the app's actual logo file rather than a text
      // glyph. The previous ✦ character was being misread as Google
      // Gemini's logo (a very similar four-point sparkle mark) — not
      // something you want on an image people are sharing publicly. Also
      // corrected the brand name to DAIVAM AI (from the Navbar), not
      // "Jyotish AI" which was a guess based on the repo name.
      //
      // Logo and text now share one row centered on the same y coordinate
      // via textBaseline='middle', instead of two separately-guessed pixel
      // offsets that didn't actually line up.
      const logo = new window.Image()
      logo.src = '/logo.png'
      await new Promise((resolve) => { logo.onload = resolve })
      const logoSize = 30
      const watermarkRowY = H - 44
      ctx.font = '600 22px sans-serif'
      const watermarkText = 'DAIVAM AI · Spouse Portrait'
      const textWidth = ctx.measureText(watermarkText).width
      const gap = 10
      const totalWidth = logoSize + gap + textWidth
      const startX = W / 2 - totalWidth / 2

      ctx.drawImage(logo, startX, watermarkRowY - logoSize / 2, logoSize, logoSize)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(watermarkText, startX + logoSize + gap, watermarkRowY)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'

      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-spouse-portrait.png'
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="spouse-portrait" showBack />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Jyotish · Kalatra
          </p>
          <h1 className="serif" style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Your Spouse Portrait
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            An artistic impression, drawn from your 7th house, Venus & Mars
          </p>
        </div>

        {!enabled && (
          <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              This feature is being rolled out gradually and isn&apos;t available just yet.
              Check back soon!
            </p>
            <Link href="/dashboard" className="btn-primary" style={{ display: 'inline-flex' }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {enabled && (
        <>
        {!data && !loading && (
          <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
            }}>
              <Wand2 size={24} color="var(--orange)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              Your chart holds clues about your future partner&apos;s temperament, style and energy.
              Reveal what the stars suggest — as a one-of-one illustrated portrait.
            </p>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Show my spouse as
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {(['female', 'male'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  style={{
                    padding: '8px 20px', borderRadius: 100, fontSize: 13, cursor: 'pointer',
                    textTransform: 'capitalize',
                    background: gender === g ? 'var(--orange)' : 'var(--orange-glow)',
                    color: gender === g ? '#fff' : 'var(--orange-dim)',
                    border: `1px solid ${gender === g ? 'var(--orange)' : 'var(--orange-border)'}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={handleReveal}
              disabled={!gender}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: gender ? 1 : 0.5, cursor: gender ? 'pointer' : 'not-allowed' }}
            >
              <Sparkles size={16} strokeWidth={1.5} />
              Reveal My Spouse Portrait
            </button>
          </div>
        )}

        {loading && (
          <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={22} color="var(--orange)" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reading Venus, Mars & your 7th house…</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>This can take up to 20 seconds — painting takes time ✦</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0 }}>{error}</p>
            {error.includes('Kundali') && (
              <Link href="/kundali" style={{ fontSize: 12, color: '#FCA5A5', textDecoration: 'underline', flexShrink: 0 }}>
                Generate
              </Link>
            )}
          </div>
        )}

        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                <img
                  src={`data:${data.imageMimeType};base64,${data.imageBase64}`}
                  alt="Illustrated impression of your future spouse"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
                {(Object.keys(TRAIT_LABELS) as (keyof Traits)[]).map((key) => (
                  data.traits[key] ? (
                    <span key={key} style={{
                      fontSize: 12, padding: '6px 12px', borderRadius: 100,
                      background: 'var(--orange-glow)', border: '1px solid var(--orange-border)',
                      color: 'var(--orange-dim)',
                    }}>
                      {data.traits[key]}
                    </span>
                  ) : null
                ))}
              </div>

              <div className="card" style={{ padding: '22px 20px', marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  {data.narrative}
                </p>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center', marginBottom: 24, opacity: 0.75 }}>
                {data.disclaimer}
              </p>

              <button
                className="btn-primary"
                onClick={handleShare}
                disabled={downloading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {downloading ? (
                  <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={16} strokeWidth={1.5} />
                )}
                {downloading ? 'Preparing…' : 'Download & Share'}
              </button>

              {/* Off-screen canvas used to composite the shareable card */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>
    </div>
  )
}

// Pure line-wrapping helper — returns the wrapped lines rather than drawing
// them directly, so callers can know the line count up front and position
// subsequent content accordingly (a fixed-offset layout was the root cause
// of the squished trait-line bug: it assumed everything was always one line).
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)

  return lines
}