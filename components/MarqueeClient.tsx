'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface MarqueeClientProps {
  items: string[]
}

export default function MarqueeClient({ items }: MarqueeClientProps) {
  const [startScroll, setStartScroll] = useState(false)

  useEffect(() => {
    // Trigger infinite scrolling exactly after the sweep animation finishes (1.2s)
    const timer = setTimeout(() => {
      setStartScroll(true)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Ensure we have enough items to loop seamlessly without blank spots/gaps.
  // We want to repeat the items array until it has at least 20 items.
  const repeatedItems = [...items]
  if (repeatedItems.length > 0) {
    while (repeatedItems.length < 20) {
      repeatedItems.push(...items)
    }
  }

  return (
    <div className="w-full relative h-44 flex items-center justify-center my-6 overflow-visible">
      
      {/* Ribbon 1: Primary Red Background, White Text (Scrolls Right to Left, Tilts at -5deg) */}
      <motion.div 
        initial={{ clipPath: 'inset(0 0 0 100%)', rotate: 0 }}
        animate={{ clipPath: 'inset(0 0 0 0%)', rotate: -5 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-[105vw] left-1/2 -translate-x-1/2 bg-[#E61C24] py-5 overflow-hidden select-none border-y border-white/10 shadow-lg shadow-[#E61C24]/15 z-10 transform-gpu backface-hidden will-change-transform"
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransformStyle: 'preserve-3d',
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className={`flex ${startScroll ? 'animate-marquee-track' : ''}`}
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Marquee Group 1 */}
          <div 
            className="flex gap-20 items-center shrink-0 pr-20 text-base font-bold uppercase tracking-widest text-white subpixel-antialiased"
            style={{
              WebkitFontSmoothing: 'subpixel-antialiased',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          >
            {repeatedItems.map((item, index) => (
              <React.Fragment key={`g1-${index}`}>
                <span>{item}</span>
                <Image src="/svg/sparkle.png" alt="sparkle" width={20} height={20} className="h-5 w-5 object-contain shrink-0 filter brightness-0 invert" />
              </React.Fragment>
            ))}
          </div>

          {/* Marquee Group 2 */}
          <div 
            className="flex gap-20 items-center shrink-0 pr-20 text-base font-bold uppercase tracking-widest text-white subpixel-antialiased" 
            aria-hidden="true"
            style={{
              WebkitFontSmoothing: 'subpixel-antialiased',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          >
            {repeatedItems.map((item, index) => (
              <React.Fragment key={`g2-${index}`}>
                <span>{item}</span>
                <Image src="/svg/sparkle.png" alt="sparkle" width={20} height={20} className="h-5 w-5 object-contain shrink-0 filter brightness-0 invert" />
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Ribbon 2: White Background, Primary Red Text (Scrolls Left to Right, Tilts at +5deg) */}
      <motion.div 
        initial={{ clipPath: 'inset(0 100% 0 0)', rotate: 0 }}
        animate={{ clipPath: 'inset(0 0 0 0)', rotate: 5 }}
        transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-[105vw] left-1/2 -translate-x-1/2 bg-white py-5 overflow-hidden select-none border-y border-[#E61C24]/15 shadow-xl shadow-zinc-200/50 z-20 transform-gpu backface-hidden will-change-transform"
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransformStyle: 'preserve-3d',
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          className={`flex ${startScroll ? 'animate-marquee-track-reverse' : ''}`}
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: startScroll ? undefined : 'translateX(-50%)',
          }}
        >
          {/* Marquee Group 1 */}
          <div 
            className="flex gap-20 items-center shrink-0 pr-20 text-base font-bold uppercase tracking-widest text-[#E61C24] subpixel-antialiased"
            style={{
              WebkitFontSmoothing: 'subpixel-antialiased',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          >
            {repeatedItems.slice().reverse().map((item, index) => (
              <React.Fragment key={`g1-rev-${index}`}>
                <span>{item}</span>
                <Image 
                  src="/svg/sparkle.png" 
                  alt="sparkle" 
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain shrink-0" 
                  style={{ filter: 'invert(16%) sepia(99%) saturate(5436%) hue-rotate(352deg) brightness(95%) contrast(91%)' }} 
                />
              </React.Fragment>
            ))}
          </div>

          {/* Marquee Group 2 */}
          <div 
            className="flex gap-20 items-center shrink-0 pr-20 text-base font-bold uppercase tracking-widest text-[#E61C24] subpixel-antialiased" 
            aria-hidden="true"
            style={{
              WebkitFontSmoothing: 'subpixel-antialiased',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          >
            {repeatedItems.slice().reverse().map((item, index) => (
              <React.Fragment key={`g2-rev-${index}`}>
                <span>{item}</span>
                <Image 
                  src="/svg/sparkle.png" 
                  alt="sparkle" 
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain shrink-0" 
                  style={{ filter: 'invert(16%) sepia(99%) saturate(5436%) hue-rotate(352deg) brightness(95%) contrast(91%)' }} 
                />
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </motion.div>

    </div>
  )
}
