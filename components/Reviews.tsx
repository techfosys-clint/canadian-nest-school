'use client'

import React from 'react'
import { FiStar } from 'react-icons/fi'

// ─── Exported Types ──────────────────────────────────────────────────────────

interface ProfilePicDoc {
  url?: string | null
}

interface StudentDoc {
  id: string
  name: string
  profilePic?: ProfilePicDoc | string | null
}

export interface ReviewDoc {
  id: string
  rating: '1' | '2' | '3' | '4' | '5'
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  student: StudentDoc | string | null
  course: { id: string; title: string } | string | null
}

interface ReviewsProps {
  reviews: ReviewDoc[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStudentName(student: ReviewDoc['student']): string {
  if (!student || typeof student === 'string') return 'Anonymous'
  return student.name
}

function getProfilePicUrl(student: ReviewDoc['student']): string | null {
  if (!student || typeof student === 'string') return null
  const pic = student.profilePic
  if (!pic || typeof pic === 'string') return null
  return pic.url ?? null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: string }) {
  const count = parseInt(rating, 10)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          className={`h-4.5 w-4.5 ${
            s <= count ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}

function ReviewAvatar({ student }: { student: ReviewDoc['student'] }) {
  const name = getStudentName(student)
  const picUrl = getProfilePicUrl(student)
  if (picUrl) {
    return (
      <img
        src={picUrl}
        alt={name}
        className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
      />
    )
  }
  return (
    <div className="h-12 w-12 rounded-full bg-[#E61C24]/15 border-2 border-white shadow-sm flex items-center justify-center font-bold text-base text-[#E61C24] shrink-0 select-none">
      {getInitials(name)}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewDoc }) {
  return (
    <div className="relative bg-white border border-zinc-100 rounded-lg p-6 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-[#E61C24]/20 transition-all">
      {/* Star rating */}
      <StarDisplay rating={review.rating} />

      {/* Testimonial Quote */}
      <p className="text-base font-semibold text-zinc-700 leading-relaxed flex-1 relative z-10">
        &ldquo;{review.comment}&rdquo;
      </p>

      <div className="border-t border-zinc-100" />

      {/* Reviewer Meta info */}
      <div className="flex items-center gap-3">
        <ReviewAvatar student={review.student} />
        <div className="min-w-0">
          <p className="text-base font-bold text-[#0A163A] leading-tight truncate">
            {getStudentName(review.student)}
          </p>
          <p className="text-sm font-semibold text-zinc-400 mt-0.5">Verified Student</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reviews({ reviews }: ReviewsProps) {
  if (reviews.length === 0) return null

  // Distribute reviews dynamically across columns.
  // We duplicate arrays dynamically to create seamless infinite scrolling.
  const getColumnItems = (colIndex: number) => {
    let baseItems = [...reviews]
    if (reviews.length >= 6) {
      baseItems = reviews.filter((_, idx) => idx % 3 === colIndex)
    } else {
      // Offset by colIndex to make each column unique
      baseItems = [...reviews.slice(colIndex), ...reviews.slice(0, colIndex)]
    }

    // Ensure there are enough items for smooth vertical marquee
    let list = [...baseItems]
    while (list.length < 5) {
      list = [...list, ...baseItems]
    }

    // Duplicate list once to allow mathematically perfect loop
    return [...list, ...list]
  }

  const col1 = getColumnItems(0)
  const col2 = getColumnItems(1)
  const col3 = getColumnItems(2)

  return (
    <section className="py-20 md:py-28 px-6 bg-white border-t border-zinc-100 relative overflow-hidden">
      {/* CSS Keyframe injections for infinite continuous scroll */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marqueeUp {
              0% { transform: translateY(0); }
              100% { transform: translateY(-50%); }
            }
            @keyframes marqueeDown {
              0% { transform: translateY(-50%); }
              100% { transform: translateY(0); }
            }
            .animate-marquee-up {
              animation: marqueeUp 38s linear infinite;
            }
            .animate-marquee-down {
              animation: marqueeDown 38s linear infinite;
            }
            .animate-marquee-up:hover,
            .animate-marquee-down:hover {
              animation-play-state: paused;
            }
          `,
        }}
      />

      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E61C24]/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10">
        {/* Title / Heading Section */}
        <div className="text-center mb-16">
          <p className="text-base font-bold text-[#E61C24] mb-3 tracking-wide uppercase">
            Hear from our students
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-sans text-[#000000] tracking-tight leading-[1.2] max-w-2xl mx-auto">
            Hear directly from <span className="text-[#E61C24]">our learners!</span> Discover their experiences and insights as they navigate their educational.
          </h2>
        </div>

        {/* 3-Column Marquee Grid */}
        <div className="relative h-[680px] overflow-hidden rounded-lg">
          {/* Top Fade Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent z-20 pointer-events-none" />

          {/* Bottom Fade Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-20 pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
            {/* Column 1: Scrolls Up */}
            <div className="relative h-full overflow-hidden">
              <div className="flex flex-col gap-6 animate-marquee-up">
                {col1.map((review, idx) => (
                  <ReviewCard key={`col1-${review.id}-${idx}`} review={review} />
                ))}
              </div>
            </div>

            {/* Column 2: Scrolls Down */}
            <div className="relative h-full overflow-hidden hidden md:block">
              <div className="flex flex-col gap-6 animate-marquee-down">
                {col2.map((review, idx) => (
                  <ReviewCard key={`col2-${review.id}-${idx}`} review={review} />
                ))}
              </div>
            </div>

            {/* Column 3: Scrolls Up */}
            <div className="relative h-full overflow-hidden hidden lg:block">
              <div className="flex flex-col gap-6 animate-marquee-up">
                {col3.map((review, idx) => (
                  <ReviewCard key={`col3-${review.id}-${idx}`} review={review} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
