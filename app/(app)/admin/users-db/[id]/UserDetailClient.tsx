'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FiArrowLeft, FiUser, FiMail, FiPhone, FiShield, FiCalendar,
  FiBookOpen, FiCheckCircle, FiClock, FiXCircle, FiLock, FiUnlock, FiTrash2, FiTag,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface EnrollmentRow {
  id: string
  courseTitle: string
  courseSlug: string
  pricePaid: number
  paymentStatus: string
  paymentReference: string
  couponCode: string
  createdAt: string
}

interface UserDetail {
  id: string
  type: 'student' | 'user'
  role: string
  name: string
  email: string
  phone: string
  profilePic: string | null
  status: string
  designation: string
  permissions: string[]
  isSuperAdmin: boolean
  createdAt: string
  updatedAt: string
  enrollments: EnrollmentRow[]
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-BD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  })
}

const PAYMENT_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  pending: 'bg-amber-50 border-amber-200 text-amber-600',
  failed: 'bg-rose-50 border-rose-200 text-rose-600',
  refunded: 'bg-slate-100 border-slate-200 text-slate-500',
}

export default function UserDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || ''

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchUser() {
      try {
        const query = type ? `?type=${type}` : ''
        const res = await fetch(`/api/admin/users-db/${id}${query}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load user')
        setUser(data.user)
      } catch (err: any) {
        setError(err.message || 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id, type])

  const handleToggleStatus = async () => {
    if (!user) return
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    const result = await Swal.fire({
      title: `${newStatus === 'suspended' ? 'Block' : 'Unblock'} Account?`,
      text: newStatus === 'suspended' ? 'The user will lose access to their account.' : "The user's access will be restored.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'suspended' ? '#E61C24' : '#10b981',
      cancelButtonColor: '#475569',
      confirmButtonText: `Yes, ${newStatus === 'suspended' ? 'block' : 'unblock'}!`,
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch('/api/admin/users-db', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, type: user.type, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      setUser({ ...user, status: newStatus })
      Swal.fire('Updated!', `Account has been ${newStatus === 'suspended' ? 'blocked' : 'unblocked'}.`, 'success')
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!user) return
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: 'This action cannot be undone. All data for this user will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E61C24',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Yes, delete it!',
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/users-db?id=${user.id}&type=${user.type}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      await Swal.fire('Deleted!', 'The account has been deleted.', 'success')
      router.push('/admin/users-db')
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-500">Loading user details...</span>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/admin/users-db" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-6">
          <FiArrowLeft className="h-4 w-4" /> Back to User Database
        </Link>
        <div className="bg-white border border-rose-200 rounded-lg p-10 text-center">
          <FiXCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700">{error || 'User not found.'}</p>
        </div>
      </div>
    )
  }

  const completedEnrollments = user.enrollments.filter((e) => e.paymentStatus === 'completed')
  const totalSpent = completedEnrollments.reduce((sum, e) => sum + (e.pricePaid || 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto font-sans">

      {/* Back link */}
      <Link href="/admin/users-db" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <FiArrowLeft className="h-4 w-4" /> Back to User Database
      </Link>

      {/* Profile header card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="h-24 w-24 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {user.profilePic ? (
              <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <FiUser className="h-10 w-10 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{user.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                user.role === 'instructor' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                user.role === 'staff' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {user.isSuperAdmin && <FiShield className="h-3 w-3" />}
                {user.role}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {user.status}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1.5 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2"><FiMail className="h-4 w-4 text-[#E61C24]" /> {user.email || '—'}</span>
              <span className="inline-flex items-center gap-2"><FiPhone className="h-4 w-4 text-[#E61C24]" /> {user.phone || '—'}</span>
              <span className="inline-flex items-center gap-2"><FiCalendar className="h-4 w-4 text-[#E61C24]" /> Joined {formatDate(user.createdAt)}</span>
            </div>

            {user.designation && (
              <p className="text-sm font-semibold text-slate-500">Designation: <span className="text-slate-700">{user.designation}</span></p>
            )}
          </div>

          {/* Actions */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                user.status === 'active'
                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              {user.status === 'active' ? <FiLock className="h-4 w-4" /> : <FiUnlock className="h-4 w-4" />}
              {user.status === 'active' ? 'Block' : 'Unblock'}
            </button>
            {!user.isSuperAdmin && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
              >
                <FiTrash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff permissions */}
      {user.type === 'user' && user.role !== 'admin' && user.permissions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Panel Permissions</h2>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm) => (
              <span key={perm} className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-600 capitalize">
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Student enrollments */}
      {user.type === 'student' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Courses Enrolled</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{completedEnrollments.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Spent</p>
              <p className="text-3xl font-bold text-[#E61C24] mt-1">৳{totalSpent.toLocaleString('en-BD')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Transactions</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{user.enrollments.length}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <FiBookOpen className="h-5 w-5 text-[#E61C24]" />
              <h2 className="text-lg font-bold text-slate-800">Enrollment History</h2>
            </div>

            {user.enrollments.length === 0 ? (
              <div className="p-10 text-center">
                <FiBookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-500">This student hasn&apos;t enrolled in any courses yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {user.enrollments.map((enr) => (
                  <div key={enr.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {enr.courseSlug ? (
                          <Link href={`/courses/${enr.courseSlug}`} className="font-bold text-slate-800 hover:text-[#E61C24] transition-colors truncate">
                            {enr.courseTitle}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-800 truncate">{enr.courseTitle}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${PAYMENT_STYLES[enr.paymentStatus] || PAYMENT_STYLES.refunded}`}>
                          {enr.paymentStatus === 'completed' ? <FiCheckCircle className="h-3 w-3" /> : enr.paymentStatus === 'pending' ? <FiClock className="h-3 w-3" /> : <FiXCircle className="h-3 w-3" />}
                          {enr.paymentStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-450 mt-1">
                        <span>{formatDate(enr.createdAt)}</span>
                        {enr.paymentReference && <span className="font-mono text-slate-500">Ref: {enr.paymentReference}</span>}
                        {enr.couponCode && (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><FiTag className="h-3.5 w-3.5" /> {enr.couponCode}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-slate-800 shrink-0">৳{(enr.pricePaid || 0).toLocaleString('en-BD')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
