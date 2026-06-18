'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogDoc {
  id: string
  title: string
  content: string
  authorName: string
  authorProfilePicUrl?: string
  coverImageUrl?: string
  publishedDate?: string
  tags?: Array<{ tag: string }>
}

interface BlogSectionProps {
  blogs: BlogDoc[]
}

// Helper to strip HTML tags for safe preview rendering
function getPlainPreview(htmlContent: string, maxLength = 120): string {
  if (!htmlContent) return ''
  const stripped = htmlContent.replace(/<[^>]*>/g, ' ')
  const cleaned = stripped.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

// Helper to format date precisely like "14 Jan 2026"
function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogSection({ blogs }: BlogSectionProps) {
  if (!blogs || blogs.length === 0) return null

  return (
    <section className="py-20 md:py-28 px-6 bg-white relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-[#615fff]/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="container mx-auto relative z-10">
        
        {/* ── Heading Block (Matching User Screenshot Layout) ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-4 max-w-2xl">
            {/* Blogs Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100/80 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-[#615fff]" />
              <span className="text-sm font-bold text-[#4F5B7C]">Blogs</span>
            </div>
            
            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A163A] tracking-tight leading-[1.2]">
              The Canadian Nest <span className="text-[#615fff]">Knowledge Hub</span>
            </h2>
            
            {/* Description */}
            <p className="text-base font-semibold text-[#4F5B7C] leading-relaxed">
              Get expert insights, coding tutorials, career advice, and industry deep dives to fuel your learning journey.
            </p>
          </div>

          {/* View All Articles Button */}
          <Link
            href="/blogs"
            className="hidden md:inline-flex items-center gap-3.5 px-6 py-3 bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base rounded-lg transition-all duration-300 shadow-lg shadow-[#615fff]/20 group shrink-0 cursor-pointer w-fit"
          >
            <span>View All Articles</span>
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#615fff] transition-transform group-hover:translate-x-0.5">
              <FiArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        {/* ── Blog Grid (Clean, borderless, matching screenshot exactly) ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {blogs.map((blog) => {
            const previewText = getPlainPreview(blog.content, 120)
            const formattedDate = formatDate(blog.publishedDate)
            
            return (
              <motion.article
                key={blog.id}
                variants={cardVariants}
                className="group flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <Link 
                    href={`/blogs/${blog.id}`}
                    className="block aspect-[16/10] w-full overflow-hidden bg-zinc-50 rounded-lg mb-5 cursor-pointer relative"
                  >
                    {blog.coverImageUrl ? (
                      <img
                        src={blog.coverImageUrl}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0]">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3" />
                        </svg>
                      </div>
                    )}
                  </Link>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-[#0A163A] tracking-tight line-clamp-2 leading-snug hover:text-[#615fff] transition-colors duration-200 cursor-pointer mb-2.5">
                    <Link href={`/blogs/${blog.id}`}>
                      {blog.title}
                    </Link>
                  </h3>

                  {/* Description */}
                  <p className="text-base font-medium text-[#4F5B7C] line-clamp-2 leading-relaxed mb-5">
                    {previewText || 'Dive into this article to learn more about this topic.'}
                  </p>
                </div>

                {/* Author Info Row (Matching Screenshot) */}
                <div className="flex items-center gap-2.5 text-sm font-semibold text-[#4F5B7C]/80 mt-1">
                  {blog.authorProfilePicUrl ? (
                    <img
                      src={blog.authorProfilePicUrl}
                      alt={blog.authorName}
                      className="h-6 w-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-[#615fff]/10 flex items-center justify-center text-[#615fff] font-bold text-xs uppercase shrink-0">
                      {blog.authorName[0]}
                    </div>
                  )}
                  <span className="text-[#0A163A] font-bold">{blog.authorName}</span>
                  <span className="text-zinc-300">•</span>
                  <span>{formattedDate}</span>
                </div>
              </motion.article>
            )
          })}
        </motion.div>

      </div>
    </section>
  )
}
