'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiStar, FiSend, FiArrowLeft, FiAlertCircle } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface UserSession {
  id: string
  name: string
  email: string
  role: string
}

interface CourseItem {
  id: string
  title: string
  slug: string
}

interface EnrollmentItem {
  id: string
  course: CourseItem
  paymentStatus: string
}

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 cursor-pointer transition-transform hover:scale-110 duration-150 border-none bg-transparent outline-none"
          >
            <FiStar
              className={`h-8 w-8 transition-colors duration-150 ${
                filled ? 'text-amber-400 fill-amber-400' : 'text-zinc-350'
              }`}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-3 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3 py-1 rounded-lg">
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value]}
        </span>
      )}
    </div>
  )
}

export default function NewReviewPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

        // Fetch student's completed enrollments and their reviews to find unreviewed courses
        const [enrollRes, reviewRes] = await Promise.all([
          fetch('/api/enrollments?depth=2&limit=100'),
          fetch(`/api/reviews?where[student][equals]=${encodeURIComponent(sessionData.user.id)}&depth=2&limit=50`),
        ])

        const reviewedIds = new Set<string>()
        if (reviewRes.ok) {
          const data = await reviewRes.json()
          const reviewsList = data.docs ?? []
          for (const r of reviewsList) {
            const cId = r.course && typeof r.course === 'object' ? r.course.id : r.course
            if (cId) reviewedIds.add(cId)
          }
        }

        if (enrollRes.ok) {
          const data = await enrollRes.json()
          const completed = (data.docs ?? []).filter(
            (e: EnrollmentItem) => 
              e.paymentStatus === 'completed' && 
              e.course && 
              typeof e.course === 'object' &&
              !reviewedIds.has(e.course.id)
          )
          setEnrollments(completed)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!user || !selectedCourseId || rating === 0 || !comment.trim()) {
      setErrorMsg('Please select a course, provide a rating, and write your honest comment.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: selectedCourseId,
          rating: String(rating),
          comment: comment.trim(),
        }),
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Review Submitted!',
          text: 'Your course review has been successfully logged and is pending staff moderation.',
          timer: 2000,
          showConfirmButton: false,
          background: '#121829',
          color: '#ffffff',
        })
        router.push('/dashboard/reviews')
        router.refresh()
      } else {
        const err = await res.json()
        throw new Error(err.message ?? 'Failed to submit review')
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'An error occurred while submitting your review.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-650">Loading compose form...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-6 py-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-6 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/dashboard/reviews')}
              className="h-10 w-10 border border-zinc-200 hover:border-zinc-300 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-900 bg-white transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-800 font-display flex items-center gap-2">
              <span>Write a Course Review</span>
            </h1>
          </div>
          <p className="text-base font-semibold text-zinc-500 pl-13">
            Share your milestone experiences, learning curves, and curriculum feedback.
          </p>
        </div>
      </div>

      {/* Main Review Form Panel (Bordered, Completely border-free shadows) */}
      <div className="bg-white border border-zinc-200/80 rounded-lg p-6 sm:p-8">
        
        {errorMsg && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-base font-semibold mb-6">
            <FiAlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-5">
            <div className="h-16 w-16 rounded-full bg-[#E61C24]/5 flex items-center justify-center text-[#E61C24]">
              <FiStar className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <p className="text-lg font-bold text-zinc-800">All Completed Courses Reviewed</p>
              <p className="text-base font-semibold text-zinc-450 leading-relaxed">
                You have reviewed all available enrolled courses. Buy new premium e-learning courses to submit more feedback!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Course Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-zinc-700">Select Enrolled Course</label>
              <div className="relative">
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-lg bg-zinc-50 text-base font-semibold text-zinc-800 border border-zinc-200 focus:border-[#E61C24]/50 focus:bg-white outline-none transition-all cursor-pointer appearance-none"
                  required
                >
                  <option value="">— Choose an active course to review —</option>
                  {enrollments.map((e) => (
                    <option key={e.id} value={e.course.id}>
                      {e.course.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-zinc-700">Your Rating Star Score</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Honest Comment Review Textarea */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-base font-bold text-zinc-700">Your Honest Review Comment</label>
                <span className="text-sm font-semibold text-zinc-400">
                  {comment.length} / 500 characters
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={6}
                placeholder="Share details about curriculum quality, video player experience, support resources, and what could be built better..."
                className="w-full px-4 py-3.5 rounded-lg bg-zinc-50 text-base font-semibold text-zinc-800 border border-zinc-200 focus:border-[#E61C24]/50 focus:bg-white transition-all resize-none leading-relaxed outline-none"
                required
              />
            </div>

            {/* Form Footer Action buttons */}
            <div className="flex items-center justify-end gap-3.5 pt-6 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => router.push('/dashboard/reviews')}
                className="px-5 py-2.5 rounded-lg bg-zinc-150 hover:bg-zinc-200 text-zinc-700 font-bold text-base transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={submitting || !selectedCourseId || rating === 0 || !comment.trim()}
                className="px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 border-none"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="h-5 w-5" />
                    <span>Submit Review</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

    </div>
  )
}
