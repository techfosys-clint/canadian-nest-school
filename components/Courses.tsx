'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  FiGrid, FiCode, FiLayers, FiClipboard,
  FiTrendingUp, FiClock, FiBookOpen, FiArrowUpRight,
  FiZap, FiPackage, FiStar, FiUsers, FiUser, FiArrowRight
} from 'react-icons/fi'
import type { IconType } from 'react-icons'

// ─── Exported Types (used in page.tsx) ─────────────────────────────────────

interface MediaSize {
  url?: string | null
}

interface ThumbnailDoc {
  id: string
  url?: string | null
  alt?: string | null
  sizes?: {
    thumbnail?: MediaSize | null
    card?: MediaSize | null
    hero?: MediaSize | null
  }
}

export interface CategoryDoc {
  id: string
  name: string
  slug: string
}

export interface CourseDoc {
  id: string
  title: string
  slug: string
  summary: string
  price: number
  thumbnail: ThumbnailDoc | string | null
  category: CategoryDoc | string | null
  instructor?: { id: string; name: string } | null
  duration?: string | null
  level: 'all' | 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published'
  enrollmentCount?: number
  avgRating?: number
  reviewCount?: number
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CoursesProps {
  initialCourses: CourseDoc[]
  categories: CategoryDoc[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getImageUrl(thumbnail: CourseDoc['thumbnail']): string {
  if (!thumbnail || typeof thumbnail === 'string') return ''
  return thumbnail.sizes?.card?.url ?? thumbnail.url ?? ''
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `৳${price.toLocaleString('en-BD')}`
}



function getLevelLabel(level: CourseDoc['level']): string {
  const map: Record<string, string> = {
    all: 'All Levels',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }
  return map[level] ?? 'All Levels'
}

function getCategoryName(category: CourseDoc['category']): string {
  if (!category || typeof category === 'string') return ''
  return category.name
}

function getCategorySlug(category: CourseDoc['category']): string {
  if (!category || typeof category === 'string') return ''
  return category.slug
}

function getIconForCategory(slug: string): IconType {
  const map: Record<string, IconType> = {
    development: FiCode,
    programming: FiCode,
    'web-development': FiCode,
    design: FiLayers,
    'ui-ux': FiLayers,
    'ui-ux-design': FiLayers,
    marketing: FiTrendingUp,
    'digital-marketing': FiTrendingUp,
    business: FiTrendingUp,
    management: FiClipboard,
    'project-management': FiClipboard,
    'project-mgmt': FiClipboard,
    data: FiZap,
    'data-science': FiZap,
    science: FiZap,
  }
  return map[slug] ?? FiPackage
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
      delay: i * 0.1,
    },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18 } },
}

const sectionHeadVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Courses({ initialCourses, categories }: CoursesProps) {
  const [activeTab, setActiveTab] = useState('all')

  // Scroll-triggered gate: cards only animate when section enters viewport
  const cardsRef = useRef<HTMLDivElement>(null)
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.05 })

  // Heading ref for stagger control
  const headRef = useRef<HTMLDivElement>(null)
  const headInView = useInView(headRef, { once: true, amount: 0.3 })

  // Build dynamic tabs: "All" always first, then DB categories
  const tabs = [
    { id: 'all', label: 'All Courses', icon: FiGrid },
    ...categories.map((cat) => ({
      id: cat.slug,
      label: cat.name,
      icon: getIconForCategory(cat.slug),
    })),
  ]

  // Filter courses by active tab
  const filteredCourses = initialCourses.filter((course) => {
    if (activeTab === 'all') return true
    return getCategorySlug(course.category) === activeTab
  })

  // First course is featured, rest go to the grid
  const featuredCourse = filteredCourses[0] ?? null
  const regularCourses = filteredCourses.slice(1)

  return (
    <section
      id="courses"
      className="py-20 md:py-28 px-6 bg-[#f9fafb] border-t border-zinc-100 relative overflow-hidden"
    >

      {/* Background spotlights */}
      <div className="absolute top-1/3 right-0 w-112.5 h-112.5 bg-[#E61C24]/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-112.5 h-112.5 bg-[#E61C24]/4 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto relative z-10">

        {/* Section Title */}
        <div className="text-center mb-12" ref={headRef}>
          <motion.p
            custom={0}
            variants={sectionHeadVariants}
            initial="hidden"
            animate={headInView ? 'visible' : 'hidden'}
            className="text-base font-bold text-[#E61C24] mb-3 tracking-wide uppercase"
          >
            Featured Courses
          </motion.p>
          <motion.h2
            custom={0.12}
            variants={sectionHeadVariants}
            initial="hidden"
            animate={headInView ? 'visible' : 'hidden'}
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-sans text-[#000000] tracking-tight leading-[1.2]"
          >
            Master English Confidently <br className="hidden sm:block" /> with Our <span className="text-[#E61C24]">Top Programs</span>
          </motion.h2>
        </div>

        {/* Category Tabs */}
        <motion.div
          custom={0.22}
          variants={sectionHeadVariants}
          initial="hidden"
          animate={headInView ? 'visible' : 'hidden'}
          className="hidden md:flex flex-wrap items-center justify-center gap-3 mb-12 px-4"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`relative flex items-center gap-2 px-5 py-3.5 rounded-lg border font-bold text-base whitespace-nowrap transition-colors duration-300 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-[#E61C24] text-white border-transparent shadow-md shadow-[#E61C24]/20'
                    : 'bg-white text-[#4b5563] border-zinc-200/80 hover:border-[#E61C24]/30 hover:text-[#0A163A] hover:bg-[#E61C24]/4'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{tab.label}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Course Grid / Empty State */}
        <div ref={cardsRef} />
        <AnimatePresence mode="wait">
          {filteredCourses.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="h-16 w-16 rounded-lg bg-[#E61C24]/8 flex items-center justify-center mb-5">
                <FiBookOpen className="h-7 w-7 text-[#E61C24]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 mb-2">No courses yet</h3>
              <p className="text-base font-semibold text-zinc-400 max-w-xs">
                Courses in this category will appear here once published.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Featured Wide Card */}
              {featuredCourse && (
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="hidden"
                  animate={cardsInView ? 'visible' : 'hidden'}
                  whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                  className="hidden md:block bg-white rounded-lg border border-zinc-200/80 p-5 md:p-6 shadow-sm hover:shadow-lg hover:border-[#E61C24]/20 transition-all duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                    {/* Image */}
                    <div className="lg:col-span-6 relative aspect-[16/10] bg-[#f9fafb] rounded-lg overflow-hidden border border-zinc-100">
                      {getImageUrl(featuredCourse.thumbnail) ? (
                        <img
                          src={getImageUrl(featuredCourse.thumbnail)}
                          alt={featuredCourse.title}
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            // Clear src so we can render the CSS fallback instead of a broken image
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.css-placeholder');
                              if (fallback) fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <div className={`css-placeholder w-full h-full bg-gradient-to-br from-[#0A163A] to-[#121212] flex flex-col items-center justify-center border border-white/5 absolute inset-0 ${getImageUrl(featuredCourse.thumbnail) ? 'hidden' : ''}`}>
                        <span className="h-14 w-14 rounded-lg bg-[#E61C24]/20 flex items-center justify-center font-bold text-white shadow-lg text-lg mb-2">
                          C
                        </span>
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Canadian Nest</span>
                      </div>
                      {/* Level badge on image */}
                      <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-zinc-700 font-bold text-base shadow-sm border border-zinc-100">
                        {getLevelLabel(featuredCourse.level)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-6">
                      <div className="space-y-4">

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3.5 py-1.5 bg-[#E61C24]/8 text-[#E61C24] rounded-lg font-bold text-base border border-[#E61C24]/15">
                            {getCategoryName(featuredCourse.category) || 'Course'}
                          </span>
                          <span className="px-3.5 py-1.5 bg-zinc-950 text-white rounded-lg font-bold text-base flex items-center gap-1.5 shadow-sm">
                            <FiZap className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span>Featured</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl sm:text-3xl font-bold text-[#0A163A] leading-snug tracking-tight">
                          {featuredCourse.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-base sm:text-lg font-semibold text-[#4b5563] leading-relaxed max-w-xl line-clamp-3">
                          {featuredCourse.summary}
                        </p>

                        {/* Meta stats */}
                        <div className="flex flex-wrap items-center gap-5 pt-2 border-b border-zinc-100 pb-4 text-base font-bold text-[#4b5563]">
                          {featuredCourse.duration && (
                            <span className="flex items-center gap-2">
                              <FiClock className="h-5 w-5 text-zinc-400" />
                              <span>{featuredCourse.duration}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <FiBookOpen className="h-5 w-5 text-zinc-400" />
                            <span>{getLevelLabel(featuredCourse.level)}</span>
                          </span>
                          {(featuredCourse.enrollmentCount ?? 0) > 0 && (
                            <span className="flex items-center gap-2">
                              <FiUsers className="h-5 w-5 text-zinc-400" />
                              <span>{featuredCourse.enrollmentCount} students</span>
                            </span>
                          )}
                          {(featuredCourse.avgRating ?? 0) > 0 && (
                            <span className="flex items-center gap-1.5">
                              <FiStar className="h-5 w-5 text-amber-400 fill-amber-400" />
                              <span className="text-zinc-700">{featuredCourse.avgRating}</span>
                              {(featuredCourse.reviewCount ?? 0) > 0 && (
                                <span className="text-zinc-400 font-semibold">({featuredCourse.reviewCount})</span>
                              )}
                            </span>
                          )}
                          {featuredCourse.instructor && (
                            <span className="flex items-center gap-2">
                              <FiUser className="h-5 w-5 text-zinc-400" />
                              <span>{featuredCourse.instructor.name}</span>
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Price & CTA */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <span className="text-3xl font-bold text-[#E61C24]">
                          {formatPrice(featuredCourse.price)}
                        </span>
                        <Link
                          href={`/courses/${featuredCourse.slug}`}
                          className="px-6 py-3 bg-[#E61C24] hover:bg-[#c3131a] text-white rounded-lg font-bold text-base transition-all duration-300 flex items-center gap-3 shadow-md shadow-[#E61C24]/10 hover:shadow-[#E61C24]/20 group border-none cursor-pointer"
                        >
                          <span>View Details</span>
                          <span className="h-7 w-7 rounded-full bg-white/20 group-hover:bg-white flex items-center justify-center text-white group-hover:text-[#E61C24] transition-colors duration-300">
                            <FiArrowUpRight className="h-4 w-4" />
                          </span>
                        </Link>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}


              {/* Regular Grid */}
              {filteredCourses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course, i) => (
                    <motion.div
                      key={course.id}
                      custom={i + 1}
                      variants={cardVariants}
                      initial="hidden"
                      animate={cardsInView ? 'visible' : 'hidden'}
                      className={`w-full flex justify-center sm:justify-start ${
                        i === 0 ? 'md:hidden' : ''
                      }`}
                    >
                      <Link
                        href={`/courses/${course.slug}`}
                        className="bg-white rounded-lg overflow-hidden border-0 border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(230,28,36,0.06)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full w-full max-w-[380px]"
                      >
                        {/* Aspect-ratio constrained image wrapper */}
                        <div className="relative aspect-[16/10] bg-[#f9fafb] overflow-hidden rounded-t-lg">
                          {getImageUrl(course.thumbnail) ? (
                            <img
                              src={getImageUrl(course.thumbnail)}
                              alt={course.title}
                              className="w-full h-full object-cover pointer-events-none group-hover:scale-[1.03] transition-transform duration-500 rounded-t-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.css-placeholder');
                                  if (fallback) fallback.classList.remove('hidden');
                                }
                              }}
                            />
                          ) : null}
                          <div className={`css-placeholder w-full h-full bg-gradient-to-br from-[#0A163A] to-[#121212] flex flex-col items-center justify-center border border-white/5 absolute inset-0 ${getImageUrl(course.thumbnail) ? 'hidden' : ''} rounded-t-lg`}>
                            <span className="h-10 w-10 rounded-lg bg-[#E61C24]/20 flex items-center justify-center font-bold text-white shadow-lg text-base mb-1.5">
                              C
                            </span>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Canadian Nest</span>
                          </div>
                          
                          {/* Rating Badge Overlay */}
                          {course.avgRating && course.avgRating > 0 ? (
                            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-lg flex items-center gap-1 border border-zinc-200/40 shadow-sm">
                              <FiStar className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              <span className="text-zinc-800 font-bold text-base">
                                {course.avgRating.toFixed(1)}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Content Details */}
                        <div className="p-5 md:p-6 flex-grow flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            
                            {/* Metadata (Duration, Level, Learners) */}
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#4b5563] text-base font-semibold mb-2">
                              {course.duration ? (
                                <span className="flex items-center gap-1 text-[#4b5563]">
                                  <FiClock className="h-4 w-4 text-zinc-400 shrink-0" />
                                  <span>{course.duration}</span>
                                </span>
                              ) : null}
                              {course.duration ? <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" /> : null}
                              
                              <span className="text-[#4b5563] font-medium">
                                {getLevelLabel(course.level)}
                              </span>
                              
                              {course.enrollmentCount && course.enrollmentCount > 0 ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                                  <span className="flex items-center gap-1 text-[#4b5563]">
                                    <FiUsers className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <span>{course.enrollmentCount} learners</span>
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-[#0A163A] text-lg sm:text-xl leading-snug group-hover:text-[#E61C24] transition-colors line-clamp-2">
                              {course.title}
                            </h3>
                            
                            {/* Instructor */}
                            {course.instructor && (
                              <p className="text-base text-[#4b5563] font-semibold truncate pt-0.5">
                                By {course.instructor.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-4">
                            {/* Price + CTA Button row */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                                <span className={`text-xl font-bold ${course.price === 0 ? 'text-emerald-600' : 'text-zinc-900'} truncate`}>
                                  {formatPrice(course.price)}
                                </span>
                              </div>

                              <div className="px-4 py-2 bg-[#E61C24] group-hover:bg-[#c3131a] rounded-lg text-base font-bold text-white shadow-md shadow-[#E61C24]/10 transition-all duration-300 flex items-center gap-2 shrink-0 whitespace-nowrap">
                                <span>Enroll Now</span>
                                <FiArrowRight className="h-4.5 w-4.5 text-white transition-transform duration-300 group-hover:translate-x-0.5 shrink-0" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="flex justify-center mt-16"
        >
          <Link
            href="/courses"
            className="px-6 py-4 bg-[#E61C24] hover:bg-[#c3131a] text-white font-bold text-base rounded-lg shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 flex items-center justify-center gap-3 group cursor-pointer border-none"
          >
            <span>View All Courses</span>
            <span className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-[#E61C24] transition-colors duration-300">
              <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        </motion.div>

      </div>
    </section>
  )
}
