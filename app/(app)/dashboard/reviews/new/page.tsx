'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { FiAlertCircle, FiArrowLeft, FiAward, FiStar } from 'react-icons/fi'

interface CourseItem {
  id: string
  title: string
  slug: string
  totalLessons?: number
}

interface EnrollmentItem {
  id: string
  course: CourseItem
  paymentStatus: string
}

/**
 * Pick any paid enrollment to leave course + teacher reviews.
 * Certificate download still requires 100% syllabus after reviews.
 */
export default function NewReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState<
    Array<{ courseId: string; title: string; progress: number }>
  >([])

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()

        if (
          !sessionRes.ok ||
          !sessionData.authenticated ||
          (sessionData.user.role !== 'student' && sessionData.user.role !== 'admin')
        ) {
          router.push('/login')
          return
        }

        const [enrollRes, progressRes, reviewRes] = await Promise.all([
          fetch('/api/enrollments?depth=2&limit=100'),
          fetch('/api/progress'),
          fetch(
            `/api/reviews?where[student][equals]=${encodeURIComponent(sessionData.user.id)}&depth=1&limit=100`,
          ),
        ])

        const reviewedCourseIds = new Set<string>()
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json()
          for (const r of reviewData.docs ?? []) {
            const cId = r.course && typeof r.course === 'object' ? r.course.id : r.course
            if (cId) reviewedCourseIds.add(cId)
          }
        }

        const completedLessonsMap: Record<string, string[]> = {}
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          Object.assign(completedLessonsMap, progressData.completedLessons || {})
        }

        if (enrollRes.ok) {
          const enrollData = await enrollRes.json()
          const rows: Array<{ courseId: string; title: string; progress: number }> = []
          for (const e of (enrollData.docs ?? []) as EnrollmentItem[]) {
            if (e.paymentStatus !== 'completed' || !e.course?.id) continue
            const total = e.course.totalLessons || 1
            const done = (completedLessonsMap[e.course.id] || []).length
            const progress = Math.min(Math.round((done / total) * 100), 100)

            rows.push({
              courseId: e.course.id,
              title: e.course.title,
              progress,
            })
          }

          const needingReview = rows.filter((r) => !reviewedCourseIds.has(r.courseId))
          setEligible(needingReview.length > 0 ? needingReview : rows)
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 pb-16 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/reviews')}
            className="h-10 w-10 border border-zinc-200 hover:border-zinc-300 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-900 bg-white transition-colors cursor-pointer"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 font-display">
            Leave Reviews
          </h1>
        </div>
        <p className="text-base font-semibold text-zinc-500 pl-13">
          You can rate a course and its teachers anytime after purchase. Your certificate
          unlocks once the syllabus is 100% complete and both reviews are submitted.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-6">
        <FiAlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-base font-semibold text-amber-800">
          Pick a purchased course below. Reviews can be left at any progress; finishing the
          syllabus is only required to download the certificate.
        </p>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-lg overflow-hidden">
        {eligible.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-5">
            <div className="h-16 w-16 rounded-full bg-[#E61C24]/5 flex items-center justify-center text-[#E61C24]">
              <FiStar className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <p className="text-lg font-bold text-zinc-800">No purchased courses yet</p>
              <p className="text-base font-semibold text-zinc-500 leading-relaxed">
                Enroll in a course with completed payment, then return here to leave reviews.
              </p>
            </div>
            <Link
              href="/dashboard/courses"
              className="px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base"
            >
              Go to My Courses
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {eligible.map((course) => (
              <li
                key={course.courseId}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-lg font-bold text-zinc-800 truncate">{course.title}</p>
                  <p className="text-base font-semibold text-zinc-500">
                    Syllabus {course.progress}% complete
                    {course.progress < 100
                      ? ' · Certificate unlocks at 100%'
                      : ' · Ready for certificate after reviews'}
                  </p>
                </div>
                <Link
                  href={`/dashboard/courses/${course.courseId}/complete`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shrink-0"
                >
                  <FiAward className="h-5 w-5" />
                  Leave Reviews
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
