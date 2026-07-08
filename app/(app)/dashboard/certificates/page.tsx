'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FiAward,
  FiClock,
  FiCheckCircle,
  FiDownload,
  FiXCircle,
  FiExternalLink,
  FiFileText,
  FiSearch,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CertificateItem {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  status: 'pending' | 'approved' | 'rejected'
  progress: number
  certificateUrl: string | null
  adminNotes: string
  createdAt: string
}

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function handleDownloadCertificate(cert: CertificateItem) {
    setDownloadingId(cert.id)
    try {
      const res = await fetch(`/api/certificates/download?courseId=${cert.courseId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to download certificate.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${cert.courseTitle.replace(/[^a-zA-Z0-9-_]+/g, '-')}-certificate.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: err.message || 'Could not generate your certificate PDF.',
        background: '#ffffff',
        color: '#1e293b',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  async function fetchCertificates() {
    setLoading(true)
    try {
      const res = await fetch('/api/certificates')
      const data = await res.json()
      if (res.ok && data.success) {
        setCertificates(data.requests || [])
      } else {
        throw new Error(data.error || 'Failed to fetch certificates registry.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Error occurred while loading certificates.',
        background: '#ffffff',
        color: '#1e293b',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCertificates()
  }, [])

  const filtered = certificates.filter((c) => {
    const title = c.courseTitle.toLowerCase()
    const query = searchQuery.toLowerCase()
    return title.includes(query)
  })

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr)
    return dateObj.toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Heading Section */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 select-none">
          <FiAward className="text-[#E61C24] h-7 w-7" /> My Verified Certificates
        </h1>
        <p className="text-base font-semibold text-zinc-500 mt-1 select-none">
          View auto-generated course completion requests and download approved PDF credentials
        </p>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm select-none">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-3.5 text-zinc-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search certificates by course title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-base font-semibold outline-none transition-colors"
          />
        </div>

        <div className="text-base font-bold text-zinc-500">
          Total Requests: {filtered.length}
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-semibold text-zinc-500 select-none">Loading credentials registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-3 max-w-md mx-auto select-none">
            <FiAward className="mx-auto h-12 w-12 text-zinc-300" />
            <p className="text-lg font-bold text-zinc-800">No certificates found</p>
            <p className="text-base font-semibold text-zinc-500 leading-relaxed">
              Complete 100% of your course syllabus lessons. The system will automatically create and submit certificate requests for you!
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg text-base font-bold transition-all shadow-md shadow-[#E61C24]/15"
              >
                Go to My Courses <FiExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-zinc-600 select-none">
                  <th className="px-6 py-4 text-base font-bold">Course Title</th>
                  <th className="px-6 py-4 text-base font-bold text-center">Syllabus Progress</th>
                  <th className="px-6 py-4 text-base font-bold text-center">Auto-Requested Date</th>
                  <th className="px-6 py-4 text-base font-bold text-center">Status</th>
                  <th className="px-6 py-4 text-base font-bold text-center">Certificate Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/45 transition-colors">
                    {/* Course Title */}
                    <td className="px-6 py-4 max-w-xs">
                      <Link
                        href={`/courses/${cert.courseSlug}`}
                        className="text-base font-bold text-[#0A163A] hover:text-[#E61C24] transition-colors leading-tight inline-block"
                      >
                        {cert.courseTitle}
                      </Link>
                    </td>

                    {/* Progress */}
                    <td className="px-6 py-4 text-center select-none">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-base font-bold text-zinc-800">{cert.progress}% Complete</span>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-lg overflow-hidden mt-1.5 border border-slate-200/40">
                          <div
                            className="bg-[#E61C24] h-full rounded-lg"
                            style={{ width: `${cert.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Auto Requested Date */}
                    <td className="px-6 py-4 text-center text-base font-bold text-zinc-500 select-none">
                      {formatDate(cert.createdAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center select-none">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold ${
                        cert.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : cert.status === 'rejected'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {cert.status === 'approved' ? (
                          <FiCheckCircle className="h-4.5 w-4.5" />
                        ) : cert.status === 'rejected' ? (
                          <FiXCircle className="h-4.5 w-4.5" />
                        ) : (
                          <FiClock className="h-4.5 w-4.5" />
                        )}
                        <span className="capitalize">{cert.status === 'approved' ? 'Released' : cert.status}</span>
                      </span>
                    </td>

                    {/* Download button */}
                    <td className="px-6 py-4 text-center">
                      {cert.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(cert)}
                          disabled={downloadingId === cert.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg text-base font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer"
                        >
                          <FiDownload className="h-4.5 w-4.5" />
                          {downloadingId === cert.id ? 'Generating...' : 'Download PDF'}
                        </button>
                      ) : cert.status === 'rejected' ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="text-base text-rose-500 font-bold">Verification Rejected</span>
                          {cert.adminNotes && (
                            <span className="text-xs text-zinc-400 font-semibold mt-0.5 truncate max-w-[180px]" title={cert.adminNotes}>
                              Notes: {cert.adminNotes}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-zinc-400 text-base font-semibold select-none">
                          <FiClock className="h-4.5 w-4.5 text-zinc-400" /> Awaiting Release
                        </div>
                      )}
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
