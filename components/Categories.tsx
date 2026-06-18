'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FiBookOpen, FiLayers, FiMessageCircle, FiAward, FiUsers, FiShoppingBag
} from 'react-icons/fi'

interface CategoriesProps {
  categories?: any[]
}

const CARDS_DATA = [
  {
    title: 'English for Kids',
    description: 'Game based phonics with grammar, Reading, Speaking, Writing .',
    icon: <FiBookOpen className="h-6 w-6 text-[#3b82f6]" />,
    borderColor: 'border-[#3b82f6]',
    bgColor: 'bg-[#3b82f6]/5',
    href: '/courses?category=kids',
  },
  {
    title: 'English for Teens',
    description: 'Academic English and communication skills.',
    icon: <FiLayers className="h-6 w-6 text-[#10b981]" />,
    borderColor: 'border-[#10b981]',
    bgColor: 'bg-[#10b981]/5',
    href: '/courses?category=teens',
  },
  {
    title: 'English for Adults',
    description: 'Speak confidently in everyday situations.',
    icon: <FiMessageCircle className="h-6 w-6 text-[#f97316]" />,
    borderColor: 'border-[#f97316]',
    bgColor: 'bg-[#f97316]/5',
    href: '/courses?category=adults',
  },
  {
    title: 'IELTS Preparation',
    description: 'Achieve your target IELTS score.',
    icon: <FiAward className="h-6 w-6 text-[#ef4444]" />,
    borderColor: 'border-[#ef4444]',
    bgColor: 'bg-[#ef4444]/5',
    href: '/courses?category=ielts',
  },
  {
    title: 'Teacher Training',
    description: 'International teaching methods and strategies.',
    icon: <FiUsers className="h-6 w-6 text-[#a855f7]" />,
    borderColor: 'border-[#a855f7]',
    bgColor: 'bg-[#a855f7]/5',
    href: '/courses?category=teacher-training',
  },
  {
    title: 'Educational Shop',
    description: 'Books, worksheets, courses, teaching resources.',
    icon: <FiShoppingBag className="h-6 w-6 text-[#eab308]" />,
    borderColor: 'border-[#eab308]',
    bgColor: 'bg-[#eab308]/5',
    href: '/courses',
  },
]

const headingVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
}

const subTextVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] as const } },
}

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 35, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] as const } },
}

export default function Categories({ categories }: CategoriesProps) {
  return (
    <section className="py-20 md:py-28 px-6 bg-[#f5f8ff] border-t border-zinc-100 relative overflow-hidden">
      
      <style jsx>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        .float-a { animation: floatY 7s ease-in-out infinite; }
        .float-b { animation: floatY 9s ease-in-out infinite 1.5s; }
        .float-c { animation: floatY 8s ease-in-out infinite 3s; }
        .float-d { animation: floatY 10s ease-in-out infinite 4.5s; }
      `}</style>

      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#615fff 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
      />

      {/* Floating decoration images */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img src="/icon_image/67af701a7fe66816db9422cd_Hero_20Vactor_204.png" alt=""
          className="float-a absolute w-24 h-24 md:w-32 md:h-32 object-contain hidden lg:block"
          style={{ top: '8%', left: '3%' }} />
        <img src="/icon_image/67af701acb74e60e725c6099_Hero_20Vactor_203.png" alt=""
          className="float-b absolute w-24 h-24 md:w-32 md:h-32 object-contain hidden lg:block"
          style={{ top: '6%', right: '3%' }} />
        <img src="/icon_image/67af9b9a66f48f117f548b1a_CTA_20Vector.png" alt=""
          className="float-c absolute w-20 h-20 md:w-28 md:h-28 object-contain hidden lg:block"
          style={{ bottom: '8%', left: '4%' }} />
        <img src="/icon_image/man.png" alt=""
          className="float-d absolute w-24 h-24 md:w-32 md:h-32 object-contain hidden lg:block"
          style={{ bottom: '6%', right: '3%' }} />
      </div>

      <div className="container mx-auto relative z-10">
        
        {/* ── Heading Block matching ESL resources title ── */}
        <div className="text-center mb-16 space-y-4 relative z-30 py-2">
          <motion.h2
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A163A] tracking-tight leading-[1.2] max-w-4xl mx-auto"
          >
            <span className="text-[#10B981]">ESL resources</span>{' '}
            <span className="text-[#d97706]">for teaching English to kids & teens</span>
          </motion.h2>
          
          <motion.p
            variants={subTextVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-base sm:text-lg font-semibold text-[#4F5B7C] max-w-2xl mx-auto pt-2 leading-relaxed"
          >
            Discover our wide range of English language learning programs, academic courses, and international teacher training resources.
          </motion.p>
        </div>

        {/* ── Category Cards Grid ── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 pt-8"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {CARDS_DATA.map((card, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="h-full relative pt-6"
            >
              <Link
                href={card.href}
                className={`flex flex-col h-full bg-white rounded-lg border-2 ${card.borderColor} ${card.bgColor} px-4 py-8 text-center shadow-md -translate-y-1 transition-all duration-300 group cursor-pointer hover:shadow-lg hover:-translate-y-1.5`}
              >
                {/* Top Middle Icon Badge overlapping the border */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 ${card.borderColor} p-2.5 rounded-lg shadow-xs flex items-center justify-center transition-transform duration-300 scale-110 group-hover:scale-115 z-20`}>
                  {card.icon}
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between h-full pt-4 space-y-2.5">
                  <h3 className="text-lg font-bold text-[#615fff] group-hover:text-[#d97706] transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-base text-zinc-500 font-semibold leading-relaxed flex-grow">
                    {card.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
