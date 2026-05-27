'use client'

import { motion } from 'framer-motion'

export function MotionDiv({
  children,
  className,
  style,
  initial,
  animate,
  whileInView,
  transition,
  viewport,
  whileHover,
  whileTap,
}: any) {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      whileInView={whileInView}
      transition={transition}
      viewport={viewport}
      whileHover={whileHover}
      whileTap={whileTap}
      className={className}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

export function PageTransition({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.18,
        ease: 'easeOut',
      }}
      style={{
        willChange: 'opacity',
      }}
    >
      {children}
    </motion.div>
  )
}