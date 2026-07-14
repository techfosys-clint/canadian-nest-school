'use client'

import React, { useMemo, useState } from 'react'
import {
  FiBookOpen,
  FiClock,
  FiMessageSquare,
  FiSearch,
  FiStar,
  FiUser,
} from 'react-icons/fi'

type ReviewStatus = 'pending' | 'approved' | 'rejected'

interface TeacherReviewItem {
  id: string
  studentName: string
  courseTitle: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: string
}

/** Static demo data until teacher-review API is wired */
const STATIC_REVIEWS: TeacherReviewItem[] = [
  {
    id: 'tr-1',
    studentName: 'Ayesha Rahman',
    courseTitle: 'Spoken English Mastery',
    rating: 5,
    comment:
      'Very clear explanations and patient during live sessions. I improved my confidence in speaking within a few weeks.',
    status: 'approved',
    createdAt: '2026-07-10T09:30:00.000Z',
  },
  {
    id: 'tr-2',
    studentName: 'Md. Karim Hossain',
    courseTitle: 'IELTS Preparation Intensive',
    rating: 4,
    comment:
      'Great feedback on my writing tasks. Would love more practice speaking drills in class.',
    status: 'approved',
    createdAt: '2026-07-08T14:15:00.000Z',
  },
  {
    id: 'tr-3',
    studentName: 'Nusrat Jahan',
    courseTitle: 'Spoken English Mastery',
    rating: 5,
    comment:
      'The teaching style is engaging and supportive. Assignments were practical and helpful.',
    status: 'pending',
    createdAt: '2026-07-12T11:00:00.000Z',
  },
  {
    id: 'tr-4',
    studentName: 'Fahim Ahmed',
    courseTitle: 'Business Communication',
    rating: 3,
    comment:
      'Content was solid, but I needed more examples for professional email writing.',
    status: 'approved',
    createdAt: '2026-07-02T16:45:00.000Z',
  },
  {
    id: 'tr-5',
    studentName: 'Sadia Islam',
    courseTitle: 'IELTS Preparation Intensive',
    rating: 5,
    comment:
      'Outstanding mentor. Helped me structure my speaking answers and correct pronunciation.',
    status: 'pending',
    createdAt: '2026-07-14T08:20:00.000Z',
  },
]

const statusStyles: Record<
  ReviewStatus,
  { label: string; classes: string }
> = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-600 border border-amber-200',
  },
  approved: {
    label: 'Published',
    classes: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-rose-50 text-rose-600 border border-rose-200',
  },
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          className={`h-4.5 w-4.5 ${
            s <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
          }`}
        />
      ))}
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export default function TeacherMyReviewsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all')
  const [courseFilter, setCourseFilter] = useState('all')

  const courses = useMemo(() => {
    return Array.from(new Set(STATIC_REVIEWS.map((r) => r.courseTitle))).sort()
  }, [])

  const filtered = useMemo(() => {
    return STATIC_REVIEWS.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchCourse = courseFilter === 'all' || r.courseTitle === courseFilter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        r.studentName.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q)
      return matchStatus && matchCourse && matchSearch
    })
  }, [search, statusFilter, courseFilter])

  const avgRating =
    STATIC_REVIEWS.length === 0
      ? 0
      : STATIC_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / STATIC_REVIEWS.length

  const approvedCount = STATIC_REVIEWS.filter((r) => r.status === 'approved').length
  const pendingCount = STATIC_REVIEWS.filter((r) => r.status === 'pending').length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 select-none">
          <FiStar className="text-[#E61C24] h-7 w-7" />
          Student Reviews About Me
        </h1>
        <p className="text-base font-semibold text-slate-500 mt-1 select-none">
          Feedback students submitted after completing courses you teach. View only —
          only admins and staff can approve reviews.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center text-[#E61C24] shrink-0">
            <FiMessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-500">Total Reviews</p>
            <p className="text-2xl font-bold text-slate-800">{STATIC_REVIEWS.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <FiStar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-500">Average Rating</p>
            <p className="text-2xl font-bold text-slate-800">
              {avgRating.toFixed(1)}
              <span className="text-base font-semibold text-slate-400"> / 5</span>
            </p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <FiClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-500">Published / Pending</p>
            <p className="text-2xl font-bold text-slate-800">
              {approvedCount}
              <span className="text-base font-semibold text-slate-400"> / {pendingCount}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-base font-semibold text-slate-600">
        This page is view-only. You cannot approve or reject reviews — admins and staff moderate
        course and teacher feedback in one combined action.
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-3.5 text-slate-400 h-5 w-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, course, or comment..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-base font-semibold outline-none transition-colors"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-base font-semibold text-slate-800 outline-none focus:border-[#E61C24]/80 cursor-pointer"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-lg text-base font-bold border transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-[#E61C24] text-white border-[#E61C24]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All' : statusStyles[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Incoming Feedback</h2>
          <span className="text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3 py-1 rounded-lg">
            {filtered.length} shown
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3 max-w-md mx-auto">
            <FiMessageSquare className="mx-auto h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-slate-800">No reviews found</p>
            <p className="text-base font-semibold text-slate-500 leading-relaxed">
              Try changing filters, or check back after students complete your courses and
              submit teacher reviews.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((review) => {
              const status = statusStyles[review.status]
              return (
                <li key={review.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-[#0A163A] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(review.studentName)}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <FiUser className="h-4 w-4 text-slate-400 shrink-0" />
                          {review.studentName}
                        </p>
                        <p className="text-base font-semibold text-slate-500 flex items-center gap-2">
                          <FiBookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{review.courseTitle}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <StarDisplay rating={review.rating} />
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-base font-semibold text-slate-600 leading-relaxed italic">
                    &ldquo;{review.comment}&rdquo;
                  </p>

                  <p className="text-base font-semibold text-slate-400">
                    Submitted {formatDate(review.createdAt)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-base font-semibold text-slate-400 text-center">
        Static preview UI — live student teacher reviews will appear here once the backend is
        connected. Approval is handled only by admins and staff.
      </p>
    </div>
  )
}
