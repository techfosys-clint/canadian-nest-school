'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <section className="w-full min-h-[96vh] relative flex flex-col justify-between pt-36 md:pt-44 overflow-hidden">
      
      {/* Centered Hero Content */}
      <div className="container mx-auto px-6 flex-grow flex flex-col items-center justify-center relative z-10 pb-12 pt-8 md:pt-12">
        
        {/* Main Animated Heading in Plus Jakarta Sans */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl sm:text-4xl md:text-6xl font-bold font-display tracking-tight text-center text-[#0A163A] leading-[1.15] md:leading-[1.12] max-w-5xl mx-auto mb-8 relative"
        >
          
          {/* Row 1: Learn Easily [Avatar] */}
          <span className="block relative mb-3 md:mb-5">
            {/* Purple Curved Pointing Arrow (heading-svg.svg) - Made Larger & Animated */}
            <motion.span 
              initial={{ opacity: 0, scale: 0.8, rotate: -25 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
              className="absolute -left-24 -top-12 w-32 h-32 pointer-events-none hidden lg:block"
            >
              <img src="/svg/heading-svg.svg" alt="arrow pointer" className="w-full h-full object-contain" />
            </motion.span>

            <span className="align-middle">Master </span>
            
            <span className="inline-block whitespace-nowrap align-middle">
              {/* Golden Pill Highlighter - Smooth Zoom in */}
              <motion.span 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center bg-[#FDBF2D] text-[#0A163A] px-4 md:px-8 py-0.5 md:py-[4px] rounded-full mx-1 md:mx-2 align-middle relative "
              >
                Authentic
              </motion.span>

              {/* Avatar right next to Easily - Animated Pop-In */}
              <motion.span 
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 120 }}
                className="inline-block align-middle -ml-[16px] md:-ml-[26px] relative -top-0.5 md:-top-0.5 z-10"
              >
                <img 
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150" 
                  alt="Instructor" 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 md:border-3 border-white shadow-md object-cover"
                />
              </motion.span>
            </span>

            <span className="align-middle ml-1.5 md:ml-3">English</span>

            {/* Purple Lines Spark (heading-svg2.svg) - Animated Zoom */}
            <motion.span 
              initial={{ opacity: 0, scale: 0.8, rotate: 15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
              className="absolute right-2 -top-8 w-20 h-20 pointer-events-none hidden lg:block"
            >
              <img src="/svg/heading-svg2.svg" alt="spark accents" className="w-full h-full object-contain" />
            </motion.span>
          </span>

          {/* Row 2: Anywhere [Avatars] and Anytime */}
          <span className="block">
            <span className="inline-block whitespace-nowrap align-middle">
              <span className="align-middle">from Anywhere </span>

              {/* Double Overlapping Avatars - Staggered entrance */}
              <span className="inline-flex items-center justify-center align-middle mx-1.5 md:mx-3 translate-y-0.5">
                <motion.img 
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150" 
                  alt="Student 1" 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 md:border-3 border-white shadow-md object-cover -mr-2 md:-mr-3 relative z-20"
                />
                <motion.img 
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" 
                  alt="Student 2" 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 md:border-3 border-white shadow-md object-cover relative z-10"
                />
              </span>
            </span>

            <span className="align-middle"> in the World</span>
          </span>

        </motion.h1>

        {/* Subheading/Subtitle in Nunito (Fade in from bottom) */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="text-base md:text-lg text-[#4F5B7C] font-semibold text-center max-w-3xl mx-auto mb-10 leading-relaxed font-sans"
        >
          {"Discover premium Phonics, Spoken English, IELTS, Online Schooling, and Teacher Training programs built on Canadian educational standards."} <br className="hidden md:block" /> {"Empowering learners and educators to communicate with absolute confidence."}
        </motion.p>

        {/* Action Button - Zoom pop in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
        >
          <Link 
            href="/courses" 
            className="inline-block px-8 py-4 rounded-lg bg-[#E61C24] hover:bg-[#c3131a] text-white font-bold text-base shadow-lg shadow-[#E61C24]/25 hover:shadow-[#E61C24]/35 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer text-center"
          >
            Start Learning Today
          </Link>
        </motion.div>

      </div>

      {/* Marquee Integrated Directly at the bottom of Hero Container */}
      <div className="w-full relative z-20 pb-4">
        {children}
      </div>

    </section>
  )
}
