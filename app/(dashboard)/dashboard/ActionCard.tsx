'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Star,
  MessageCircle,
  User,
  ChevronRight,
  Sun,
  Globe,
  Heart,
} from 'lucide-react'

const icons = {
  star: <Star size={20} color="var(--orange)" strokeWidth={1.5} />,
  message: <MessageCircle size={20} color="var(--orange)" strokeWidth={1.5} />,
  user: <User size={20} color="var(--orange)" strokeWidth={1.5} />,
  sun: <Sun size={20} color="var(--orange)" strokeWidth={1.5} />,
  globe: <Globe size={20} color="var(--orange)" strokeWidth={1.5} />,
  heart: <Heart size={20} color="var(--orange)" strokeWidth={1.5} />,
}

type Props = {
  href: string
  title: string
  desc: string
  tag: string
  iconName: 'star' | 'message' | 'user' | 'sun' | 'globe' | 'heart'
}

export default function ActionCard({
  href,
  title,
  desc,
  tag,
  iconName,
}: Props) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          ease: 'easeOut',
        }}
        whileHover={{
          y: -2,
          borderColor: 'rgba(249,115,22,0.28)',
          backgroundColor: 'rgba(249,115,22,0.05)',
        }}
        whileTap={{ scale: 0.985 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 20px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer',
          willChange: 'transform, opacity',
        }}
      >
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: 3, scale: 1.04 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            flexShrink: 0,
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icons[iconName]}
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </span>

            <motion.span
              whileHover={{ scale: 1.04 }}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 100,
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                color: '#FDBA74',
                letterSpacing: '0.04em',
              }}
            >
              {tag}
            </motion.span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            {desc}
          </div>
        </div>

        {/* Arrow */}
        <motion.div
          whileHover={{ x: 2 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight
            size={16}
            color="rgba(249,115,22,0.5)"
            strokeWidth={1.5}
            style={{ flexShrink: 0 }}
          />
        </motion.div>
      </motion.div>
    </Link>
  )
}