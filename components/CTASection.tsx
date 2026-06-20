'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'

export default function CTASection() {
  return (
    <section className="relative bg-[#E61C24] overflow-hidden select-text py-20 md:py-28 w-full border-none">
      {/* Subtle vertical glow columns on the sides */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

      {/* Dot Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.6] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto w-full">
        <motion.h2 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.15]"
        >
          Ready to Transform Your English Skills?
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 md:mt-6 text-base md:text-lg text-white/90 max-w-2xl font-semibold leading-relaxed"
        >
          Join our growing community of learners globally. Enroll in our upcoming batch today and step into a brighter, more confident future.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto select-none"
        >
          <Link
            href="/courses"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-white hover:bg-zinc-100 text-[#E61C24] font-bold text-base rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group cursor-pointer border-none"
          >
            <span>Browse Course</span>
            <FiArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-base rounded-lg transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-none"
          >
            Get Started
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
