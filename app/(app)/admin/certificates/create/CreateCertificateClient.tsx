'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiAward, FiDownload, FiSearch, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'

type CourseOption = {
  id: string
  title: string
  level: string
  summary: string
}

type Props = {
  courses: CourseOption[]
}

export default function CreateCertificateClient({ courses }: Props) {
  const [studentName, setStudentName] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [generating, setGenerating] = useState(false)

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase()
    if (!q) return courses.slice(0, 12)
    return courses
      .filter((c) => c.title.toLowerCase().includes(q))
      .slice(0, 12)
  }, [courses, courseSearch])

  const selectedCourse = courseId
    ? courses.find((c) => c.id === courseId) || null
    : null

  const selectCourse = (course: CourseOption) => {
    setCourseId(course.id)
    setCourseTitle(course.title)
    setCourseSearch('')
    setShowSuggestions(false)
  }

  const clearCourseSelection = () => {
    setCourseId(null)
    setCourseTitle('')
    setCourseSearch('')
    setShowSuggestions(false)
  }

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault()

    const name = studentName.trim()
    const title = courseTitle.trim()

    if (!name) {
      Swal.fire({
        icon: 'warning',
        title: 'Student name required',
        text: 'Enter the student name as it should appear on the certificate.',
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }
    if (!title) {
      Swal.fire({
        icon: 'warning',
        title: 'Course name required',
        text: 'Search and select a course, or type a course name below.',
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/admin/certificates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: name,
          courseTitle: title,
          courseId: courseId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate certificate.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const safeName = name.replace(/[^a-zA-Z0-9-_]+/g, '-')
      const safeCourse = title.replace(/[^a-zA-Z0-9-_]+/g, '-')
      link.href = url
      link.download = `${safeName}-${safeCourse}-certificate.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      await Swal.fire({
        icon: 'success',
        title: 'Certificate ready',
        text: 'PDF downloaded. You can print it or email it to the student.',
        timer: 1800,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not generate certificate.'
      Swal.fire({
        icon: 'error',
        title: 'Generation failed',
        text: message,
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
        <Link
          href="/admin/certificates"
          className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center shrink-0"
          title="Back to certificate requests"
        >
          <FiArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 flex items-center gap-2">
            <FiAward className="text-[#E61C24]" /> Create Certificate
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Generate a completion PDF for offline students — for print or email.
            Nothing is saved to the student dashboard.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleDownload}
        className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm max-w-2xl"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="studentName" className="text-base font-bold text-slate-700">
            Student name
          </label>
          <input
            id="studentName"
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Full name as printed on the certificate"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 text-base font-semibold text-slate-800 border border-slate-200 focus:border-[#E61C24]/50 focus:bg-white outline-none transition-colors"
            autoComplete="off"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="courseSearch" className="text-base font-bold text-slate-700">
            Search catalog courses
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-3.5 text-slate-400 h-5 w-5 pointer-events-none" />
            <input
              id="courseSearch"
              type="text"
              value={courseSearch}
              onChange={(e) => {
                setCourseSearch(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 150)
              }}
              placeholder="Type to find a course..."
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-50 text-base font-semibold text-slate-800 border border-slate-200 focus:border-[#E61C24]/50 focus:bg-white outline-none transition-colors"
              autoComplete="off"
            />

            {showSuggestions && filteredCourses.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-md">
                {filteredCourses.map((course) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCourse(course)}
                      className={`w-full text-left px-4 py-3 text-base font-semibold border-none cursor-pointer transition-colors ${
                        courseId === course.id
                          ? 'bg-[#E61C24]/5 text-[#E61C24]'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {course.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedCourse && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <p className="text-base font-semibold text-emerald-700 min-w-0 truncate">
                Catalog: {selectedCourse.title}
              </p>
              <button
                type="button"
                onClick={clearCourseSelection}
                className="inline-flex items-center gap-1 shrink-0 text-base font-bold text-emerald-800 bg-transparent border-none cursor-pointer hover:text-emerald-950"
              >
                <FiX className="h-4 w-4" /> Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="courseTitlePrint" className="text-base font-bold text-slate-700">
            Course name on certificate
          </label>
          <p className="text-base font-semibold text-slate-500">
            Filled from search, or type any custom course name. This is what appears
            in the certificate text.
          </p>
          <input
            id="courseTitlePrint"
            type="text"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="Course name printed on the PDF"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 text-base font-semibold text-slate-800 border border-slate-200 focus:border-[#E61C24]/50 focus:bg-white outline-none transition-colors"
            autoComplete="off"
            required
          />
          {!selectedCourse && courseTitle.trim() && (
            <p className="text-base font-semibold text-amber-700">
              Custom course name — uses the standard description template.
            </p>
          )}
          {selectedCourse && (
            <p className="text-base font-semibold text-emerald-700">
              Description uses this course&apos;s catalog summary when available.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] disabled:opacity-60 text-white font-bold text-base cursor-pointer border-none"
          >
            <FiDownload className="h-5 w-5" />
            {generating ? 'Generating PDF...' : 'Download Certificate PDF'}
          </button>
          <Link
            href="/admin/certificates"
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
