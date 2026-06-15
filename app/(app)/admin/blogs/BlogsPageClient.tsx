'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiFileText, 
  FiSearch, 
  FiCalendar, 
  FiTag,
  FiLayout,
  FiTrendingUp,
  FiAward
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface BlogItem {
  id: string
  title: string
  content: string
  authorName: string
  coverImageUrl?: string
  publishedDate?: string
  tags?: Array<{ tag: string }>
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  } catch (e) {
    return html.replace(/<[^>]*>/g, '')
  }
}

export default function BlogsPageClient({ initialBlogs }: { initialBlogs: BlogItem[] }) {
  const router = useRouter()
  const [blogs, setBlogs] = useState<BlogItem[]>(initialBlogs)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // 1. Calculate dashboard KPIs
  const stats = useMemo(() => {
    const total = blogs.length
    
    // Extract unique tags
    const allTags = new Set<string>()
    blogs.forEach(b => {
      (b.tags || []).forEach(t => allTags.add(t.tag))
    })
    
    // Latest published blog title
    const latest = blogs[0]?.title || 'No posts published'
    
    return {
      total,
      uniqueTagsCount: allTags.size,
      latestPostTitle: latest
    }
  }, [blogs])

  // Extract all tag labels for navigation filter pills
  const tagList = useMemo(() => {
    const tagsMap: Record<string, number> = {}
    blogs.forEach(b => {
      (b.tags || []).forEach(t => {
        tagsMap[t.tag] = (tagsMap[t.tag] || 0) + 1
      })
    })
    
    return Object.entries(tagsMap)
      .sort((a, b) => b[1] - a[1]) // sort by frequency
      .slice(0, 10)
      .map(entry => entry[0])
  }, [blogs])

  // 2. Filter blogs based on search text and selected tag
  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      const plainContent = stripHtml(blog.content)
      const matchesSearch = 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plainContent.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesTag = 
        !selectedTag || 
        (blog.tags || []).some(t => t.tag === selectedTag)
        
      return matchesSearch && matchesTag
    })
  }, [blogs, searchQuery, selectedTag])

  async function handleDelete(blog: BlogItem) {
    const result = await Swal.fire({
      title: 'Delete Article?',
      text: `Are you sure you want to permanently delete "${blog.title}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#27272a',
      background: '#121829',
      color: '#1a1a1a',
    })
    
    if (!result.isConfirmed) return
    
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: blog.id })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setBlogs(prev => prev.filter(b => b.id !== blog.id))
      
      Swal.fire({
        icon: 'success',
        title: 'Article Deleted',
        timer: 1300,
        showConfirmButton: false,
        background: '#121829',
        color: '#1a1a1a',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Delete',
        text: err.message,
        background: '#121829',
        color: '#1a1a1a',
      })
    }
  }

  return (
    <div className="px-6 py-8 space-y-8 container mx-auto">
      
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-display">Blog Editor Dashboard</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Publish SEO-rich educational resources, tips, and platform updates.
          </p>
        </div>
        
        <button 
          onClick={() => router.push('/admin/blogs/new')}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-lg shadow-[#615fff]/15 hover:scale-[1.01] transition-all cursor-pointer shrink-0"
        >
          <FiPlus className="h-5 w-5" />
          <span>Write New Article</span>
        </button>
      </div>

      {/* ─── KPI Metrics Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Articles card */}
        <div className="bg-[#121829] border border-slate-200/60 rounded-lg p-6 flex items-center gap-5 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-[#615fff]/10 border border-[#615fff]/20 flex items-center justify-center text-[#9693ff]">
            <FiFileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Articles</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
          </div>
        </div>

        {/* Unique tags card */}
        <div className="bg-[#121829] border border-slate-200/60 rounded-lg p-6 flex items-center gap-5 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FiTag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Tags</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.uniqueTagsCount}</h3>
          </div>
        </div>

        {/* Latest Announcement card */}
        <div className="bg-[#121829] border border-slate-200/60 rounded-lg p-6 flex items-center gap-5 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <FiAward className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latest Post</p>
            <h3 className="text-base font-bold text-slate-800 mt-1 truncate leading-snug" title={stats.latestPostTitle}>
              {stats.latestPostTitle}
            </h3>
          </div>
        </div>

      </div>

      {/* ─── Filter & Search Bar Controls ─── */}
      <div className="bg-[#121829]/60 border border-slate-200/60 rounded-lg p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Search Input bar */}
        <div className="relative w-full md:max-w-md">
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search article titles or contents..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg text-base font-semibold outline-none transition-colors"
          />
          <FiSearch className="absolute left-3.5 top-3.5 text-slate-400 h-4.5 w-4.5" />
        </div>

        {/* Filter tags pills list */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3.5 py-1.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer select-none ${
              selectedTag === null 
                ? 'bg-[#615fff] text-white border-transparent' 
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          
          {tagList.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer select-none ${
                selectedTag === tag 
                  ? 'bg-[#615fff] text-white border-transparent' 
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

      </div>

      {/* ─── Premium Blog Data Table ─── */}
      {filteredBlogs.length === 0 ? (
        <div className="bg-[#121829]/60 border border-slate-200/40 rounded-lg p-16 text-center space-y-4 shadow-sm">
          <FiFileText className="h-12 w-12 text-zinc-700 mx-auto" />
          <h3 className="text-lg font-bold text-slate-600">No blog posts found</h3>
          <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedTag 
              ? 'No articles match your search criteria. Try modifying your query or clearing active filters.' 
              : 'Construct your first educational resource by clicking write article above.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#121829] border border-slate-200/60 rounded-lg overflow-hidden shadow-xl shadow-zinc-950/20">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-slate-800">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/40">
                  <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-wider">Article Title</th>
                  <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-wider">Date Published</th>
                  <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredBlogs.map(blog => {
                  const plainTextPreview = stripHtml(blog.content)
                  
                  return (
                    <tr 
                      key={blog.id} 
                      className="hover:bg-slate-100/20 transition-colors group"
                    >
                      {/* Title column with image preview */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-16 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                            {blog.coverImageUrl ? (
                              <img 
                                src={blog.coverImageUrl} 
                                alt={blog.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-[#0f1b40] to-[#070b16]">
                                <FiFileText className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 text-base truncate group-hover:text-[#b2b0ff] transition-colors" title={blog.title}>
                              {blog.title}
                            </h3>
                            <p className="text-base font-normal text-slate-500 truncate mt-0.5" title={plainTextPreview}>
                              {plainTextPreview || 'No content preview available.'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Author Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#615fff]/15 border border-[#615fff]/25 flex items-center justify-center font-bold text-base text-[#9693ff] uppercase">
                            {blog.authorName[0]}
                          </div>
                          <span className="text-base font-bold text-slate-600">{blog.authorName}</span>
                        </div>
                      </td>

                      {/* Date Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {blog.publishedDate ? (
                          <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
                            <FiCalendar className="h-4.5 w-4.5 text-slate-400" />
                            <span>
                              {new Date(blog.publishedDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-semibold text-slate-400">Not published</span>
                        )}
                      </td>

                      {/* Tags badges column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {blog.tags && blog.tags.length > 0 ? (
                            blog.tags.slice(0, 3).map((t, i) => (
                              <button
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedTag(selectedTag === t.tag ? null : t.tag)
                                }}
                                className={`px-2.5 py-0.5 border rounded-lg font-bold text-base transition-colors cursor-pointer select-none ${
                                  selectedTag === t.tag
                                    ? 'bg-[#615fff] text-white border-transparent'
                                    : 'bg-[#615fff]/10 border-[#615fff]/20 text-[#b2b0ff] hover:bg-[#615fff]/20'
                                }`}
                              >
                                #{t.tag}
                              </button>
                            ))
                          ) : (
                            <span className="text-base font-semibold text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => router.push(`/admin/blogs/${blog.id}/edit`)} 
                            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-[#615fff] border border-slate-200 text-base font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer hover:shadow-lg hover:shadow-[#615fff]/10"
                            title="Edit Article"
                          >
                            <FiEdit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(blog)} 
                            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-base font-bold text-rose-400 hover:text-rose-600 transition-all cursor-pointer hover:shadow-lg hover:shadow-rose-500/10"
                            title="Delete Article"
                          >
                            <FiTrash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
