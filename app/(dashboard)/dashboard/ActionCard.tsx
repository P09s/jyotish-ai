'use client'
import Link from 'next/link'
import { Star, MessageCircle, User, ChevronRight } from 'lucide-react'

const icons = {
  star: <Star size={20} color="var(--orange)" strokeWidth={1.5} />,
  message: <MessageCircle size={20} color="var(--orange)" strokeWidth={1.5} />,
  user: <User size={20} color="var(--orange)" strokeWidth={1.5} />,
}

type Props = {
  href: string
  title: string
  desc: string
  tag: string
  iconName: 'star' | 'message' | 'user'
}

export default function ActionCard({ href, title, desc, tag, iconName }: Props) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '18px 20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer', transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(249,115,22,0.3)'
          el.style.background = 'rgba(249,115,22,0.05)'
          el.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(255,255,255,0.07)'
          el.style.background = 'rgba(255,255,255,0.03)'
          el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icons[iconName]}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 100,
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              color: '#FDBA74', letterSpacing: '0.04em'
            }}>{tag}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
        </div>

        <ChevronRight size={16} color="rgba(249,115,22,0.5)" strokeWidth={1.5} style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}