'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiX, FiArrowLeft } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface FAQFormProps {
  initialData?: {
    id: string
    question: string
    answer: string
    order: number
    isActive: boolean
  }
}

export default function FAQFormClient({ initialData }: FAQFormProps) {
  const router = useRouter()
  const isEditMode = !!initialData

  const [question, setQuestion] = useState(initialData?.question || '')
  const [answer, setAnswer] = useState(initialData?.answer || '')
  const [order, setOrder] = useState(initialData?.order || 0)
  const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true)
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!question.trim() || !answer.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Question and answer are required.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }

    setSaving(true)
    try {
      const method = isEditMode ? 'PUT' : 'POST'
      const body = isEditMode
        ? { id: initialData?.id, question, answer, order, isActive }
        : { question, answer, order, isActive }

      const res = await fetch('/api/admin/faqs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'FAQ Updated' : 'FAQ Created',
        text: isEditMode ? 'FAQ has been updated successfully.' : 'FAQ has been created successfully.',
        timer: 1200,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      router.push('/admin/faqs')
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to save FAQ.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Back & Heading panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/40">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">
            {isEditMode ? 'Edit FAQ' : 'New FAQ'}
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Build and organize landing page FAQ answers
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/faqs')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-base font-bold transition-colors cursor-pointer"
        >
          Cancel & Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">FAQ Content</h2>

            {/* Question */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Question *</label>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How do I access my course after purchase?"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            {/* Answer */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Answer *</label>
              <textarea
                required
                rows={6}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide a clear, helpful answer..."
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors resize-none"
              />
            </div>

            {/* Display Order */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Display Order</label>
              <input
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

          </div>
        </div>

        {/* Sidebar settings */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">Settings</h3>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isActive ? 'bg-[#E61C24]' : 'bg-slate-200'
                }`}
                onClick={() => setIsActive(!isActive)}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="text-base font-bold text-slate-600">Active on site</span>
            </label>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/20 hover:shadow-[#E61C24]/30 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                saving ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save FAQ'
              )}
            </button>
          </div>
        </div>

      </div>

    </form>
  )
}
