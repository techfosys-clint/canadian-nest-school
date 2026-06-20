'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiBookOpen, FiAward, FiCalendar, FiArrowRight } from 'react-icons/fi'

export default function Features() {
  const featuresList = [
    {
      icon: <FiBookOpen className="h-6 w-6" />,
      iconColor: 'text-[#10B981]',
      iconBg: 'bg-[#10B981]/10',
      iconBorder: 'border-[#10B981]/20',
      title: 'Methodology',
      description:
        'Experience a highly effective learning method focusing on accurate pronunciation, phonics, and natural speaking skills without the pressure of traditional memorization.',
    },
    {
      icon: <FiCalendar className="h-6 w-6" />,
      iconColor: 'text-[#3b82f6]',
      iconBg: 'bg-[#3b82f6]/10',
      iconBorder: 'border-[#3b82f6]/20',
      title: 'Live and Interactive Classes',
      description:
        'Engage directly with highly experienced instructors through fun, interactive, and practical live sessions designed to keep both kids and adults highly engaged.',
    },
    {
      icon: <FiAward className="h-6 w-6" />,
      iconColor: 'text-[#84CC16]',
      iconBg: 'bg-[#84CC16]/10',
      iconBorder: 'border-[#84CC16]/20',
      title: 'Tailored for Every Learner',
      description:
        'Whether it is a child building their English foundation, an adult improving fluency, or a teacher upgrading their skills, our programs guarantee real progress.',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-28 bg-[#FFFFFF] select-text">
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-[#0A163A] tracking-tight mb-6 leading-tight"
          >
            Experience the <span className="text-[#E61C24]">International Way of Learning</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="text-base md:text-lg text-[#4F5B7C] font-semibold leading-relaxed"
          >
            Watch how our expert instructors use practical and interactive methods to make English reading, speaking, and pronunciation effortless for every student.
          </motion.p>
        </div>

        {/* Section Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          
          {/* Left Column: Responsive Video Wrapper stretched to match cards stack height on desktop */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative w-full h-[300px] sm:h-[400px] lg:h-auto lg:min-h-full"
          >
            <div className="w-full h-full absolute inset-0 overflow-hidden rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-zinc-200/80 bg-zinc-950">
              <iframe
                src="https://www.youtube-nocookie.com/embed/0qfeLi_pzQU?si=VyI93xJvpKXckiQ3&amp;start=13"
                title="Canadian Nest Presentation Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full rounded-lg"
              ></iframe>
            </div>
          </motion.div>
 
          {/* Right Column: Cards Stack */}
          <div className="flex flex-col gap-6">
            {featuresList.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: 'easeOut' }}
                className="p-6 md:p-8 bg-white border border-[#E2E8F0] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-zinc-200 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col md:flex-row gap-5 items-start"
              >
                {/* Icon Wrapper (Circular) */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full ${item.iconBg} ${item.iconColor} border ${item.iconBorder} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                >
                  {item.icon}
                </div>
 
                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-[#0A163A] transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-base text-[#4F5B7C] font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
