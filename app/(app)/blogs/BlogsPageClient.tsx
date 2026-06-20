'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiCalendar, FiClock, FiArrowRight, FiTag, FiBookOpen, FiX, FiFilter } from 'react-icons/fi'

interface BlogItem {
  id: string
  title: string
  content: string
  authorName: string
  authorProfilePicUrl: string
  coverImageUrl: string
  publishedDate: string
  tags: { tag: string }[]
}

interface BlogsPageClientProps {
  initialBlogs: BlogItem[]
}

// Format date helper: "14 Jan 2026"
function formatDate(dateStr?: Date | string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Helper to strip HTML tags for safe preview rendering
function getPlainPreview(htmlContent: string, maxLength = 120): string {
  if (!htmlContent) return ''
  const stripped = htmlContent.replace(/<[^>]*>/g, ' ')
  const cleaned = stripped.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

// Calculate reading time
function calculateReadingTime(htmlContent: string): number {
  if (!htmlContent) return 1
  const words = htmlContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length
  const wordsPerMinute = 200
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export default function BlogsPageClient({ initialBlogs }: BlogsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Extract all unique tags across all blogs
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>()
    initialBlogs.forEach(blog => {
      if (blog.tags) {
        blog.tags.forEach(t => {
          if (t.tag) tagsSet.add(t.tag.toLowerCase())
        })
      }
    })
    return Array.from(tagsSet)
  }, [initialBlogs])

  // Filtered blogs list
  const filteredBlogs = useMemo(() => {
    return initialBlogs.filter(blog => {
      const matchesSearch = 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTag = 
        !selectedTag || 
        (blog.tags && blog.tags.some(t => t.tag.toLowerCase() === selectedTag.toLowerCase()))

      return matchesSearch && matchesTag
    })
  }, [initialBlogs, searchQuery, selectedTag])

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

  const searchAnim = {
    hidden: { opacity: 0, scale: 0.94, y: 25 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 75, damping: 14, delay: 0.2 },
    },
  }

  const filterDockAnim = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 75, damping: 14, delay: 0.3 },
    },
  }

  return (
    <div className="w-full">
      
      {/* ── SECTION 1: HERO HEADER WITH CENTERED SEARCH BAR & THEME BG ── */}
      <section className="w-full bg-[#f8fafc] border-b border-zinc-200/80 py-16 relative overflow-hidden">
        {/* Soft atmospheric ambient blurs */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#E61C24]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[110px] pointer-events-none" />

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="container mx-auto px-6 text-center space-y-6 relative z-10 flex flex-col items-center"
        >
          
          {/* Centered Category Badge */}
          <motion.span 
            variants={fadeInUp}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-1 rounded-full bg-[#E61C24]/10 text-[#E61C24] text-base font-bold"
          >
            <FiBookOpen className="h-4.5 w-4.5" />
            Knowledge Hub
          </motion.span>
          
          {/* Centered Heading with Premium Word Mask Reveal */}
          <motion.h1 
            variants={staggerContainer}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.2] text-center max-w-4xl flex flex-wrap justify-center gap-x-2.5 overflow-hidden py-1"
          >
            {"Insights & Educational".split(" ").map((word, i) => (
              <span key={i} className="relative inline-block overflow-hidden pb-1">
                <motion.span
                  variants={fadeInUp}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
            <span className="relative inline-block overflow-hidden pb-1 text-[#E61C24]">
              <motion.span
                variants={fadeInUp}
                className="inline-block"
              >
                Resources
              </motion.span>
            </span>
          </motion.h1>
          
          {/* Centered Subtitle */}
          <motion.p 
            variants={fadeInUp}
            className="text-base font-semibold text-zinc-550 leading-relaxed max-w-2xl text-center mx-auto"
          >
            Explore English language learning guides, teaching methods, classroom activities, and educational updates curated by our expert instructors.
          </motion.p>

          {/* Centered Interactive Search Bar */}
          <motion.div 
            variants={searchAnim}
            className="pt-2 max-w-xl w-full mx-auto"
          >
            <div className="relative bg-white border border-zinc-200 focus-within:border-[#E61C24] rounded-lg shadow-md transition-all flex items-center px-4 py-3 gap-3">
              <FiSearch className="text-zinc-400 h-5 w-5 shrink-0" />
              <input
                type="text"
                placeholder="Search tutorials, authors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-zinc-800 placeholder:text-zinc-400 font-semibold text-base outline-none border-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                  aria-label="Clear search"
                >
                  <FiX className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>

        </motion.div>
      </section>

      {/* ── SECTION 2: BLOGS GRID LIST IN DEDICATED BLOCK ── */}
      <section className="w-full bg-[#ffffff] py-16">
        <div className="container mx-auto px-6 relative z-10">
          <AnimatePresence mode="popLayout">
            {filteredBlogs.length > 0 ? (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredBlogs.map((blog) => {
                  const readingTime = calculateReadingTime(blog.content)
                  const formattedDate = formatDate(blog.publishedDate)
                  
                  return (
                    <motion.article
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.4 }}
                      key={blog.id}
                      className="flex flex-col gap-4 group"
                    >
                      {/* Cover Image Block - Rounded-lg, fully self-contained */}
                      <Link 
                        href={`/blogs/${blog.id}`} 
                        className="aspect-[16/10] overflow-hidden bg-zinc-50 rounded-lg block relative shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                      >
                        {blog.coverImageUrl ? (
                          <img
                            src={blog.coverImageUrl}
                            alt={blog.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ease-out rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-350 bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] rounded-lg">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3" />
                            </svg>
                          </div>
                        )}
                      </Link>

                      {/* Content Block */}
                      <div className="flex flex-col gap-2.5">
                        {/* Headline */}
                        <h3 className="text-xl font-bold text-[#0A163A] leading-snug line-clamp-2 hover:text-[#E61C24] transition-colors duration-200">
                          <Link href={`/blogs/${blog.id}`}>{blog.title}</Link>
                        </h3>

                        {/* Description */}
                        <p className="text-base font-semibold text-[#4F5B7C] leading-relaxed line-clamp-2">
                          {getPlainPreview(blog.content, 120)}
                        </p>

                        {/* Author Info Row (Matching Screenshot exactly: [Avatar] Name • Date) */}
                        <div className="flex items-center gap-2.5 text-base font-semibold text-[#4F5B7C] mt-2.5">
                          {blog.authorProfilePicUrl ? (
                            <img
                              src={blog.authorProfilePicUrl}
                              alt={blog.authorName}
                              className="h-6 w-6 rounded-full object-cover shrink-0 border border-zinc-150"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-[#E61C24]/10 flex items-center justify-center text-[#E61C24] font-bold text-xs uppercase shrink-0 select-none">
                              {blog.authorName[0]}
                            </div>
                          )}
                          <span className="text-[#0A163A] font-bold">{blog.authorName}</span>
                          <span className="text-zinc-300 select-none">•</span>
                          <span className="text-zinc-400 font-semibold">{formattedDate}</span>
                        </div>
                      </div>
                    </motion.article>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center py-20 bg-zinc-50 rounded-lg border border-zinc-200/60 max-w-2xl mx-auto"
              >
                <svg className="w-16 h-16 text-zinc-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3" />
                </svg>
                <h3 className="text-lg font-bold text-zinc-850">No Results Found</h3>
                <p className="text-zinc-550 text-base font-medium mt-1">We couldn&apos;t find any articles matching your search or filters. Try adjusting your search term.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

    </div>
  )
}
