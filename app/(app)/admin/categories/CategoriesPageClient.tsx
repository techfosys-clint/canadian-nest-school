'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FiPlus, FiEdit, FiTrash2, FiBookmark } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CategoryItem {
  id: string
  name: string
  slug: string
}

export default function CategoriesPageClient({
  initialCategories,
}: {
  initialCategories: CategoryItem[]
}) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories)

  async function handleDelete(cat: CategoryItem) {
    const result = await Swal.fire({
      title: `Delete "${cat.name}"?`,
      text: 'This will delete the category. Make sure no courses are assigned to it.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#1a1a1a',
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id }),
      })
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id))
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Category successfully deleted.',
          timer: 1200,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#1a1a1a',
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete category.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">Course Categories</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Group and organise your course catalog tracks
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/20 transition-all cursor-pointer"
        >
          <FiPlus className="h-5 w-5" /> New Category
        </Link>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {categories.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <FiBookmark className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-400">
              No categories yet. Create your first category above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">URL Slug</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center shrink-0">
                          <FiBookmark className="h-4 w-4 text-[#E61C24]" />
                        </div>
                        <span className="font-bold text-slate-800 text-base">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-500 text-base font-mono">
                        {cat.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link
                          href={`/admin/categories/${cat.id}/edit`}
                          className="p-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24] border border-[#E61C24]/20 hover:border-[#E61C24] text-[#E61C24] hover:text-white transition-all cursor-pointer"
                        >
                          <FiEdit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-500 hover:text-white transition-all cursor-pointer"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
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
