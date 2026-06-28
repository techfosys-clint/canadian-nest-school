'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSearch, FiX, FiClock, FiUsers, FiStar,
  FiArrowUpRight, FiUser, FiGrid, FiList, FiChevronDown, FiChevronRight,
  FiBookOpen, FiArrowRight, FiSliders
} from 'react-icons/fi'
import type { CourseDoc, CategoryDoc } from '@/components/Courses'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getImageUrl(thumbnail: CourseDoc['thumbnail']): string {
  if (!thumbnail || typeof thumbnail === 'string') return ''
  return (thumbnail as any).sizes?.card?.url ?? (thumbnail as any).url ?? ''
}
function formatPrice(price?: number | null): string {
  if (!price || price === 0) return 'Free'
  return `৳${price.toLocaleString('en-BD')}`
}

function getLevelLabel(level: string): string {
  const map: Record<string, string> = {
    all: 'All Levels',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }
  return map[level] ?? 'All Levels'
}
function getCategoryName(category: CourseDoc['category']): string {
  if (!category || typeof category === 'string') return 'Course'
  return (category as any).name
}

function getCategorySlug(category: CourseDoc['category']): string {
  if (!category || typeof category === 'string') return ''
  return (category as any).slug
}

const LEVELS = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

const PRICE_TIERS = [
  { value: 'all',  label: 'All' },
  { value: 'subscription', label: 'Subscription (Mock)' },
  { value: 'paid', label: 'Paid' },
  { value: 'free', label: 'Free' },
]

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'bengali', label: 'Bengali' },
]

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, view }: { course: CourseDoc; view: 'grid' | 'list' }) {
  const imgUrl = getImageUrl(course.thumbnail)

  if (view === 'list') {
    return (
      <Link
        href={`/courses/${course.slug}`}
        className="flex flex-col md:flex-row gap-6 bg-white rounded-lg p-5 border border-[#E61C24]/20 hover:border-[#E61C24]/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(230,28,36,0.10)] hover:-translate-y-1 transition-all duration-300 group w-full"
      >
        {/* Aspect-ratio constrained image wrapper */}
        <div className="shrink-0 w-full md:w-60 aspect-[16/10] rounded-lg overflow-hidden bg-zinc-50 relative">
          {imgUrl ? (
            <img 
              src={imgUrl} 
              alt={course.title} 
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 rounded-lg" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0A163A] to-[#1e1b4b] flex items-center justify-center rounded-lg">
              <span className="h-10 w-10 rounded-lg bg-[#E61C24]/30 flex items-center justify-center font-bold text-white text-base">T</span>
            </div>
          )}
          
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
        
        {/* Info */}
        <div className="flex-grow min-w-0 flex flex-col justify-between py-1 gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-base">
              <span className="font-bold text-[#E61C24] bg-[#E61C24]/8 px-3 py-1 rounded-lg text-base uppercase">
                {getCategoryName(course.category)}
              </span>
              
              {course.duration ? (
                <span className="flex items-center gap-1 text-zinc-500 font-semibold">
                  <FiClock className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>{course.duration}</span>
                </span>
              ) : null}
              
              <span className="text-zinc-500 font-semibold">
                {getLevelLabel(course.level)}
              </span>
              
              {course.enrollmentCount && course.enrollmentCount > 0 ? (
                <span className="flex items-center gap-1 text-zinc-500 font-semibold">
                  <FiUsers className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>{course.enrollmentCount} learners</span>
                </span>
              ) : null}
            </div>
            
            <h3 className="font-bold text-[#0A163A] text-xl leading-snug group-hover:text-[#E61C24] transition-colors line-clamp-2">
              {course.title}
            </h3>
            
            {course.instructor && (
              <p className="text-base text-zinc-500 flex items-center gap-2 pt-0.5 font-semibold">
                <FiUser className="h-4.5 w-4.5 text-zinc-400" /> 
                <span>By {course.instructor.name}</span>
              </p>
            )}
            <p className="text-base text-zinc-500 line-clamp-2 leading-relaxed">
              {course.summary}
            </p>
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
              <span className={`text-lg sm:text-xl font-bold ${course.price === 0 ? 'text-emerald-600' : 'text-zinc-900'} truncate`}>
                {formatPrice(course.price)}
              </span>
            </div>

            <div className="px-4 py-2 border border-[#E61C24] bg-[#E61C24] group-hover:bg-[#c3131a] group-hover:border-[#c3131a] rounded-lg text-base font-semibold text-white transition-all duration-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span>Enroll Now</span>
              <FiArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-0.5 shrink-0" />
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Grid card — Premium borderless visual design with NO fake data
  return (
    <div className="w-full flex justify-center sm:justify-start">
      <Link
        href={`/courses/${course.slug}`}
        className="bg-white rounded-lg overflow-hidden border border-[#E61C24]/20 hover:border-[#E61C24]/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(230,28,36,0.10)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full w-full max-w-[380px]"
      >
        {/* Aspect-ratio constrained image wrapper */}
        <div className="relative aspect-[16/10] bg-zinc-50 overflow-hidden rounded-t-lg">
          {imgUrl ? (
            <img 
              src={imgUrl} 
              alt={course.title} 
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 rounded-t-lg" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0A163A] to-[#1e1b4b] flex flex-col items-center justify-center rounded-t-lg">
              <span className="h-12 w-12 rounded-lg bg-[#E61C24]/25 flex items-center justify-center font-bold text-white mb-2 text-lg">C</span>
              <span className="text-base font-bold text-zinc-400 uppercase tracking-wider">Canadian Nest</span>
            </div>
          )}
          
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
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-zinc-400 text-base font-semibold mb-2">
              {course.duration ? (
                <span className="flex items-center gap-1 text-zinc-500">
                  <FiClock className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>{course.duration}</span>
                </span>
              ) : null}
              {course.duration ? <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" /> : null}
              
              <span className="text-zinc-500 font-medium">
                {getLevelLabel(course.level)}
              </span>
              
              {course.enrollmentCount && course.enrollmentCount > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                  <span className="flex items-center gap-1 text-zinc-500">
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
              <p className="text-base text-zinc-500 font-semibold truncate pt-0.5">
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

              <div className="px-4 py-2 border border-[#E61C24] bg-[#E61C24] group-hover:bg-[#c3131a] group-hover:border-[#c3131a] rounded-lg text-base font-semibold text-white transition-all duration-300 flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span>Enroll Now</span>
                <FiArrowRight className="h-4.5 w-4.5 text-white transition-transform duration-300 group-hover:translate-x-0.5 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── Sidebar Section ──────────────────────────────────────────────────────────

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="py-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-base font-bold text-[#0A163A] cursor-pointer hover:text-[#E61C24] transition-colors py-1"
      >
        <span>{title}</span>
        <FiChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Client Page ─────────────────────────────────────────────────────────

export default function CoursesPageClient({
  courses,
  categories,
}: {
  courses: CourseDoc[]
  categories: CategoryDoc[]
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeLevels, setActiveLevels] = useState<string[]>([])
  const [priceTier, setPriceTier] = useState('all')
  const [activeLanguages, setActiveLanguages] = useState<string[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  
  // Category list pagination toggle (Show More / Show Less)
  const [showAllCategories, setShowAllCategories] = useState(false)

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (activeLevels.length > 0) count += activeLevels.length
    if (priceTier !== 'all') count += 1
    if (activeLanguages.length > 0) count += activeLanguages.length
    return count
  }, [activeLevels, priceTier, activeLanguages])

  const toggleLevel = (lvl: string) => {
    setActiveLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    )
  }

  const toggleLanguage = (lang: string) => {
    setActiveLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const filtered = useMemo(() => {
    let result = [...courses]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          getCategoryName(c.category).toLowerCase().includes(q)
      )
    }

    if (activeCategory !== 'all') {
      result = result.filter((c) => getCategorySlug(c.category) === activeCategory)
    }

    if (activeLevels.length > 0) {
      result = result.filter((c) => activeLevels.includes(c.level))
    }

    if (priceTier === 'free') {
      result = result.filter((c) => c.price === 0)
    } else if (priceTier === 'paid') {
      result = result.filter((c) => c.price > 0)
    }

    if (activeLanguages.length > 0) {
      // Mock filtering support for languages
      result = result.filter((c) => {
        return activeLanguages.some((lang) => {
          if (lang === 'bengali') {
            return /[\u0980-\u09FF]/.test(c.title + c.summary)
          }
          if (lang === 'english') {
            return !/[\u0980-\u09FF]/.test(c.title + c.summary)
          }
          return true
        })
      })
    }

    return result
  }, [courses, search, activeCategory, activeLevels, priceTier, activeLanguages])

  const hasFilters = search || activeCategory !== 'all' || activeLevels.length > 0 || priceTier !== 'all' || activeLanguages.length > 0

  const clearAll = () => {
    setSearch('')
    setActiveCategory('all')
    setActiveLevels([])
    setPriceTier('all')
    setActiveLanguages([])
  }

  // Decide how many categories to list initially
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fafafa] to-[#f9fafb] font-sans pb-20 relative flex flex-col pt-22">
      {/* Background glow accents (confined to absolute layer to prevent sticky scroll breaking) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#E61C24]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-[#FDBF2D]/3 rounded-full blur-[120px]" />
      </div>

      {/* ── Page Header (Redesigned with Premium Glassmorphism & Soft Glow - Full Width) ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-zinc-950 py-12 md:py-16 text-center overflow-hidden shadow-lg select-text w-full z-10 border-none"
      >
        {/* Glowing gradient circles behind */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#E61C24]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none" />
 
        {/* Premium Dot grid background inside the card */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{ 
            backgroundImage: 'radial-gradient(white 1.2px, transparent 1.2px)', 
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }}
        />
 
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center w-full max-w-5xl">
          {/* Pill Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-base font-bold text-white uppercase tracking-wide mb-4 border-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Our Courses</span>
          </motion.div>
          
          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.2] font-display max-w-4xl"
          >
            Our Popular Courses
          </motion.h1>
          
          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 text-base sm:text-lg text-white/85 max-w-3xl mx-auto leading-relaxed font-semibold"
          >
            Enhance your <span className="text-[#E61C24] font-bold">English fluency</span> and communication skills with our specialized courses designed for <span className="text-[#E61C24] font-bold">kids, teens, adults, and educators</span>.
          </motion.p>
        </div>
      </motion.div>

      {/* ── Page Layout Container ── */}
      <div className="container mx-auto px-6 py-8 flex flex-col gap-8 relative z-10 flex-grow">
        
        {/* ── Content Grid with Sidebar & Cards ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start relative mt-4">
          
          {/* ── STICKY SIDEBAR (Left Column, border-based design without shadow) ── */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-6 lg:sticky lg:top-28 z-20">
            
            {/* Browse Categories Box */}
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow space-y-4 border-none">
              <h3 className="text-xl font-bold text-[#0A163A]">Browse Categories</h3>
              
              <div className="space-y-1 mt-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-base font-bold transition-all cursor-pointer ${
                    activeCategory === 'all'
                      ? 'bg-[#E61C24] text-white'
                      : 'text-zinc-650 hover:text-[#0A163A] hover:bg-[#E61C24]/5'
                  }`}
                >
                  <span>All Categories</span>
                  <span className={`text-base font-bold rounded-lg px-2.5 py-0.5 ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                    {courses.length}
                  </span>
                </button>

                {displayedCategories.map((cat) => {
                  const count = courses.filter((c) => getCategorySlug(c.category) === cat.slug).length
                  const active = activeCategory === cat.slug
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.slug)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-base font-semibold transition-all cursor-pointer capitalize ${
                        active 
                          ? 'text-[#E61C24] font-bold bg-[#E61C24]/8' 
                          : 'text-zinc-650 hover:text-[#0A163A] hover:bg-[#E61C24]/5'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FiChevronRight className={`h-4.5 w-4.5 transition-transform ${active ? 'text-[#E61C24] translate-x-0.5' : 'text-zinc-400'}`} />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className={`text-base font-bold rounded-lg px-2.5 py-0.5 ${active ? 'bg-[#E61C24]/15 text-[#E61C24]' : 'bg-zinc-150 text-zinc-500'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}

                {/* Show More toggle button */}
                {categories.length > 5 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full text-left px-3.5 py-3 text-base font-bold text-[#E61C24] hover:text-[#c3131a] transition-colors cursor-pointer mt-1"
                  >
                    {showAllCategories ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
            </div>

            {/* Filters Box */}
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow space-y-6 border-none">
              <h3 className="text-xl font-bold text-[#0A163A]">Filters</h3>
              
              {/* Price Tier Filter */}
              <div className="space-y-3">
                <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Tier</p>
                <div className="space-y-2.5">
                  {PRICE_TIERS.map((tier) => (
                    <label key={tier.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="tier"
                        value={tier.value}
                        checked={priceTier === tier.value || (tier.value === 'all' && priceTier === 'all')}
                        onChange={() => {
                          if (tier.value === 'subscription') return
                          setPriceTier(tier.value)
                        }}
                        disabled={tier.value === 'subscription'}
                        className="w-5 h-5 accent-[#E61C24] cursor-pointer"
                      />
                      <span className={`text-base font-semibold transition-colors duration-200 ${
                        priceTier === tier.value ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                      } ${tier.value === 'subscription' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {tier.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Language Filter */}
              <div className="space-y-3">
                <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Language</p>
                <div className="space-y-2.5">
                  {LANGUAGES.map((lang) => (
                    <label key={lang.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        value={lang.value}
                        checked={activeLanguages.includes(lang.value)}
                        onChange={() => toggleLanguage(lang.value)}
                        className="w-5 h-5 accent-[#E61C24] cursor-pointer rounded"
                      />
                      <span className={`text-base font-semibold transition-colors duration-200 ${
                        activeLanguages.includes(lang.value) ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                      }`}>
                        {lang.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Levels Filter */}
              <div className="space-y-3">
                <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Level</p>
                <div className="space-y-2.5">
                  {LEVELS.map((lvl) => (
                    <label key={lvl.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        value={lvl.value}
                        checked={activeLevels.includes(lvl.value)}
                        onChange={() => toggleLevel(lvl.value)}
                        className="w-5 h-5 accent-[#E61C24] cursor-pointer rounded"
                      />
                      <span className={`text-base font-semibold transition-colors duration-200 ${
                        activeLevels.includes(lvl.value) ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                      }`}>
                        {lvl.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear filters trigger */}
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="mt-6 w-full text-base font-bold text-rose-500 hover:text-white hover:bg-rose-500 bg-rose-50 rounded-lg py-3 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiX className="h-5 w-5" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          </aside>

          {/* ── MAIN CONTENT (Right Column) ── */}
          <main className="flex-grow min-w-0 w-full space-y-6">
            
            {/* Horizontal category scroll bar for mobile */}
            <div 
              className="lg:hidden flex items-center gap-2 overflow-x-auto pb-4 pt-1 -mx-6 px-6 no-scrollbar"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <button
                onClick={() => setActiveCategory('all')}
                className={`shrink-0 px-4 py-2 rounded-lg text-base font-bold transition-all border cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-[#E61C24] text-white border-[#E61C24]'
                    : 'bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                All ({courses.length})
              </button>
              {categories.map((cat) => {
                const count = courses.filter((c) => getCategorySlug(c.category) === cat.slug).length
                const active = activeCategory === cat.slug
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-base font-semibold transition-all border capitalize cursor-pointer ${
                      active
                        ? 'bg-[#E61C24]/10 text-[#E61C24] border-[#E61C24] font-bold'
                        : 'bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                )
              })}
            </div>

            {/* Search + View Toggle bar matching design (completely shadowless) */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white rounded-lg p-3 border border-zinc-200">
              <div className="flex-grow flex items-center gap-3 pl-3 w-full">
                <FiSearch className="h-5 w-5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, or topics..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent outline-none text-base text-[#0A163A] placeholder:text-zinc-400 font-semibold"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-base font-bold text-[#0A163A] hover:bg-zinc-50 transition-all cursor-pointer flex-grow sm:flex-grow-0 justify-center"
                >
                  <FiSliders className="h-4.5 w-4.5 text-zinc-500" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-[#E61C24] text-white text-xs font-bold rounded-full w-5.5 h-5.5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center bg-zinc-100/80 rounded-lg p-1.5 gap-1.5 shrink-0">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${view === 'grid' ? 'bg-white text-[#E61C24] font-bold border border-zinc-200' : 'bg-transparent text-zinc-500 hover:text-[#0A163A]'}`}
                  >
                    <FiGrid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${view === 'list' ? 'bg-white text-[#E61C24] font-bold border border-zinc-200' : 'bg-transparent text-zinc-500 hover:text-[#0A163A]'}`}
                  >
                    <FiList className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>



            {/* Title / Counter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-2xl font-bold font-display text-[#0A163A]">
                  All Courses
                </h1>
                <p className="text-base text-zinc-550 font-semibold mt-1">
                  Showing <span className="font-bold text-[#E61C24]">{filtered.length}</span> courses found
                </p>
              </div>
              
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 text-rose-500 hover:text-white hover:bg-rose-500 text-base font-bold rounded-lg transition-all cursor-pointer"
                >
                  <FiX className="h-5 w-5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Course Grid / List View */}
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-28 text-center bg-white rounded-lg border border-zinc-200"
                >
                  <div className="h-14 w-14 rounded-lg bg-[#E61C24]/8 flex items-center justify-center mb-4">
                    <FiSearch className="h-6 w-6 text-[#E61C24]" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-1">No courses found</h3>
                  <p className="text-base text-zinc-450 max-w-xs mb-6 font-semibold">Try adjusting filters or searching different keywords.</p>
                  <button
                    onClick={clearAll}
                    className="px-6 py-3.5 bg-[#E61C24] hover:bg-[#c3131a] text-white font-bold text-base rounded-lg transition-all duration-300 cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={view + activeCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={
                    view === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-start'
                      : 'flex flex-col gap-5'
                  }
                >
                  {filtered.map((course) => (
                    <CourseCard key={course.id} course={course} view={view} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer - Rendered at root level with high z-index to overlay navbar and prevent stacking/scrolling issues */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFiltersOpen(false)}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-[100] lg:hidden"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 w-[300px] bg-white shadow-2xl z-[100] flex flex-col lg:hidden border-l border-zinc-200"
            >
              {/* Header inside the drawer */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <FiSliders className="h-5 w-5 text-[#E61C24]" />
                  <h3 className="text-lg font-bold text-[#0A163A]">Filters</h3>
                </div>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-2 -mr-2 rounded-lg text-zinc-500 hover:text-[#0A163A] hover:bg-zinc-100 transition-colors"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {/* Price Tier Filter */}
                <div className="space-y-3">
                  <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Tier</p>
                  <div className="space-y-2.5">
                    {PRICE_TIERS.map((tier) => (
                      <label key={tier.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="mobile-tier"
                          value={tier.value}
                          checked={priceTier === tier.value || (tier.value === 'all' && priceTier === 'all')}
                          onChange={() => {
                            if (tier.value === 'subscription') return
                            setPriceTier(tier.value)
                          }}
                          disabled={tier.value === 'subscription'}
                          className="w-5 h-5 accent-[#E61C24] cursor-pointer"
                        />
                        <span className={`text-base font-semibold transition-colors duration-200 ${
                          priceTier === tier.value ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                        } ${tier.value === 'subscription' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {tier.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Language Filter */}
                <div className="space-y-3">
                  <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Language</p>
                  <div className="space-y-2.5">
                    {LANGUAGES.map((lang) => (
                      <label key={lang.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          value={lang.value}
                          checked={activeLanguages.includes(lang.value)}
                          onChange={() => toggleLanguage(lang.value)}
                          className="w-5 h-5 accent-[#E61C24] cursor-pointer rounded"
                        />
                        <span className={`text-base font-semibold transition-colors duration-200 ${
                          activeLanguages.includes(lang.value) ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                        }`}>
                          {lang.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Levels Filter */}
                <div className="space-y-3">
                  <p className="text-base font-bold text-[#0A163A] uppercase tracking-wider">Level</p>
                  <div className="space-y-2.5">
                    {LEVELS.map((lvl) => (
                      <label key={lvl.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          value={lvl.value}
                          checked={activeLevels.includes(lvl.value)}
                          onChange={() => toggleLevel(lvl.value)}
                          className="w-5 h-5 accent-[#E61C24] cursor-pointer rounded"
                        />
                        <span className={`text-base font-semibold transition-colors duration-200 ${
                          activeLevels.includes(lvl.value) ? 'text-[#E61C24] font-bold' : 'text-zinc-650 group-hover:text-zinc-800'
                        }`}>
                          {lvl.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Drawer */}
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
                {hasFilters && (
                  <button
                    onClick={() => {
                      clearAll()
                      setIsMobileFiltersOpen(false)
                    }}
                    className="w-full text-base font-bold text-rose-500 hover:text-white hover:bg-rose-500 bg-rose-50 rounded-lg py-3 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FiX className="h-5 w-5" />
                    <span>Clear All Filters</span>
                  </button>
                )}
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full text-center py-3 rounded-lg text-base font-bold bg-[#E61C24] hover:bg-[#c3131a] text-white shadow-md shadow-[#E61C24]/15 transition-all cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
