'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FiBookOpen, FiLayers, FiMessageCircle, FiAward, FiUsers, FiShoppingBag, FiCheck, FiCompass
} from 'react-icons/fi'

interface CategoriesProps {
  categories?: any[]
}

const CARDS_DATA = [
  {
    title: 'English for Kids',
    description: 'Game based phonics with grammar, Reading, Speaking, Writing .',
    icon: <FiBookOpen className="h-6 w-6 text-[#3b82f6]" />,
    iconColor: 'text-[#3b82f6]',
    borderColor: 'border-[#3b82f6]',
    bgColor: 'bg-[#3b82f6]/5',
    href: '/courses?category=kids',
  },
  {
    title: 'English for Teens',
    description: 'Academic English and communication skills.',
    icon: <FiLayers className="h-6 w-6 text-[#10b981]" />,
    iconColor: 'text-[#10b981]',
    borderColor: 'border-[#10b981]',
    bgColor: 'bg-[#10b981]/5',
    href: '/courses?category=teens',
  },
  {
    title: 'English for Adults',
    description: 'Speak confidently in everyday situations.',
    icon: <FiMessageCircle className="h-6 w-6 text-[#f97316]" />,
    iconColor: 'text-[#f97316]',
    borderColor: 'border-[#f97316]',
    bgColor: 'bg-[#f97316]/5',
    href: '/courses?category=adults',
  },
  {
    title: 'IELTS Preparation',
    description: 'Achieve your target IELTS score.',
    icon: <FiAward className="h-6 w-6 text-[#ef4444]" />,
    iconColor: 'text-[#ef4444]',
    borderColor: 'border-[#ef4444]',
    bgColor: 'bg-[#ef4444]/5',
    href: '/courses?category=ielts',
  },
  {
    title: 'Teacher Training',
    description: 'International teaching methods and strategies.',
    icon: <FiUsers className="h-6 w-6 text-[#a855f7]" />,
    iconColor: 'text-[#a855f7]',
    borderColor: 'border-[#a855f7]',
    bgColor: 'bg-[#a855f7]/5',
    href: '/courses?category=teacher-training',
  },
  {
    title: 'Academic Tutoring',
    description: 'Personalized school support and exam preparation.',
    icon: <FiBookOpen className="h-6 w-6 text-[#ec4899]" />,
    iconColor: 'text-[#ec4899]',
    borderColor: 'border-[#ec4899]',
    bgColor: 'bg-[#ec4899]/5',
    href: '/courses',
  },
  {
    title: 'Educational Shop',
    description: 'Books, worksheets, courses, teaching resources.',
    icon: <FiShoppingBag className="h-6 w-6 text-[#eab308]" />,
    iconColor: 'text-[#eab308]',
    borderColor: 'border-[#eab308]',
    bgColor: 'bg-[#eab308]/5',
    href: '/courses',
  },
  {
    title: 'Explore Courses',
    description: 'Browse all available learning programs and resources.',
    icon: <FiCompass className="h-6 w-6 text-[#6366f1]" />,
    iconColor: 'text-[#6366f1]',
    borderColor: 'border-[#6366f1]',
    bgColor: 'bg-[#6366f1]/5',
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
    <section className="py-20 md:py-28 px-6 bg-[#f9fafb] border-t border-zinc-100 relative overflow-hidden">
      
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
        style={{ backgroundImage: 'radial-gradient(#E61C24 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
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
        <div className="text-center mb-8 space-y-4 relative z-30 py-2">
          <motion.h2
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#000000] tracking-tight leading-[1.2] max-w-4xl mx-auto"
          >
            <span className="block mb-1"><span className="text-[#E61C24]">ESL resources</span> for teaching</span>
            <span className="block">English to kids & teens</span>
          </motion.h2>
          
          <motion.p
            variants={subTextVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-base sm:text-lg font-semibold text-[#4b5563] max-w-2xl mx-auto pt-2 leading-relaxed"
          >
            Discover our wide range of English language learning programs, academic courses, and international teacher training resources.
          </motion.p>
        </div>

        {/* ── Category Cards Grid ── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2"
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
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 ${card.borderColor} rounded-lg shadow-xs flex items-center justify-center transition-all duration-500 scale-110 group-hover:scale-115 z-20 w-12 h-12`}>
                  {/* Default Icon: fades out and rotates on hover */}
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-75 group-hover:rotate-45">
                    {card.icon}
                  </div>
                  {/* Checkmark Icon: fades in, scales up, and rotates into place on hover */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out opacity-0 scale-50 -rotate-45 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0 ${card.iconColor}`}>
                    <FiCheck className="h-6 w-6" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between h-full pt-4 space-y-2.5">
                  <h3 className="text-lg font-bold text-[#0A163A] group-hover:text-[#E61C24] transition-colors leading-snug">
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
