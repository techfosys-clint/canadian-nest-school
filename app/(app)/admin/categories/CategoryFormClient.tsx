'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiX, FiPlus, FiTrash2 } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CategoryFormProps {
  initialData?: {
    id: string
    name: string
    slug: string
  }
}

interface CategoryRow {
  name: string
  slug: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export default function CategoryFormClient({ initialData }: CategoryFormProps) {
  const router = useRouter()
  const isEditMode = !!initialData

  // Single category states for edit mode
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')

  // Multiple category rows state for creation mode
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([
    { name: '', slug: '' }
  ])

  const [saving, setSaving] = useState(false)

  // Edit Mode: single row generator
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    setSlug(slugify(val))
  }

  // Create Mode: multiple rows generator
  const handleRowNameChange = (index: number, val: string) => {
    const updated = [...categoryRows]
    updated[index].name = val
    updated[index].slug = slugify(val)
    setCategoryRows(updated)
  }

  const handleRowSlugChange = (index: number, val: string) => {
    const updated = [...categoryRows]
    updated[index].slug = slugify(val)
    setCategoryRows(updated)
  }

  const addCategoryRow = () => {
    setCategoryRows([...categoryRows, { name: '', slug: '' }])
  }

  const removeCategoryRow = (index: number) => {
    if (categoryRows.length === 1) return
    setCategoryRows(categoryRows.filter((_, i) => i !== index))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (isEditMode) {
      if (!name.trim() || !slug.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Category name and slug are required.',
          background: '#ffffff',
          color: '#1a1a1a',
        })
        return
      }
    } else {
      // Validate all bulk rows
      for (const row of categoryRows) {
        if (!row.name.trim() || !row.slug.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'All categories must have a name and slug.',
            background: '#ffffff',
            color: '#1a1a1a',
          })
          return
        }
      }
    }

    setSaving(true)
    try {
      const url = '/api/admin/categories'
      let method = 'POST'
      let body: any

      if (isEditMode) {
        method = 'PUT'
        body = { id: initialData?.id, name: name.trim(), slug: slug.trim() }
      } else {
        // Bulk creation payload
        body = {
          categories: categoryRows.map(row => ({
            name: row.name.trim(),
            slug: row.slug.trim()
          }))
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Category Updated' : 'Categories Created',
        text: isEditMode
          ? 'Category has been updated successfully.'
          : `${categoryRows.length} categories have been created successfully.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      router.push('/admin/categories')
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to save categories.',
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
            {isEditMode ? 'Edit Category' : 'New Categories (Bulk)'}
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            {isEditMode 
              ? 'Modify syllabus catalog category classification' 
              : 'Create and register multiple course categories simultaneously'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/categories')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-base font-bold transition-colors cursor-pointer"
        >
          Cancel & Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Category Classifications</h2>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={addCategoryRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer animate-fadeIn"
                >
                  <FiPlus className="h-4.5 w-4.5" /> Add Category Row
                </button>
              )}
            </div>

            {isEditMode ? (
              /* Single Edit Mode Form */
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={handleNameChange}
                    placeholder="e.g. Web Development"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">URL path suffix (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="e.g. web-development"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
                  />
                </div>
              </div>
            ) : (
              /* Bulk Create Mode Form */
              <div className="space-y-5">
                {categoryRows.map((row, idx) => (
                  <div key={idx} className="p-4 bg-slate-100 rounded-lg space-y-4 relative animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100/50 pb-2">
                      <span className="text-sm font-bold text-[#E61C24]">Category #{idx + 1}</span>
                      {categoryRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCategoryRow(idx)}
                          className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-100/20 transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <FiTrash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-500">Category Name *</label>
                        <input
                          type="text"
                          required
                          value={row.name}
                          onChange={(e) => handleRowNameChange(idx, e.target.value)}
                          placeholder="e.g. Graphic Design"
                          className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-slate-500">URL path suffix (Slug) *</label>
                        <input
                          type="text"
                          required
                          value={row.slug}
                          onChange={(e) => handleRowSlugChange(idx, e.target.value)}
                          placeholder="graphic-design"
                          className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Sidebar settings */}
        <div className="lg:col-span-4 space-y-6">
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
                  <span>Saving category structures...</span>
                </div>
              ) : (
                'Save Categories'
              )}
            </button>
          </div>
        </div>

      </div>

    </form>
  )
}
