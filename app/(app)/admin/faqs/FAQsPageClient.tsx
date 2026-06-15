'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FiPlus, FiEdit, FiTrash2, FiHelpCircle, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface FAQItem {
  id: string
  question: string
  answer: string
  order: number
  isActive: boolean
}

export default function FAQsPageClient({ initialFaqs }: { initialFaqs: FAQItem[] }) {
  const [faqs, setFaqs] = useState<FAQItem[]>(initialFaqs)

  async function handleDelete(f: FAQItem) {
    const result = await Swal.fire({
      title: 'Delete this FAQ?',
      text: `"${f.question}" will be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      background: '#121829',
      color: '#fff',
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: f.id }),
      })
      if (res.ok) {
        setFaqs((prev) => prev.filter((item) => item.id !== f.id))
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'FAQ successfully deleted.',
          timer: 1200,
          showConfirmButton: false,
          background: '#121829',
          color: '#fff',
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete FAQ.',
        background: '#121829',
        color: '#fff',
      })
    }
  }

  async function toggleActive(f: FAQItem) {
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: f.id, isActive: !f.isActive }),
      })
      if (res.ok) {
        setFaqs((prev) =>
          prev.map((item) => (item.id === f.id ? { ...item, isActive: !item.isActive } : item))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">FAQs Management</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Manage frequently asked questions shown on the landing page
          </p>
        </div>
        <Link
          href="/admin/faqs/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-md shadow-[#615fff]/20 transition-all cursor-pointer"
        >
          <FiPlus className="h-5 w-5" /> New FAQ
        </Link>
      </div>

      {/* FAQs List */}
      <div className="space-y-3">
        {faqs.length === 0 ? (
          <div className="bg-[#121829] border border-slate-200 rounded-lg p-16 text-center space-y-4">
            <FiHelpCircle className="h-10 w-10 text-zinc-700 mx-auto" />
            <p className="text-base font-semibold text-slate-400">No FAQs created yet.</p>
          </div>
        ) : (
          faqs
            .sort((a, b) => a.order - b.order)
            .map((f) => (
              <div
                key={f.id}
                className={`bg-[#121829] border rounded-lg p-5 space-y-3 transition-colors ${
                  f.isActive ? 'border-slate-200' : 'border-slate-200/40 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="h-7 w-7 rounded bg-[#615fff]/15 border border-[#615fff]/20 flex items-center justify-center font-bold text-[#615fff] text-sm shrink-0 mt-0.5">
                      {f.order}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-base leading-snug">{f.question}</p>
                      <p className="text-base font-semibold text-slate-500 mt-2 leading-relaxed">
                        {f.answer}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(f)}
                      title={f.isActive ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded border transition-all cursor-pointer ${
                        f.isActive
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-800'
                          : 'text-slate-400 bg-slate-100/50 border-slate-300 hover:bg-zinc-700 hover:text-slate-800'
                      }`}
                    >
                      {f.isActive ? (
                        <FiToggleRight className="h-4.5 w-4.5" />
                      ) : (
                        <FiToggleLeft className="h-4.5 w-4.5" />
                      )}
                    </button>
                    <Link
                      href={`/admin/faqs/${f.id}/edit`}
                      className="p-2 rounded bg-[#615fff]/10 hover:bg-[#615fff] border border-[#615fff]/20 hover:border-[#615fff] text-[#615fff] hover:text-slate-800 transition-all cursor-pointer"
                    >
                      <FiEdit className="h-4.5 w-4.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(f)}
                      className="p-2 rounded bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <FiTrash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
