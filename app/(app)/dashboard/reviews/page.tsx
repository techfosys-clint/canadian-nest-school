'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FiStar, FiClock, FiMessageSquare, FiPlus, FiCheck } from 'react-icons/fi'

interface UserSession {
  id: string
  name: string
  email: string
  role: string
}

interface SubmittedReview {
  id: string
  rating: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  course: { title: string } | string
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending Approval', classes: 'bg-amber-500/10 text-amber-600 rounded-lg text-sm px-2.5 py-0.5 font-bold' },
  approved: { label: 'Live & Published', classes: 'bg-emerald-500/10 text-emerald-600 rounded-lg text-sm px-2.5 py-0.5 font-bold' },
  rejected: { label: 'Not Approved', classes: 'bg-rose-500/10 text-rose-600 rounded-lg text-sm px-2.5 py-0.5 font-bold' },
}

export default function ReviewsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [myReviews, setMyReviews] = useState<SubmittedReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()

        if (!sessionRes.ok || !sessionData.authenticated || (sessionData.user.role !== 'student' && sessionData.user.role !== 'admin')) {
          router.push('/login')
          return
        }

        setUser(sessionData.user)

        // Fetch student's submitted reviews
        const reviewRes = await fetch(`/api/reviews?where[student][equals]=${encodeURIComponent(sessionData.user.id)}&depth=2&limit=50`)
        if (reviewRes.ok) {
          const data = await reviewRes.json()
          setMyReviews(data.docs ?? [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-650">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-6 py-8 pb-16">

      {/* Premium Banner - Box Shadow Removed */}
      <div className="w-full bg-[#0A163A] rounded-lg p-8 md:p-12 relative overflow-hidden mb-10 border border-zinc-800/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#CC181F]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-6">
            Reviews Panel
          </span>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-4 leading-tight">
            Learner <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D55] to-white font-bold">Reviews Hub</span> 🌟
          </h1>
          <p className="text-zinc-400 text-base md:text-lg font-semibold leading-relaxed">
            Your dynamic course feedback helps shape curriculum quality. Track your logged evaluations and add new course testimonials!
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Header and Add Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-800 tracking-tight font-display">My Submitted Reviews</h2>
            <p className="text-base font-semibold text-zinc-450 mt-1">Timeline of submitted course course logs</p>
          </div>

          <Link
            href="/dashboard/reviews/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors shrink-0"
          >
            <FiPlus className="h-5 w-5" />
            <span>Write a Review</span>
          </Link>
        </div>

        {/* Reviews List - Box Shadows Removed */}
        <div className="bg-white rounded-lg border border-zinc-200/85 overflow-hidden">
          <div className="px-6 py-5 bg-zinc-50/50 flex items-center justify-between border-b border-zinc-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#E61C24]/10 flex items-center justify-center border border-[#E61C24]/15">
                <FiClock className="h-5 w-5 text-[#E61C24]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-800">Submitted Logs</h3>
            </div>
            <span className="text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3.5 py-1 rounded-lg">
              Total {myReviews.length}
            </span>
          </div>

          <div className="p-6 divide-y divide-zinc-100 space-y-6">
            <AnimatePresence>
              {myReviews.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100">
                    <FiMessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-base font-semibold text-zinc-400 max-w-xs leading-relaxed">
                    You haven't submitted any reviews yet. Complete your course lessons and submit your first testimonial!
                  </p>
                </div>
              ) : (
                myReviews.map((review) => {
                  const courseTitle = review.course && typeof review.course === 'object'
                    ? review.course.title : 'Course'
                  const cfg = statusConfig[review.status] ?? statusConfig.pending
                  const starCount = parseInt(review.rating || '5', 10)

                  return (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="py-6 first:pt-0 last:pb-0 space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-lg font-bold text-zinc-800 leading-snug">
                          {courseTitle}
                        </h4>
                        <span className={`shrink-0 ${cfg.classes}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FiStar
                            key={s}
                            className={`h-4.5 w-4.5 ${s <= starCount ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`}
                          />
                        ))}
                      </div>

                      <p className="text-base font-semibold text-zinc-500 leading-relaxed italic">
                        &ldquo;{review.comment}&rdquo;
                      </p>

                      {review.status === 'approved' && (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <FiCheck className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-sm font-bold">Published on course landing page</span>
                        </div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  )
}
