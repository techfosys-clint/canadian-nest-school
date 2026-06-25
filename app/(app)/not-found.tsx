'use client'

import React from 'react'
import Link from 'next/link'
import { FiHome, FiArrowRight } from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f8ff]/60 flex flex-col items-center justify-center px-6 relative overflow-hidden select-none">
      
      {/* Self-contained keyframe float animation */}
      <style jsx>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        .animate-float-a { animation: floatY 8s ease-in-out infinite; }
        .animate-float-b { animation: floatY 10s ease-in-out infinite 1.5s; }
      `}</style>

      {/* Elegant background grid pattern and brand spotlights */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E61C24 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E61C24]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff5b5b]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating vector shapes from landing page */}
      <div className="absolute top-12 left-10 w-24 h-24 md:w-32 md:h-32 opacity-80 pointer-events-none animate-float-a hidden sm:block">
        <img src="/icon_image/67af701a7fe66816db9422cd_Hero_20Vactor_204.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-16 right-10 w-24 h-24 md:w-32 md:h-32 opacity-80 pointer-events-none animate-float-b hidden sm:block">
        <img src="/icon_image/man.png" alt="" className="w-full h-full object-contain" />
      </div>

      {/* 404 Content Container */}
      <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
        
        {/* Animated 404 Number Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          {/* Glassmorphic backdrop */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-lg border border-zinc-200/50 shadow-xl shadow-[#E61C24]/5 -rotate-2" />
          
          <h1 className="relative text-7xl sm:text-8xl md:text-9xl font-bold font-display text-zinc-900 tracking-tight px-8 py-4 select-none leading-none">
            4
            <span className="text-[#E61C24] relative inline-block">
              0
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none"
              >
                ✦
              </motion.span>
            </span>
            4
          </h1>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4 tracking-tight leading-snug"
        >
          Page Not Found
        </motion.h2>

        {/* Subtitle / Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="text-base sm:text-lg font-semibold text-zinc-500 max-w-md mb-10 leading-relaxed font-sans"
        >
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </motion.p>

        {/* Action Buttons Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base rounded-lg shadow-lg shadow-[#E61C24]/20 hover:shadow-xl hover:shadow-[#E61C24]/30 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <FiHome className="h-5 w-5" />
            <span>Back to Home Page</span>
          </Link>

          <Link
            href="/courses"
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 font-bold text-base rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Explore Courses</span>
            <FiArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>

      </div>
      
    </div>
  )
}
