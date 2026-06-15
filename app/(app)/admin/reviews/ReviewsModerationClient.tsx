'use client'

import React, { useState, useEffect } from 'react'
import { FiStar, FiCheck, FiX, FiClock, FiSearch, FiPlus, FiCalendar } from 'react-icons/fi'
import Swal from 'sweetalert2'
import Link from 'next/link'

interface ReviewItem {
  _id: string
  rating: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  course?: { title: string; slug: string }
  student?: { name: string; email: string }
  createdAt: string
}

const statusConfig = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: FiClock },
  approved: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: FiCheck },
  rejected: { label: 'Rejected', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: FiX },
}

function StarDisplay({ rating }: { rating: string }) {
  const r = parseInt(rating, 10)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <FiStar key={s} className={`h-4 w-4 ${s <= r ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
      ))}
    </div>
  )
}

export default function ReviewsModerationClient({ initialReviews }: { initialReviews: ReviewItem[] }) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  // Pop-up free inline state variables
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Listen to success query parameter
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

  const filtered = reviews.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchSearch = !search ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      (r.student?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.course?.title || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const pendingCount = reviews.filter(r => r.status === 'pending').length

  async function updateStatus(reviewId: string, newStatus: 'approved' | 'rejected') {
    setUpdating(reviewId)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/admin/reviews/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, status: newStatus } : r))
      setSuccessMsg(`Review successfully ${newStatus === 'approved' ? 'approved and made live' : 'rejected and hidden'}.`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not moderate review.')
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">Reviews Moderation</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">Review student feedback before it appears on course pages</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 font-bold text-base">
              <FiClock className="h-5 w-5" />
              {pendingCount} awaiting review
            </div>
          )}
          <Link href="/admin/reviews/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-md shadow-[#615fff]/20 transition-all cursor-pointer">
            <FiPlus className="h-5 w-5" /> Add New Review
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-slate-100 border border-slate-200 focus-within:border-[#615fff]/60 rounded-lg transition-colors">
          <FiSearch className="h-5 w-5 text-slate-400 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by student, course or comment..."
            className="bg-transparent border-none outline-none w-full text-base font-semibold text-slate-800 placeholder-slate-400" />
        </div>
        <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-lg">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button key={tab} onClick={() => setFilterStatus(tab)}
              className={`px-4 py-1.5 rounded-md text-base font-bold capitalize transition-all cursor-pointer ${
                filterStatus === tab ? 'bg-[#615fff] text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center shadow-sm">
          <FiStar className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-400">No reviews match your current filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base font-sans border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50 text-sm tracking-wider uppercase">
                  <th className="px-6 py-4">Student / Reviewer</th>
                  <th className="px-6 py-4">Target Course</th>
                  <th className="px-6 py-4">Rating Tier</th>
                  <th className="px-6 py-4">Student Testimonial</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {filtered.map(review => {
                  const conf = statusConfig[review.status]
                  const Icon = conf.icon
                  const isUpdating = updating === review._id
                  const initials = (review.student?.name || 'AN')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr key={review._id} className="hover:bg-slate-50 transition-colors">
                      {/* Student / Reviewer */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#615fff]/15 border border-[#615fff]/20 flex items-center justify-center font-bold text-[#615fff] text-base shrink-0 select-none">
                            {initials}
                          </div>
                          <div>
                            <p className="text-slate-800 font-bold text-base leading-tight">
                              {review.student?.name || 'Anonymous'}
                            </p>
                            <p className="text-slate-400 text-sm font-semibold mt-0.5">
                              {review.student?.email || 'No email provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Target Course */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {review.course ? (
                          <div className="max-w-[200px]">
                            <p className="text-slate-800 font-bold text-base truncate" title={review.course.title}>
                              {review.course.title}
                            </p>
                            <p className="text-slate-400 text-xs font-semibold mt-0.5">
                              slug: {review.course.slug}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold">General Feedback</span>
                        )}
                      </td>

                      {/* Rating Tier */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <StarDisplay rating={review.rating} />
                          <span className="text-slate-400 text-xs font-bold block">{review.rating} / 5 stars</span>
                        </div>
                      </td>

                      {/* Student Testimonial */}
                      <td className="px-6 py-4">
                        <div className="max-w-md space-y-1.5">
                          <blockquote className="text-slate-600 font-semibold text-base italic leading-relaxed line-clamp-2" title={review.comment}>
                            &ldquo;{review.comment}&rdquo;
                          </blockquote>
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                            <FiCalendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold ${conf.color} ${conf.bg} ${conf.border}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {conf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => updateStatus(review._id, 'approved')}
                            disabled={isUpdating || review.status === 'approved'}
                            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-500 text-emerald-600 hover:text-white font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            title="Approve Review"
                          >
                            <FiCheck className="h-4.5 w-4.5" />
                            <span>{isUpdating && updating === review._id ? 'Updating...' : 'Approve'}</span>
                          </button>
                          <button
                            onClick={() => updateStatus(review._id, 'rejected')}
                            disabled={isUpdating || review.status === 'rejected'}
                            className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-rose-500 text-rose-600 hover:text-white font-bold text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            title="Reject Review"
                          >
                            <FiX className="h-4.5 w-4.5" />
                            <span>{isUpdating && updating === review._id ? 'Updating...' : 'Reject'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
