'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FiUsers, 
  FiSearch, 
  FiTrash2, 
  FiRefreshCw, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiClock, 
  FiX, 
  FiTrendingUp, 
  FiDollarSign, 
  FiArrowLeft,
  FiBookOpen
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface Enrollment {
  id: string
  studentName: string
  studentEmail: string
  courseTitle: string
  pricePaid: number
  paymentStatus: 'completed' | 'pending' | 'refunded'
  createdAt: string
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  refunded: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ManageEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')

  async function fetchEnrollments() {
    setError(null)
    try {
      const res = await fetch('/api/admin/enrollments', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to load student enrollment records.')
      }
      const json = await res.json()
      if (json.success) {
        setEnrollments(json.enrollments || [])
      } else {
        throw new Error(json.error || 'Failed to fetch enrollments.')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEnrollments()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchEnrollments()
  }

  const handleRemoveEnrollment = async (enrollmentId: string, studentName: string, courseTitle: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will completely remove/unenroll ${studentName} from the course "${courseTitle}". The student will lose all access immediately!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove enrollment',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
      color: '#1a1a1a',
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/enrollments?id=${enrollmentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Failed to unenroll student')
      }

      const json = await res.json()
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Unenrolled Successfully',
          text: `${studentName} has been removed from "${courseTitle}".`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          background: '#ffffff',
          color: '#1a1a1a',
        })

        // Refresh lists
        fetchEnrollments()
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Failed to remove enrollment',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    }
  }

  // Get unique courses for dropdown filter
  const uniqueCourses = Array.from(new Set(enrollments.map(e => e.courseTitle))).sort()

  // Filtered List
  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || e.paymentStatus === statusFilter
    const matchesCourse = courseFilter === 'all' || e.courseTitle === courseFilter

    return matchesSearch && matchesStatus && matchesCourse
  })

  // Metrics calculation based on loaded data
  const totalCount = enrollments.length
  const completedCount = enrollments.filter(e => e.paymentStatus === 'completed').length
  const pendingCount = enrollments.filter(e => e.paymentStatus === 'pending').length
  const refundedCount = enrollments.filter(e => e.paymentStatus === 'refunded').length
  const netRevenue = enrollments
    .filter(e => e.paymentStatus === 'completed')
    .reduce((sum, e) => sum + e.pricePaid, 0)

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-slate-500">Loading Enrollment console...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center space-y-4 max-w-md bg-white border border-slate-200 p-6 rounded-lg">
          <FiAlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Enrollment Load Error</h2>
          <p className="text-base font-semibold text-slate-500 leading-relaxed">{error}</p>
          <button 
            onClick={fetchEnrollments} 
            className="w-full py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer transition-all duration-200"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 select-text">
      
      {/* ─── Header Panel ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="inline-flex items-center justify-center text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Back to Dashboard"
            >
              <FiArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manage Enrollments</h1>
          </div>
          <p className="text-base font-semibold text-slate-500 mt-1 pl-7">
            Search, filter, and unenroll active students from dynamic course subscriptions.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold text-base transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {/* ─── Metrics Section (Sleek Borderless Grid) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Enrollments */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-500">Total Enrollments</p>
            <div className="h-10 w-10 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center text-[#E61C24]">
              <FiUsers className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{totalCount}</p>
          <p className="text-sm font-semibold text-slate-400">gross transaction count</p>
        </div>

        {/* Completed Transactions */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-500">Active Students</p>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FiCheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{completedCount}</p>
          <p className="text-sm font-semibold text-emerald-500/80">Completed: {completedCount} accounts</p>
        </div>

        {/* Pending Transactions */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-500">Pending Orders</p>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FiClock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{pendingCount}</p>
          <p className="text-sm font-semibold text-amber-500/80">awaiting payment confirmation</p>
        </div>

        {/* Refunded/Canceled */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-500">Refunded / Canceled</p>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FiX className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{refundedCount}</p>
          <p className="text-sm font-semibold text-rose-450">revoked student profiles</p>
        </div>

      </div>

      {/* ─── Search & Filters Control Panel ─── */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">Search & Filtration Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Large search input */}
          <div className="md:col-span-6 relative flex items-center">
            <input
              type="text"
              placeholder="Search student name, email, or course title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#E61C24] rounded-lg text-slate-800 text-base font-semibold focus:outline-none placeholder-zinc-550 transition-colors"
            />
            <FiSearch className="absolute left-3 text-slate-400 h-4.5 w-4.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <FiX className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-base font-semibold focus:outline-none focus:border-[#E61C24] cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="completed">Active (Completed)</option>
              <option value="pending">Pending Orders</option>
              <option value="refunded">Refunded / Canceled</option>
            </select>
          </div>

          {/* Course filter */}
          <div className="md:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-base font-semibold focus:outline-none focus:border-[#E61C24] cursor-pointer"
            >
              <option value="all">All Courses Assigned</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ─── Main Table Card ─── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Enrollment Catalog</h2>
            <p className="text-base font-semibold text-slate-500 mt-0.5">
              Showing {filteredEnrollments.length} matching enrollments
            </p>
          </div>
          {filteredEnrollments.length > 0 && (
            <span className="text-base font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Net: {formatCurrency(netRevenue)}
            </span>
          )}
        </div>

        {filteredEnrollments.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-semibold text-base space-y-4">
            <FiUsers className="h-12 w-12 text-zinc-700 mx-auto" />
            <p>No enrollment records matching your filters were found.</p>
            {(searchQuery || statusFilter !== 'all' || courseFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setCourseFilter('all')
                }}
                className="py-2 px-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-base">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-base uppercase tracking-wider select-none">
                  <th className="px-6 py-3.5">Student Info</th>
                  <th className="px-6 py-3.5">Course Purchased</th>
                  <th className="px-4 py-3.5 text-center">Enroll Date</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Fee Paid</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-100/40 transition-colors">
                    
                    {/* Student Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#E61C24]/8 border border-[#E61C24]/15 flex items-center justify-center font-bold text-base text-[#E61C24] uppercase shrink-0">
                          {e.studentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{e.studentName}</p>
                          <p className="text-sm font-semibold text-slate-400 mt-0.5">{e.studentEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate leading-snug">
                      {e.courseTitle}
                    </td>

                    {/* Enroll Date */}
                    <td className="px-4 py-4 text-center text-slate-500 text-sm">
                      {formatDate(e.createdAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-base font-bold capitalize select-none ${statusColors[e.paymentStatus] || ''}`}>
                        {e.paymentStatus}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-right font-bold text-emerald-455">
                      {formatCurrency(e.pricePaid)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveEnrollment(e.id, e.studentName, e.courseTitle)}
                        className="p-2 text-rose-450 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                        title="Remove Course Enrollment (Unenroll)"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
