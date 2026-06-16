'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiUsers, 
  FiSave, 
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'

interface CourseOption {
  _id: string
  title: string
}

interface InstructorOption {
  _id: string
  name: string
  role: string
}

interface Props {
  params: Promise<{ id: string }>
}

export default function EditBatchPage({ params }: Props) {
  const router = useRouter()
  const { id: batchId } = React.use(params)

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState<any>(null)

  // Form Fields
  const [batchName, setBatchName] = useState('')
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('') // Courses are fixed after creation
  const [selectedInstructor, setSelectedInstructor] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming')

  // Notification Banners (Strictly zero popup alerts!)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meRes.ok && meData.authenticated) {
          setSessionUser(meData.user)
        }

        const [batchRes, staffRes] = await Promise.all([
          fetch(`/api/admin/batches/${batchId}`),
          fetch('/api/admin/staff')
        ])

        if (batchRes.ok) {
          const bData = await batchRes.json()
          const bObj = bData.batch
          if (bObj) {
            setBatchName(bObj.name)
            setSelectedCourseTitle(bObj.course?.title || 'Unknown Course')
            setSelectedInstructor(bObj.instructor?._id || '')
            setStartDate(bObj.startDate.split('T')[0])
            setEndDate(bObj.endDate.split('T')[0])
            setStatus(bObj.status)
          }
        }

        if (staffRes.ok) {
          const sData = await staffRes.json()
          const usersList = sData.staff || []
          const instructorList = usersList.filter((u: any) => ['admin', 'instructor'].includes(u.role))
          setInstructors(instructorList)
        }
      } catch (err) {
        console.error('Failed to load edit batch data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [batchId])

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!batchName.trim() || !startDate || !endDate) {
      setErrorMsg('Please fill in all required fields.')
      setTimeout(() => setErrorMsg(''), 4000)
      return
    }

    const payload = {
      name: batchName,
      instructor: selectedInstructor,
      startDate,
      endDate,
      status,
    }

    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Intake batch details updated successfully. Redirecting...')
        setTimeout(() => {
          router.push('/admin/batches')
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to update batch.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed. Please try again.')
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#615fff] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-slate-500">Loading batch details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 pb-16">
      
      {/* Header toolbar */}
      <div className="flex items-center justify-between mb-8 select-none">
        <button 
          onClick={() => router.push('/admin/batches')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-[#222] text-slate-600 hover:text-slate-800 font-bold text-base transition-colors cursor-pointer"
        >
          <FiArrowLeft className="h-5 w-5" />
          <span>Back to Batches</span>
        </button>
        <span className="text-base font-bold text-[#615fff] bg-[#615fff]/10 px-4 py-1.5 rounded-lg uppercase tracking-wider">
          Edit Mode
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center gap-2.5 select-none">
          <FiUsers className="text-[#615fff] h-6 w-6" />
          <h1 className="text-xl font-bold text-slate-800">Update Intake Batch</h1>
        </div>

        <form onSubmit={handleUpdateBatch} className="p-8 space-y-6">
          
          {successMsg && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-semibold text-base flex items-center gap-2 animate-fadeIn">
              <FiCheckCircle className="shrink-0 h-5 w-5" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 font-semibold text-base flex items-center gap-2 animate-fadeIn">
              <FiAlertCircle className="shrink-0 h-5 w-5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Batch Name */}
          <div className="space-y-1.5">
            <label className="text-base font-bold text-slate-600 block select-none">Intake Batch Name *</label>
            <input
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Batch 1 / Jan Intake 2026"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#615fff]/60 rounded-lg px-4 py-3.5 text-base font-semibold text-slate-800 outline-none"
            />
          </div>

          {/* Course Selection (Disabled after creation) */}
          <div className="space-y-1.5">
            <label className="text-base font-bold text-slate-500 block select-none">Designated Course (Static)</label>
            <input
              type="text"
              disabled
              value={selectedCourseTitle}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3.5 text-base font-semibold text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* Instructor Selection */}
          {sessionUser?.role === 'admin' ? (
            <div className="space-y-1.5">
              <label className="text-base font-bold text-slate-600 block select-none">Assign Instructor *</label>
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#615fff]/60 rounded-lg px-4 py-3.5 text-base font-semibold text-slate-800 outline-none cursor-pointer"
              >
                {instructors.map(inst => (
                  <option key={inst._id} value={inst._id}>{inst.name} ({inst.role})</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-base font-bold text-slate-600 block select-none">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#615fff]/60 rounded-lg px-4 py-3.5 text-base font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-base font-bold text-slate-600 block select-none">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#615fff]/60 rounded-lg px-4 py-3.5 text-base font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-base font-bold text-slate-600 block select-none">Intake Status</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg select-none">
              {['upcoming', 'active', 'completed'].map((st) => (
                <label 
                  key={st}
                  className={`flex-1 flex items-center justify-center py-3 rounded-lg text-base font-bold uppercase tracking-wide cursor-pointer transition-all ${
                    status === st 
                      ? 'bg-[#615fff] text-white shadow shadow-[#615fff]/20' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={st}
                    checked={status === st}
                    onChange={() => setStatus(st as any)}
                    className="hidden"
                  />
                  <span>{st}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end select-none">
            <button
              type="submit"
              className="w-full px-6 py-4 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base transition-colors inline-flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-[#615fff]/15"
            >
              <FiSave className="h-5 w-5" />
              <span>Update Intake Batch</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  )
}
