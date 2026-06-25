'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiArrowRight, FiBookOpen, FiUsers } from 'react-icons/fi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstructorDoc {
  id: string
  name: string
  profilePicUrl?: string
  courseCount: number
  studentCount: number
}

interface InstructorsSectionProps {
  instructors: InstructorDoc[]
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
}

// Avatar fallback with initials
function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E61C24]/20 to-[#E61C24]/5 text-[#E61C24] font-bold text-3xl">
      {initials}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstructorsSection({ instructors }: InstructorsSectionProps) {
  if (!instructors || instructors.length === 0) return null

  return (
    <section className="py-20 md:py-28 px-6 bg-[#0A163A] relative overflow-hidden select-text border-none">

      {/* Glowing purple-navy background spotlights */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[350px] bg-[#E61C24]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-[#E61C24]/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto relative z-10">

        {/* ── Header Row ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-4 max-w-2xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg shadow-sm border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#E61C24] animate-pulse" />
              <span className="text-sm font-bold text-white">Our Instructors</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.2]">
              Learn From{' '}
              <span className="text-[#A5B4FC]">Expert Instructors</span>
            </h2>

            {/* Subtitle */}
            <p className="text-base text-[#94A3B8] leading-relaxed font-normal">
              Our world-class instructors bring real-world experience and deep expertise to help you master your craft and advance your career.
            </p>
          </div>

          {/* View All Button */}
          <Link
            href="/courses"
            className="inline-flex items-center gap-3 px-6 py-3 bg-white hover:bg-zinc-100 text-[#0A163A] font-bold text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] group shrink-0 cursor-pointer border-none"
          >
            <span>View All Courses</span>
            <span className="w-6 h-6 rounded-full bg-[#0A163A]/10 flex items-center justify-center text-[#0A163A] transition-transform group-hover:translate-x-0.5">
              <FiArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        {/* ── Instructor Cards Grid ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {instructors.map((instructor) => (
            <motion.div
              key={instructor.id}
              variants={cardVariants}
              className="group bg-[#13234E]/60 border border-white/10 rounded-lg overflow-hidden hover:shadow-xl hover:shadow-[#E61C24]/15 transition-all duration-300 hover:-translate-y-1 hover:border-[#E61C24]/40"
            >
              {/* Profile Image */}
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#0A163A] relative">
                {instructor.profilePicUrl ? (
                  <img
                    src={instructor.profilePicUrl}
                    alt={instructor.name}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                  />
                ) : (
                  <AvatarFallback name={instructor.name} />
                )}

                {/* Subtle gradient at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>

              {/* Card Content */}
              <div className="p-5">
                {/* Name */}
                <h3 className="text-base font-bold text-white tracking-tight truncate mb-1">
                  {instructor.name}
                </h3>

                {/* Role label */}
                <p className="text-sm text-[#A5B4FC] font-semibold mb-4">Instructor</p>

                {/* Divider */}
                <div className="h-px bg-white/10 mb-4" />

                {/* Stats Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-[#94A3B8] font-medium">
                    <FiBookOpen className="h-4 w-4 text-[#A5B4FC] shrink-0" />
                    <span>{instructor.courseCount} {instructor.courseCount === 1 ? 'Course' : 'Courses'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#94A3B8] font-medium">
                    <FiUsers className="h-4 w-4 text-[#A5B4FC] shrink-0" />
                    <span>{instructor.studentCount.toLocaleString()} Students</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
