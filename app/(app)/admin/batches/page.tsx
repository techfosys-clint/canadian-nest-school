'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiBookOpen, 
  FiCalendar, 
  FiUser, 
  FiX, 
  FiSearch,
  FiCheckCircle
} from 'react-icons/fi'

interface BatchItem {
  _id: string
  name: string
  course: {
    _id: string
    title: string
  }
  instructor: {
    _id: string
    name: string
  }
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'completed'
  students: Array<{
    _id: string
    name: string
    email: string
  }>
}

interface StudentOption {
  _id: string
  name: string
  email: string
}

export default function BatchesAdminPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState<any>(null)

  // Selected Batch for student management (rendered inline at bottom)
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null)

  // Search & Student Management
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [batchSearchQuery, setBatchSearchQuery] = useState('')

  // Inline Notification Banners
  const [managerSuccessMsg, setManagerSuccessMsg] = useState('')

  const studentManagerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meRes.ok && meData.authenticated) {
          setSessionUser(meData.user)
        }

        const [batchesRes, enrolledRes] = await Promise.all([
          fetch('/api/admin/batches'),
          fetch('/api/enrollments?depth=2')
        ])

        if (batchesRes.ok) {
          const bData = await batchesRes.json()
          setBatches(bData.batches || [])
        }

        if (enrolledRes.ok) {
          const eData = await enrolledRes.json()
          const docs = eData.docs || []
          const uniqueStudentsMap: Record<string, StudentOption> = {}
          docs.forEach((d: any) => {
            if (d.student && typeof d.student === 'object') {
              uniqueStudentsMap[d.student._id] = {
                _id: d.student._id,
                name: d.student.name,
                email: d.student.email,
              }
            }
          })
          setAllStudents(Object.values(uniqueStudentsMap))
        }

      } catch (err) {
        console.error('Error fetching batch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDeleteBatch = async (id: string) => {
    const confirm = window.confirm('Are you absolutely sure you want to delete this batch?')
    if (!confirm) return

    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok && data.success) {
        setBatches(prev => prev.filter(b => b._id !== id))
        if (selectedBatch?._id === id) {
          setSelectedBatch(null)
        }
      } else {
        throw new Error(data.error || 'Failed to delete batch.')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete batch.')
    }
  }

  const handleSelectBatchStudents = (batch: BatchItem) => {
    setSelectedBatch(batch)
    // Scroll to student manager smoothly
    setTimeout(() => {
      studentManagerRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleAddStudentToBatch = async (student: StudentOption) => {
    if (!selectedBatch) return

    if (selectedBatch.students.some(s => s._id === student._id)) {
      setManagerSuccessMsg('Student is already registered in this batch.')
      setTimeout(() => setManagerSuccessMsg(''), 3000)
      return
    }

    const updatedStudentIds = [...selectedBatch.students.map(s => s._id), student._id]
    
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: updatedStudentIds })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const updatedBatch = {
          ...selectedBatch,
          students: [...selectedBatch.students, student]
        }
        setSelectedBatch(updatedBatch)
        setBatches(prev => prev.map(b => b._id === selectedBatch._id ? updatedBatch : b))
        
        setManagerSuccessMsg(`Added ${student.name} successfully.`)
        setTimeout(() => setManagerSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      console.error('Failed to add student to batch:', err)
    }
  }

  const handleRemoveStudentFromBatch = async (studentId: string) => {
    if (!selectedBatch) return

    const updatedStudentIds = selectedBatch.students.map(s => s._id).filter(id => id !== studentId)

    try {
      const res = await fetch(`/api/admin/batches/${selectedBatch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: updatedStudentIds })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const updatedBatch = {
          ...selectedBatch,
          students: selectedBatch.students.filter(s => s._id !== studentId)
        }
        setSelectedBatch(updatedBatch)
        setBatches(prev => prev.map(b => b._id === selectedBatch._id ? updatedBatch : b))
        
        setManagerSuccessMsg('Student removed successfully.')
        setTimeout(() => setManagerSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      console.error('Failed to remove student from batch:', err)
    }
  }

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(batchSearchQuery.toLowerCase()) ||
    b.course?.title.toLowerCase().includes(batchSearchQuery.toLowerCase())
  )

  const filteredAvailableStudents = allStudents.filter(student => 
    (student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())) &&
    !(selectedBatch?.students.some(s => s._id === student._id))
  )

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-slate-500">Loading Batches Workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 pb-16">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 select-none">
        <div>
          <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/15 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-3">
            Academic Operations
          </span>
          <h1 className="text-3xl font-bold font-display text-slate-800 leading-tight">
            Batch Management
          </h1>
          <p className="text-base font-semibold text-slate-400 mt-1">
            Configure active study intakes, group students, assign instructors, and schedule courses.
          </p>
        </div>

        <button
          onClick={() => router.push('/admin/batches/new')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base rounded-lg transition-colors cursor-pointer border-none shadow-md shadow-[#E61C24]/15 shrink-0"
        >
          <FiPlus className="h-5 w-5" />
          <span>Launch Intake Batch</span>
        </button>
      </div>

      {/* Main Batches Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        
        {/* Search Toolbar */}
        <div className="p-5 border-b border-slate-200 flex items-center relative select-none">
          <FiSearch className="absolute left-9 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={batchSearchQuery}
            onChange={(e) => setBatchSearchQuery(e.target.value)}
            placeholder="Search batches by title or course name..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/60 rounded-lg pl-12 pr-4 py-3.5 text-base font-semibold text-slate-800 outline-none placeholder-slate-400"
          />
        </div>

        {filteredBatches.length === 0 ? (
          <div className="p-16 text-center select-none">
            <FiUsers className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-slate-800">No Batches Found</h3>
            <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Launch a new academic intake batch using the top action button.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-base uppercase tracking-wider select-none">
                  <th className="p-5">Intake Batch</th>
                  <th className="p-5">Course</th>
                  <th className="p-5">Instructor</th>
                  <th className="p-5">Duration</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Students</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {filteredBatches.map((batch) => {
                  const isSelectedForStudents = selectedBatch?._id === batch._id
                  return (
                    <tr key={batch._id} className={`hover:bg-[#1a1a1c]/40 transition-colors ${isSelectedForStudents ? 'bg-[#E61C24]/5 hover:bg-[#E61C24]/8' : ''}`}>
                      <td className="p-5">
                        <p className="text-base font-bold text-slate-800">{batch.name}</p>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">ID: {batch._id.substring(18)}</p>
                      </td>
                      <td className="p-5">
                        <p className="text-base font-bold text-slate-600 flex items-center gap-1.5">
                          <FiBookOpen className="text-[#E61C24] h-4.5 w-4.5 shrink-0" />
                          {batch.course?.title || 'Unknown Course'}
                        </p>
                      </td>
                      <td className="p-5">
                        <p className="text-base font-bold text-slate-500 flex items-center gap-1.5">
                          <FiUser className="text-slate-400 h-4.5 w-4.5 shrink-0" />
                          {batch.instructor?.name || 'Expert Instructor'}
                        </p>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-1.5 text-base font-semibold text-slate-500 select-none">
                          <FiCalendar className="text-zinc-655 h-4.5 w-4.5 shrink-0" />
                          <span>{new Date(batch.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="p-5 select-none">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          batch.status === 'active' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450' 
                            : batch.status === 'completed'
                              ? 'bg-zinc-750/20 border border-slate-300/30 text-slate-500'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="p-5">
                        <button
                          onClick={() => handleSelectBatchStudents(batch)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-base font-bold transition-all cursor-pointer select-none whitespace-nowrap active:scale-[0.98] ${
                            isSelectedForStudents
                              ? 'bg-[#E61C24] border-transparent text-slate-800 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-[#222] text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          <FiUsers className="h-4.5 w-4.5" />
                          <span>{batch.students?.length || 0} Students</span>
                        </button>
                      </td>
                      <td className="p-5 text-right select-none">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/batches/${batch._id}/edit`)}
                            className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-[#222] transition-colors cursor-pointer"
                            title="Edit Batch details"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          {sessionUser?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteBatch(batch._id)}
                              className="p-2.5 rounded-lg border border-red-500/15 hover:border-red-500 bg-slate-50 text-red-500 hover:bg-red-550/10 transition-colors cursor-pointer"
                              title="Delete Batch"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Section: Inline Batch Student Manager (Completely Inline, Zero Popups) ── */}
      {selectedBatch && (
        <div ref={studentManagerRef} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mt-10 animate-fadeIn">
          
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FiUsers className="text-[#E61C24]" />
                <span>Manage Students - {selectedBatch.name}</span>
              </h2>
              <p className="text-sm font-semibold text-slate-400 mt-1">
                Course: <span className="text-slate-800 font-bold">{selectedBatch.course?.title}</span> — assign or remove student registrations from this intake.
              </p>
            </div>
            <button 
              onClick={() => setSelectedBatch(null)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            
            {/* Inline success banner */}
            {managerSuccessMsg && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 font-semibold text-base mb-6 flex items-center gap-2 animate-fadeIn">
                <FiCheckCircle className="shrink-0 h-5 w-5" />
                <span>{managerSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Left Side: Current Students List */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-600 flex items-center gap-2 select-none">
                  <FiCheckCircle className="text-emerald-500" />
                  <span>Currently Enrolled Students ({selectedBatch.students?.length || 0})</span>
                </h3>
                
                <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 max-h-[350px] overflow-y-auto space-y-3 pr-2">
                  {selectedBatch.students?.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 select-none">
                      <FiUsers className="h-10 w-10 mx-auto mb-2 text-zinc-655 animate-pulse" />
                      <p className="text-base font-semibold">No students registered in this batch yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Use the search box on the right to enroll students.</p>
                    </div>
                  ) : (
                    selectedBatch.students.map(s => (
                      <div key={s._id} className="p-4 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3 group">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-800 truncate">{s.name}</p>
                          <p className="text-base text-slate-400 truncate mt-0.5">{s.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveStudentFromBatch(s._id)}
                          className="px-4 py-2 rounded-lg border border-red-500/15 hover:border-red-500 bg-slate-50 text-red-500 hover:bg-red-550/10 text-base font-bold transition-all cursor-pointer select-none"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Search and Enroll Students */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-600 flex items-center gap-2 select-none">
                  <FiPlus className="text-[#E61C24]" />
                  <span>Enroll Registered Student</span>
                </h3>

                {/* Search Bar */}
                <div className="relative select-none">
                  <FiSearch className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by student name or email address..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/60 rounded-lg pl-11 pr-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder-zinc-550"
                  />
                </div>

                {/* Search Results list */}
                <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 max-h-[290px] overflow-y-auto space-y-3 pr-2">
                  {filteredAvailableStudents.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 select-none">
                      <p className="text-base font-semibold">No matching unregistered students found.</p>
                    </div>
                  ) : (
                    filteredAvailableStudents.map(s => (
                      <div key={s._id} className="p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 flex items-center justify-between gap-3 transition-colors">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-800 truncate">{s.name}</p>
                          <p className="text-base text-slate-400 truncate mt-0.5">{s.email}</p>
                        </div>
                        <button
                          onClick={() => handleAddStudentToBatch(s)}
                          className="px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white text-base font-bold transition-colors cursor-pointer select-none border-none shadow shadow-[#E61C24]/10"
                        >
                          Enroll
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}
