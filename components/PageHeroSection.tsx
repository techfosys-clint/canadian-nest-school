'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export type PageHeroSectionProps = {
  tag: string
  title: ReactNode
  description: ReactNode
  className?: string
}

export default function PageHeroSection({
  tag,
  title,
  description,
  className = '',
}: PageHeroSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`relative bg-zinc-950 py-12 md:py-16 text-center overflow-hidden shadow-lg select-text w-full z-10 border-none ${className}`.trim()}
    >
      <div className='absolute -top-12 -left-12 w-48 h-48 bg-[#E61C24]/20 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute -bottom-12 -right-12 w-48 h-48 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none' />

      <div
        className='absolute inset-0 opacity-[0.35] pointer-events-none'
        style={{
          backgroundImage: 'radial-gradient(white 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse at center, black, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black, transparent 80%)',
        }}
      />

      <div className='container mx-auto px-6 relative z-10 flex flex-col items-center w-full max-w-5xl'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-base font-bold text-white uppercase tracking-wide mb-4 border-none'
        >
          <span className='w-1.5 h-1.5 rounded-full bg-white animate-pulse' />
          <span>{tag}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.2] font-display max-w-4xl'
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='mt-4 text-base sm:text-lg text-white/85 max-w-3xl mx-auto leading-relaxed font-semibold'
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  )
}
