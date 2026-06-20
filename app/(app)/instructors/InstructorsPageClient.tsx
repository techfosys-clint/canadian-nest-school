'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Courses from '@/components/Courses'
import Reviews from '@/components/Reviews'
import CTASection from '@/components/CTASection'
import type { CourseDoc, CategoryDoc } from '@/components/Courses'
import type { ReviewDoc } from '@/components/Reviews'

interface RealInstructor {
  id: string
  name: string
  email: string
  designation?: string
  profilePicUrl?: string
}

interface InstructorsPageClientProps {
  realInstructors: RealInstructor[]
  courses: CourseDoc[]
  categories: CategoryDoc[]
  reviews: ReviewDoc[]
}

const MOCK_MENTORS = [
  {
    name: 'Robert David',
    role: 'UI/UX Designer',
    bg: 'bg-[#FDE2CA]', // Pastel peach
    profilePicUrl: '/media/vxlpbiket9vqph7spwyngltvsmg-1779840199862-554434273.png'
  },
  {
    name: 'Ethan Samuel',
    role: 'Developer',
    bg: 'bg-[#C1F2E2]', // Pastel teal
    profilePicUrl: '/media/rrppejy37or3c1ehg8dislrjny-1779840200159-103378770.png'
  },
  {
    name: 'Alexander Paul',
    role: 'Project Manager',
    bg: 'bg-[#FDF0BE]', // Pastel yellow
    profilePicUrl: '/media/qqxygfrpzzveslnttt8tbpyyty-1779840200418-636067296.png'
  },
  {
    name: 'William Henry',
    role: 'Digital Marketer',
    bg: 'bg-[#FDCFDF]', // Pastel pink
    profilePicUrl: '/media/qz82hvtiuti1iiqemr8rcled0y-1779840200650-803315217.png'
  },
  {
    name: 'James Robert',
    role: 'Project Manager',
    bg: 'bg-[#FDE2CA]', // Pastel peach
    profilePicUrl: '/media/gxxhfh6uqztk5gqswsdcczhwpb0-1779840200885-780441840.png'
  },
  {
    name: 'Brandon Michael',
    role: 'Digital Marketer',
    bg: 'bg-[#C1F2E2]', // Pastel teal
    profilePicUrl: '/media/wlfcozjetqkfmzn9ctbaqxom-1779840201125-910407530.png'
  },
  {
    name: 'Matthew John',
    role: 'Software Engineer',
    bg: 'bg-[#FDF0BE]', // Pastel yellow
    profilePicUrl: '/media/3ul2gmpwxkjvp1r96k9qy7uvjk-1779840201353-176576378.png'
  },
  {
    name: 'Joseph Andrew',
    role: 'UI/UX Designer',
    bg: 'bg-[#FDCFDF]', // Pastel pink
    profilePicUrl: '/media/erlxh9zrrws3wckh39cxektsqag-1779840201569-732309520.png'
  }
]

export default function InstructorsPageClient({
  realInstructors,
  courses,
  categories,
  reviews
}: InstructorsPageClientProps) {
  // Combine real database instructors with mock mentors to create a full premium list of at least 8 profiles
  const combined = [
    ...realInstructors.map((ins, i) => ({
      name: ins.name,
      role: ins.designation || 'Expert Mentor',
      bg: ['bg-[#FDE2CA]', 'bg-[#C1F2E2]', 'bg-[#FDF0BE]', 'bg-[#FDCFDF]'][i % 4],
      profilePicUrl: ins.profilePicUrl || '/media/learning-journey.png'
    })),
    ...MOCK_MENTORS
  ]

  // Slice to guarantee at least 8 elements, or more if DB has more
  const finalInstructors = combined.slice(0, Math.max(8, realInstructors.length))

  // Framer Motion Animation Variants (Spring physics for bouncy premium transitions)
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  }

  const fadeInUp = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 85, damping: 15 },
    },
  }

  const cardsContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.25,
      },
    },
  }

  const cardAnim = {
    hidden: { opacity: 0, y: 35, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 75, damping: 13 },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAFB] via-[#F3F4F6]/40 to-[#ECEEFC]/50 select-text">
      
      {/* ── MENTORS GRID SECTION ── */}
      <section className="container mx-auto px-6 pt-36 pb-24 space-y-12">
        {/* Centered Header Section (Matching User Design) */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Centered Breadcrumbs */}
          <div className="flex items-center justify-center gap-1.5 text-base font-semibold text-zinc-500 mb-2 select-none">
            <Link href="/" className="hover:text-[#E61C24] transition-colors">Home</Link>
            <span className="text-zinc-300 font-normal">/</span>
            <span className="text-[#0A163A]">Mentors</span>
          </div>

          {/* Centered Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E61C24]/8 border border-[#E61C24]/15 rounded-full select-none shadow-sm shadow-[#E61C24]/5">
            <span className="w-2 h-2 rounded-full bg-[#E61C24] animate-pulse" />
            <span className="text-sm font-bold text-[#E61C24] uppercase tracking-wider">Instructor</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A163A] tracking-tight leading-[1.2]">
            Meet Our Expert <span className="text-[#E61C24]">Educators</span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg font-semibold text-[#4F5B7C] leading-relaxed max-w-2xl mx-auto">
            Learn directly from highly qualified professionals and certified educators dedicated to maintaining Canadian and International teaching standards.
          </p>
        </div>
 
        {/* Mentor Cards Grid - Staggered fade in up showing one by one */}
        <motion.div 
          variants={cardsContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {finalInstructors.map((instructor, idx) => (
            <motion.div
              variants={cardAnim}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' as const } }}
              key={idx}
              className="bg-white rounded-lg p-3 shadow-md shadow-zinc-200/40 hover:shadow-lg hover:shadow-zinc-300/50 transition-all duration-300 border border-zinc-100 flex flex-col group cursor-pointer"
            >
              {/* Photo Box with Solid Pastel BG */}
              <div className={`aspect-[10/9] ${instructor.bg} rounded-lg overflow-hidden relative flex items-end justify-center`}>
                <img
                  src={instructor.profilePicUrl}
                  alt={instructor.name}
                  className="w-full h-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
              </div>
 
              {/* Text Info */}
              <div className="py-5 text-center space-y-1 bg-white">
                <h3 className="text-lg font-bold text-[#0A163A] leading-tight select-text transition-colors group-hover:text-[#E61C24]">
                  {instructor.name}
                </h3>
                <p className="text-sm font-semibold text-[#E61C24] select-text">
                  {instructor.role}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── INTERACTIVE COURSES SECTION ── */}
      <section className="bg-white border-t border-zinc-100">
        <Courses initialCourses={courses} categories={categories} />
      </section>

      {/* ── TESTIMONIALS & REVIEWS SECTION ── */}
      <section className="bg-[#FAFBFD] border-t border-zinc-100">
        <Reviews reviews={reviews} />
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <CTASection />

    </div>
  )
}
