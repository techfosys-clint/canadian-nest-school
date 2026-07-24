'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiPlus,
  FiSearch,
  FiStar,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { formatBdDate } from '@/lib/bdTime'

interface CourseReviewItem {
  _id: string
  rating: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  course?: { title: string; slug: string }
  student?: { name: string; email: string }
  createdAt: string
}

interface TeacherReviewSnippet {
  id: string
  teacherName: string
  rating: number
  comment: string
  status?: string
}

interface ReviewPack {
  id: string
  courseReview: CourseReviewItem
  teacherReviews: TeacherReviewSnippet[]
  jointStatus: 'pending' | 'approved' | 'rejected'
  expectedInstructorCount?: number
  teachersIncomplete?: boolean
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: FiClock,
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: FiCheck,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: FiX,
  },
}

function StarDisplay({ rating }: { rating: number | string }) {
  const r = typeof rating === 'string' ? parseInt(rating, 10) : rating
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          className={`h-4 w-4 ${s <= r ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewsModerationClient({
  initialPacks,
}: {
  initialPacks: ReviewPack[]
}) {
  const [packs, setPacks] = useState<ReviewPack[]>(initialPacks)
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const successType = params.get('success')
    if (successType === 'added') {
      setSuccessMsg('Student review successfully logged and approved!')
    }
    if (successType) {
      window.history.replaceState({}, document.title, window.location.pathname)
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const filtered = useMemo(() => {
    return packs.filter((pack) => {
      const matchStatus = filterStatus === 'all' || pack.jointStatus === filterStatus
      const hay = [
        pack.courseReview.comment,
        pack.courseReview.student?.name || '',
        pack.courseReview.course?.title || '',
        ...pack.teacherReviews.map((t) => `${t.teacherName} ${t.comment}`),
      ]
        .join(' ')
        .toLowerCase()
      const matchSearch = !search || hay.includes(search.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [packs, filterStatus, search])

  const pendingCount = packs.filter((p) => p.jointStatus === 'pending').length

  async function moderatePack(packId: string, newStatus: 'approved' | 'rejected') {
    setUpdating(packId)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/admin/reviews/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: packId, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPacks((prev) =>
        prev.map((pack) => {
          if (pack.id !== packId) return pack
          return {
            ...pack,
            jointStatus: newStatus,
            courseReview: { ...pack.courseReview, status: newStatus },
            teacherReviews: pack.teacherReviews.map((t) => ({
              ...t,
              status: newStatus,
            })),
          }
        }),
      )

      setSuccessMsg(
        newStatus === 'approved'
          ? 'Course and teacher reviews approved together. Student certificate unlocked.'
          : 'Course and teacher reviews rejected together.',
      )
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not moderate reviews.'
      setErrorMsg(message)
      setTimeout(() => setErrorMsg(null), 5000)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-base">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-bold text-base">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">
            Reviews Moderation
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Admin &amp; staff only — approve course and teacher reviews in one action
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 font-bold text-base">
              <FiClock className="h-5 w-5" />
              {pendingCount} packs awaiting review
            </div>
          )}
          <Link
            href="/admin/reviews/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/20 transition-all cursor-pointer"
          >
            <FiPlus className="h-5 w-5" /> Add New Review
          </Link>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-base font-semibold text-slate-600">
        Teachers can view their own ratings but cannot approve or reject reviews. Use a single
        button below to accept (or reject) both the course review and all teacher reviews for
        that student submission — unlocking certificate eligibility when approved.
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-slate-100 border border-slate-200 focus-within:border-[#E61C24]/60 rounded-lg transition-colors">
          <FiSearch className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, course, teacher, or comment..."
            className="bg-transparent border-none outline-none w-full text-base font-semibold text-slate-800 placeholder-slate-400"
          />
        </div>
        <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-lg">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterStatus(tab)}
              className={`px-4 py-1.5 rounded-md text-base font-bold capitalize transition-all cursor-pointer ${
                filterStatus === tab
                  ? 'bg-[#E61C24] text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center shadow-sm">
          <FiStar className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-400">
            No review packs match your current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((pack) => {
            const conf = statusConfig[pack.jointStatus]
            const Icon = conf.icon
            const isUpdating = updating === pack.id
            const studentName = pack.courseReview.student?.name || 'Anonymous'
            const initials = studentName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <article
                key={pack.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-[#E61C24]/15 border border-[#E61C24]/20 flex items-center justify-center font-bold text-[#E61C24] text-base shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-800 truncate flex items-center gap-2">
                        <FiUser className="h-4 w-4 text-slate-400 shrink-0" />
                        {studentName}
                      </p>
                      <p className="text-base font-semibold text-slate-500 truncate">
                        {pack.courseReview.course?.title || 'Course'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-base font-bold ${conf.color} ${conf.bg} ${conf.border}`}
                    >
                      <Icon className="h-4 w-4" />
                      {conf.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-slate-400">
                      <FiCalendar className="h-4 w-4" />
                      {formatBdDate(pack.courseReview.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3 rounded-lg border border-slate-200/80 bg-slate-50/40 p-5">
                    <p className="text-base font-bold text-slate-800">Course Review</p>
                    <StarDisplay rating={pack.courseReview.rating} />
                    <p className="text-base font-semibold text-slate-600 italic leading-relaxed">
                      &ldquo;{pack.courseReview.comment}&rdquo;
                    </p>
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-200/80 bg-slate-50/40 p-5">
                    <p className="text-base font-bold text-slate-800">
                      Teacher Reviews ({pack.teacherReviews.length})
                    </p>
                    {pack.teacherReviews.length === 0 ? (
                      <p className="text-base font-semibold text-slate-400">
                        No teacher reviews submitted yet for this pack.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {pack.teacherReviews.map((t) => (
                          <li
                            key={t.id}
                            className="space-y-1.5 border-b border-slate-100 last:border-0 pb-3 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-base font-bold text-slate-700">
                                {t.teacherName}
                              </p>
                              <StarDisplay rating={t.rating} />
                            </div>
                            <p className="text-base font-semibold text-slate-500 italic leading-relaxed">
                              &ldquo;{t.comment}&rdquo;
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-500">
                      One click updates the course review and all teacher reviews for this
                      submission.
                    </p>
                    {pack.teachersIncomplete && (
                      <p className="text-base font-semibold text-amber-600">
                        Waiting for teacher reviews (
                        {pack.teacherReviews.length}/
                        {pack.expectedInstructorCount || 0} submitted). Approve unlocks after
                        the student finishes rating every assigned teacher.
                      </p>
                    )}
                  </div>
                  <div className="inline-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => moderatePack(pack.id, 'approved')}
                      disabled={
                        isUpdating ||
                        pack.jointStatus === 'approved' ||
                        !!pack.teachersIncomplete
                      }
                      className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-none"
                    >
                      <FiCheck className="h-4.5 w-4.5" />
                      {isUpdating ? 'Updating...' : 'Approve All Reviews'}
                    </button>
                    <button
                      type="button"
                      onClick={() => moderatePack(pack.id, 'rejected')}
                      disabled={isUpdating || pack.jointStatus === 'rejected'}
                      className="px-4 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-rose-500 text-rose-600 hover:text-white font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FiX className="h-4.5 w-4.5" />
                      {isUpdating ? 'Updating...' : 'Reject All'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
