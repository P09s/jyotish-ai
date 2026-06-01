'use client'
import { useEffect } from 'react'

export default function LandingScripts() {
  useEffect(() => {
    // ── Disable browser scroll restoration to prevent jump on refresh ──
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    // ── Scroll reveal ──
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => obs.observe(el))

    // ── Feature card stagger ──
    const cards = document.querySelectorAll<HTMLElement>('.f-card')
    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const i = Array.from(cards).indexOf(e.target as HTMLElement)
          setTimeout(() => {
            ;(e.target as HTMLElement).style.opacity = '1'
            ;(e.target as HTMLElement).style.transform = 'translateY(0)'
          }, i * 80)
          cardObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1 })
    cards.forEach((c) => {
      const rect = c.getBoundingClientRect()
      const alreadyVisible = rect.top < window.innerHeight
      if (!alreadyVisible) {
        c.style.opacity = '0'
        c.style.transform = 'translateY(16px)'
      }
      c.style.transition =
        'opacity 0.5s ease, transform 0.5s ease, border-color 0.25s, background 0.25s'
      cardObs.observe(c)
    })

    // ── Chat typewriter ──
    const AI1 = `Looking at your chart — you're currently in your <strong>Saturn Mahadasha</strong>, which began in 2021 and runs through 2040. Saturn rules your 10th house of career, so this entire period is one of professional restructuring.\n\nThe most favourable window is <strong>late 2025 through mid-2026</strong>, when Jupiter transits your 2nd house (income & resources). If you've been considering a move aligned with your <strong>Lagna lord Mercury</strong> — communication, analysis, or teaching — this is the moment.`
    const AI2 = `Your <strong>7th house</strong> (partnerships) has Venus placed in it — a highly auspicious configuration. The next significant window opens when <strong>Jupiter aspects your 7th house</strong> in 2026, coinciding with a Venus Antardasha in your current Mahadasha. Both indicators align for a meaningful partnership.<span class="cursor"></span>`

    let chatDone = false
    const chatEl = document.querySelector('.chat-section')

    function typeWrite(
      el: HTMLElement,
      text: string,
      speed: number,
      done: (() => void) | null
    ) {
      let i = 0, html = '', inTag = false, buf = ''
      function step() {
        if (i >= text.length) {
          el.innerHTML = html
          if (done) done()
          return
        }
        const ch = text[i]
        if (ch === '<') inTag = true
        if (inTag) {
          buf += ch
          if (ch === '>') { html += buf; buf = ''; inTag = false }
        } else if (ch === '\n') {
          html += '<br/><br/>'
        } else {
          html += ch
        }
        i++
        el.innerHTML = html + (inTag ? '' : '<span class="cursor"></span>')
        const msgs = document.getElementById('chat-msgs')
        if (msgs) msgs.scrollTop = msgs.scrollHeight
        setTimeout(step, speed)
      }
      step()
    }

    function runChat() {
      const m1 = document.getElementById('lp-msg1') as HTMLElement
      const m2 = document.getElementById('lp-msg2') as HTMLElement
      const m2t = document.getElementById('lp-msg2-text') as HTMLElement
      const m3 = document.getElementById('lp-msg3') as HTMLElement
      const m4 = document.getElementById('lp-msg4') as HTMLElement
      const m4t = document.getElementById('lp-msg4-text') as HTMLElement
      if (!m1) return
      setTimeout(() => { m1.style.opacity = '1' }, 300)
      setTimeout(() => {
        m2.style.opacity = '1'
        typeWrite(m2t, AI1, 16, () => {
          setTimeout(() => { m3.style.opacity = '1' }, 400)
          setTimeout(() => { m4.style.opacity = '1'; typeWrite(m4t, AI2, 18, null) }, 900)
        })
      }, 900)
    }

    const chatObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !chatDone) {
        chatDone = true
        runChat()
      }
    }, { threshold: 0.3 })
    if (chatEl) chatObs.observe(chatEl)

    return () => {
      obs.disconnect()
      cardObs.disconnect()
      chatObs.disconnect()
    }
  }, [])

  return null
}