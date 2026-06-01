'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, MessageCircle, User, ChevronRight, Sun, Globe, Heart } from 'lucide-react'

const icons = {
  star: { default: <Star size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <Star size={20} color="var(--orange)" strokeWidth={1.5} /> },
  message: { default: <MessageCircle size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <MessageCircle size={20} color="var(--orange)" strokeWidth={1.5} /> },
  user: { default: <User size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <User size={20} color="var(--orange)" strokeWidth={1.5} /> },
  sun: { default: <Sun size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <Sun size={20} color="var(--orange)" strokeWidth={1.5} /> },
  globe: { default: <Globe size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <Globe size={20} color="var(--orange)" strokeWidth={1.5} /> },
  heart: { default: <Heart size={20} color="var(--text-muted)" strokeWidth={1.5} />, featured: <Heart size={20} color="var(--orange)" strokeWidth={1.5} /> },
}

type Props = {
  href: string
  title: string
  desc: string
  tag: string
  iconName: 'star' | 'message' | 'user' | 'sun' | 'globe' | 'heart'
  featured?: boolean
}

export default function ActionCard({ href, title, desc, tag, iconName, featured = false }: Props) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        whileHover={{
          y: -2,
          borderColor: featured ? 'rgba(249,115,22,0.45)' : 'var(--border2)',
          backgroundColor: featured ? 'rgba(249,115,22,0.18)' : 'var(--bg-card-hover)',
        }}
        whileTap={{ scale: 0.985 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: featured ? '20px 22px' : '16px 20px',
          borderRadius: 14,
          background: featured
            ? 'linear-gradient(135deg, var(--orange-glow) 0%, rgba(249,115,22,0.05) 100%)'
            : 'var(--bg-card)',
          border: featured
            ? '1px solid var(--orange-border)'
            : '1px solid var(--border)',
          cursor: 'pointer',
          willChange: 'transform, opacity',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Ambient glow for featured only */}
        {featured && (
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Icon */}
        <motion.div
          whileHover={{ rotate: 3, scale: 1.04 }}
          transition={{ duration: 0.2 }}
          style={{
            width: featured ? 48 : 44, height: featured ? 48 : 44,
            borderRadius: 12, flexShrink: 0,
            background: featured ? 'var(--orange-glow)' : 'rgba(249,115,22,0.06)',
            border: featured ? '1px solid var(--orange-border)' : '1px solid rgba(249,115,22,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {icons[iconName][featured ? 'featured' : 'default']}
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: featured ? 15 : 14, fontWeight: featured ? 600 : 500,
              // Changed hardcoded #FDBA74 to var(--orange)
              color: featured ? 'var(--orange)' : 'var(--text-primary)',
            }}>
              {title}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 100,
              background: featured ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.08)',
              border: featured ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(249,115,22,0.15)',
              // Changed hardcoded #FDBA74 to var(--orange)
              color: 'var(--orange)', letterSpacing: '0.04em',
            }}>
              {tag}
            </span>
          </div>
          <div style={{
            fontSize: 12, lineHeight: 1.6,
            color: featured ? 'var(--orange-dim)' : 'var(--text-secondary)',
          }}>
            {desc}
          </div>
        </div>

        {/* Arrow */}
        <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
          <ChevronRight
            size={16}
            color={featured ? 'rgba(249,115,22,0.6)' : 'rgba(249,115,22,0.4)'}
            strokeWidth={1.5}
            style={{ flexShrink: 0 }}
          />
        </motion.div>
      </motion.div>
    </Link>
  )
}