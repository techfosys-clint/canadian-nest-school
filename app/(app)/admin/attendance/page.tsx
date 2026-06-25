'use client'

import React, { useState, useEffect } from 'react'
import { 
  FiList, 
  FiUsers, 
  FiCalendar, 
  FiSave, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock,
  FiInfo 
} from 'react-icons/fi'

interface BatchItem {
  _id: string
  name: string
  course: {
    _id: string
    title: string
  }
  students: Array<{
    _id: string
    name: string
    email: string
  }>
}

interface AttendanceRecord {
  student: {
    _id: string
    name: string
    email: string
  }
  status: 'present' | 'absent' | 'excused'
}

interface AttendanceLog {
  _id: string
  date: string
  records: AttendanceRecord[]
  remarks?: string
  instructor: {
    name: string
  }
}

export default function AttendanceAdminPage() {
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null)
  
  const [date, setDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingLogs, setFetchingLogs] = useState(false)
  
  // Attendance records state for currently selected date
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'excused'>>({})
  
  // Historical logs for the selected batch
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [activeTab, setActiveTab] = useState<'sheet' | 'history'>('sheet')

  // Inline Notification Banners (Strictly zero popup alerts!)
  const [sheetSuccessMsg, setSheetSuccessMsg] = useState('')
  const [sheetErrorMsg, setSheetErrorMsg] = useState('')

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch('/api/admin/batches')
        if (res.ok) {
          const data = await res.json()
          const bList = data.batches || []
          setBatches(bList)
          if (bList.length > 0) {
            setSelectedBatchId(bList[0]._id)
            setSelectedBatch(bList[0])
          }
        }
      } catch (err) {
        console.error('Failed to load batches:', err)
      } finally {
        setLoading(false)
      }
    }
    setDate(new Date().toISOString().split('T')[0])
    loadBatches()
  }, [])

  // Refetch logs when selected batch changes
  useEffect(() => {
    if (!selectedBatchId) return
    
    const batchObj = batches.find(b => b._id === selectedBatchId) || null
    setSelectedBatch(batchObj)

    async function loadLogs() {
      setFetchingLogs(true)
      try {
        const res = await fetch(`/api/admin/attendance?batch=${selectedBatchId}`)
        if (res.ok) {
          const data = await res.json()
          setAttendanceLogs(data.attendanceLogs || [])
        }
      } catch (err) {
        console.error('Failed to load attendance logs:', err)
      } finally {
        setFetchingLogs(false)
      }
    }
    loadLogs()
  }, [selectedBatchId, batches])

  // Fetch or initialize attendance sheet for the selected date
  useEffect(() => {
    if (!selectedBatchId || !date) return

    async function loadOrCreateDailySheet() {
      try {
        const res = await fetch(`/api/admin/attendance?batch=${selectedBatchId}&date=${date}`)
        if (res.ok) {
          const data = await res.json()
          const dailyLogs: AttendanceLog[] = data.attendanceLogs || []
          
          if (dailyLogs.length > 0) {
            // Populate existing log
            const log = dailyLogs[0]
            setRemarks(log.remarks || '')
            const recordMap: Record<string, 'present' | 'absent' | 'excused'> = {}
            log.records.forEach(rec => {
              const studentId = typeof rec.student === 'object' ? rec.student._id : rec.student
              recordMap[studentId] = rec.status
            })
            setAttendanceRecords(recordMap)
          } else {
            // Initialize fresh sheet: all students default to "present"
            setRemarks('')
            const defaultMap: Record<string, 'present' | 'absent' | 'excused'> = {}
            selectedBatch?.students?.forEach(student => {
              defaultMap[student._id] = 'present'
            })
            setAttendanceRecords(defaultMap)
          }
        }
      } catch (err) {
        console.error('Failed to resolve daily sheet:', err)
      }
    }
    loadOrCreateDailySheet()
  }, [selectedBatchId, date, selectedBatch])

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatchId || !date) return

    setSaving(true)
    const recordsPayload = Object.entries(attendanceRecords).map(([studentId, status]) => ({
      student: studentId,
      status
    }))

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          date,
          records: recordsPayload,
          remarks
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSheetSuccessMsg('Attendance sheet successfully registered and saved.')
        setTimeout(() => setSheetSuccessMsg(''), 4000)

        // Refresh historical logs
        const refreshedLogs = await fetch(`/api/admin/attendance?batch=${selectedBatchId}`)
        if (refreshedLogs.ok) {
          const lData = await refreshedLogs.json()
          setAttendanceLogs(lData.attendanceLogs || [])
        }
      } else {
        throw new Error(data.error || 'Failed to save attendance.')
      }
    } catch (err: any) {
      setSheetErrorMsg(err.message || 'Operation failed. Please try again.')
      setTimeout(() => setSheetErrorMsg(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  // Attendance metrics helper
  const totalStudents = selectedBatch?.students?.length || 0
  const presentCount = Object.values(attendanceRecords).filter(v => v === 'present').length
  const absentCount = Object.values(attendanceRecords).filter(v => v === 'absent').length
  const excusedCount = Object.values(attendanceRecords).filter(v => v === 'excused').length
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-slate-600">Loading Attendance Workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 pb-16">
      
      {/* Page Title Header */}
      <div className="mb-8 select-none">
        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/15 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-3">
          Academic Registry
        </span>
        <h1 className="text-3xl font-bold font-display text-slate-800 leading-tight">
          Instructor Attendance Log
        </h1>
        <p className="text-base font-semibold text-slate-400 mt-1">
          Select an active intake batch, specify the class date, and record student attendance.
        </p>
      </div>

      {/* Tabs header */}
      <div className="flex items-center gap-2 border-b border-slate-200 select-none mb-8">
        <button
          onClick={() => setActiveTab('sheet')}
          className={`pb-3.5 px-5 font-bold text-base border-b-2 transition-colors cursor-pointer ${
            activeTab === 'sheet' 
              ? 'border-[#E61C24] text-slate-800' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Daily Attendance Sheet
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 px-5 font-bold text-base border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history' 
              ? 'border-[#E61C24] text-slate-800' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Attendance Logs History ({attendanceLogs.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Select Batch and view metrics */}
        <div className="space-y-6 lg:col-span-1">
          
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-600 flex items-center gap-2 select-none">
              <FiList className="text-[#E61C24]" />
              <span>Select Active Batch</span>
            </h3>
            
            {batches.length === 0 ? (
              <p className="text-base font-semibold text-slate-400 leading-relaxed select-none">
                No active batches found. Instructors must have launched batches to manage attendance.
              </p>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/60 rounded-lg px-4 py-3 text-base font-semibold text-slate-800 outline-none cursor-pointer"
              >
                {batches.map(b => (
                  <option key={b._id} value={b._id}>{b.name} ({b.course?.title.substring(0, 15)}...)</option>
                ))}
              </select>
            )}
          </div>

          {selectedBatch && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5 select-none">
              <h3 className="text-base font-bold text-slate-600 flex items-center gap-2">
                <FiInfo className="text-[#E61C24]" />
                <span>Daily Sheet Metrics</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-center">
                  <p className="text-base font-bold text-slate-400 uppercase leading-none">Present</p>
                  <p className="text-2xl font-bold text-emerald-500 mt-2">{presentCount}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-center">
                  <p className="text-base font-bold text-slate-400 uppercase leading-none">Absent</p>
                  <p className="text-2xl font-bold text-rose-500 mt-2">{absentCount}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-center">
                  <p className="text-base font-bold text-slate-400 uppercase leading-none">Excused</p>
                  <p className="text-2xl font-bold text-amber-500 mt-2">{excusedCount}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-center">
                  <p className="text-base font-bold text-slate-400 uppercase leading-none">Attendance</p>
                  <p className="text-2xl font-bold text-slate-800 mt-2">{attendanceRate}%</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <p className="text-base font-semibold text-slate-400">Intake Course:</p>
                <p className="text-base font-bold text-slate-800 truncate">{selectedBatch.course?.title}</p>
                <p className="text-base font-semibold text-slate-400 mt-2.5">Total Enrolled:</p>
                <p className="text-base font-bold text-[#E61C24]">{totalStudents} registered students</p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Tab Specific Details */}
        <div className="lg:col-span-3 space-y-6">
          
          {activeTab === 'sheet' ? (
            /* Tab 1: Attendance Daily Sheet Form */
            selectedBatch ? (
              <form onSubmit={handleSaveAttendance} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                
                {/* Daily Setup Toolbar */}
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-[#E61C24] h-5 w-5 shrink-0" />
                    <span className="text-base font-bold text-slate-800">Class Registry Date</span>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 focus:border-[#E61C24]/60 rounded-lg px-3 py-2 text-base font-semibold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                  
                  <span className="text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3.5 py-1.5 rounded-lg">
                    {totalStudents} Student Seats
                  </span>
                </div>

                {/* Attendance Banners */}
                <div className="px-5 pt-5 select-none">
                  {sheetSuccessMsg && (
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-semibold text-base flex items-center gap-2 animate-fadeIn">
                      <FiCheckCircle className="shrink-0 h-5 w-5" />
                      <span>{sheetSuccessMsg}</span>
                    </div>
                  )}
                  {sheetErrorMsg && (
                    <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 font-semibold text-base flex items-center gap-2 animate-fadeIn">
                      <FiAlertCircle className="shrink-0 h-5 w-5" />
                      <span>{sheetErrorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Students list for marking */}
                {selectedBatch.students?.length === 0 ? (
                  <div className="p-12 text-center select-none">
                    <FiUsers className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No Students Registered</h3>
                    <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                      This batch currently has no enrolled students. Please add students in the Batch Management page first.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/60 max-h-[500px] overflow-y-auto pr-1">
                    {selectedBatch.students.map((student) => {
                      const currentStatus = attendanceRecords[student._id] || 'present'
                      return (
                        <div key={student._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1a1a1c]/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-base font-bold text-slate-800 truncate">{student.name}</p>
                            <p className="text-base text-slate-400 truncate mt-0.5">{student.email}</p>
                          </div>
                          
                          {/* Attendance Status Radio Toggles */}
                          <div className="flex items-center gap-2 select-none bg-slate-50 border border-slate-200 p-1 rounded-lg shrink-0">
                            {(['present', 'absent', 'excused'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(student._id, st)}
                                className={`px-4 py-2 rounded-lg text-base font-bold uppercase tracking-wider transition-all cursor-pointer border-none ${
                                  currentStatus === st
                                    ? st === 'present'
                                      ? 'bg-emerald-600 text-white shadow'
                                      : st === 'absent'
                                        ? 'bg-rose-600 text-slate-800 shadow'
                                        : 'bg-amber-600 text-slate-800 shadow'
                                    : 'text-slate-400 hover:text-slate-600'
                                  }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Footer Save & Remarks bar */}
                {selectedBatch.students?.length > 0 && (
                  <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-slate-500 block select-none">Class Session Remarks / Notes</label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="e.g. Completed module 3 review session / Q&A class"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/60 rounded-lg px-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder-zinc-600"
                      />
                    </div>

                    <div className="flex items-center justify-end select-none">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 bg-[#E61C24] hover:bg-[#CC181F] disabled:bg-[#E61C24]/50 text-slate-800 font-bold text-base rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer border-none"
                      >
                        {saving ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving Sheet...</span>
                          </>
                        ) : (
                          <>
                            <FiSave className="h-5 w-5" />
                            <span>Save Daily Sheet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </form>
            ) : (
              <div className="p-12 bg-white border border-slate-200 rounded-lg text-center select-none">
                <p className="text-base font-semibold text-slate-400">Please select or launch a batch intake from the sidebar to begin.</p>
              </div>
            )
          ) : (
            /* Tab 2: Historical Logs view */
            <div className="space-y-4">
              {fetchingLogs ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
                  <div className="h-8 w-8 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-400">Fetching historical logs...</p>
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div className="p-12 bg-white border border-slate-200 rounded-lg text-center select-none">
                  <FiClock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-slate-800">No Historical Logs Found</h3>
                  <p className="text-base font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Attendance logs will automatically display here historically once daily sheets are registered by the instructor.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceLogs.map((log) => {
                    const lDate = new Date(log.date)
                    const totalRecords = log.records?.length || 0
                    const pRecs = log.records?.filter(r => r.status === 'present').length || 0
                    const rate = totalRecords > 0 ? Math.round((pRecs / totalRecords) * 100) : 0

                    return (
                      <div key={log._id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FiCalendar className="text-[#E61C24] h-5 w-5" />
                            {lDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </h4>
                          {log.remarks && (
                            <p className="text-base font-semibold text-slate-500 italic">
                              Remarks: &ldquo;{log.remarks}&rdquo;
                            </p>
                          )}
                          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Logged by: {log.instructor?.name || 'Expert Instructor'}
                          </p>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 select-none">
                          <div className="text-right">
                            <p className="text-base font-bold text-slate-400 uppercase leading-none">Rate</p>
                            <p className={`text-xl font-bold mt-1.5 ${
                              rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-rose-500'
                            }`}>{rate}% attendance</p>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-lg flex items-center gap-3 text-base font-bold uppercase tracking-wider">
                            <span className="text-emerald-500">{pRecs} P</span>
                            <span className="text-rose-500">{log.records?.filter(r => r.status === 'absent').length || 0} A</span>
                            <span className="text-amber-500">{log.records?.filter(r => r.status === 'excused').length || 0} E</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
