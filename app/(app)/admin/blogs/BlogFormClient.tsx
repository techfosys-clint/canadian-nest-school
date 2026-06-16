'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiSave, FiUploadCloud, FiImage, FiX, FiInfo } from 'react-icons/fi'
import Swal from 'sweetalert2'
import RichTextEditor from '@/components/RichTextEditor'
import MediaPickerModal from '@/components/MediaPickerModal'
import type { MediaItem } from '@/components/MediaPickerModal'

interface BlogFormClientProps {
  initialBlog?: {
    id: string
    title: string
    content: string
    coverImageUrl?: string
    tags?: Array<{ tag: string }>
    seo?: {
      metaTitle?: string
      metaDescription?: string
      keywords?: string
    }
  }
}

export default function BlogFormClient({ initialBlog }: BlogFormClientProps) {
  const router = useRouter()
  
  const [title, setTitle] = useState(initialBlog?.title || '')
  const [content, setContent] = useState(initialBlog?.content || '')
  const [tagsInput, setTagsInput] = useState(
    (initialBlog?.tags || []).map(t => t.tag).join(', ')
  )
  const [coverImageId, setCoverImageId] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState(initialBlog?.coverImageUrl || '')
  
  // SEO fields
  const [metaTitle, setMetaTitle] = useState(initialBlog?.seo?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(initialBlog?.seo?.metaDescription || '')
  const [keywords, setKeywords] = useState(initialBlog?.seo?.keywords || '')
  
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    
    const form = new FormData()
    form.append('file', file)
    form.append('alt', title ? `Cover for ${title}` : 'Blog Cover')
    
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCoverImageId(data.media.id)
      setCoverImageUrl(data.media.url)
      
      Swal.fire({
        icon: 'success',
        title: 'Cover Image Uploaded',
        timer: 1300,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setUploading(false)
    }
  }

  function handleMediaPickerSelect(item: MediaItem) {
    setCoverImageId(item.id)
    setCoverImageUrl(item.url)
    setShowMediaPicker(false)
  }

  async function handleSave() {
    if (!title) {
      Swal.fire({ icon: 'warning', title: 'Blog Title Required', background: '#ffffff', color: '#1a1a1a' })
      return
    }
    if (!content || content.trim() === '<p></p>' || content.trim() === '') {
      Swal.fire({ icon: 'warning', title: 'Blog Content Required', background: '#ffffff', color: '#1a1a1a' })
      return
    }
    
    setSaving(true)
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => ({ tag: t }))
      
    try {
      const method = initialBlog?.id ? 'PUT' : 'POST'
      const body: any = {
        title,
        content,
        tags,
        coverImage: coverImageId || undefined,
        publishedDate: new Date().toISOString(),
        seo: {
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          keywords: keywords || undefined
        }
      }
      
      if (initialBlog?.id) {
        body.id = initialBlog.id
      }
      
      const res = await fetch('/api/admin/blogs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await Swal.fire({
        icon: 'success',
        title: initialBlog?.id ? 'Blog Post Updated' : 'Blog Post Published',
        text: initialBlog?.id ? 'The changes have been saved.' : 'The article is now live on the platform.',
        timer: 1800,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })
      
      router.push('/admin/blogs')
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Save',
        text: err.message,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/admin/blogs')}
              className="h-10 w-10 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-display">
              {initialBlog ? 'Edit Blog Post' : 'Compose Blog Article'}
            </h1>
          </div>
          <p className="text-base font-semibold text-slate-500 pl-13">
            Construct SEO-rich blog articles and product announcements for Tutor Space.
          </p>
        </div>
        
        <button 
          type="button"
          onClick={handleSave} 
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-lg shadow-[#615fff]/15 cursor-pointer disabled:opacity-50 shrink-0 transition-all"
        >
          <FiSave className="h-5 w-5" />
          <span>{saving ? 'Saving...' : initialBlog ? 'Save Changes' : 'Publish Article'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main compose column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Article Info Section */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Article Title <span className="text-red-400">*</span></label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Write a captivating, keyword-rich title..."
                className="bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none transition-colors" 
              />
            </div>
            
            <RichTextEditor
              label="Article Content"
              required
              rows={14}
              value={content}
              onChange={setContent}
              placeholder="Start writing the blog post body here..."
            />
          </div>

        </div>

        {/* Sidebar settings column */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cover image card */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/50">Cover Image</h3>
            
            {coverImageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => { setCoverImageId(''); setCoverImageUrl('') }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-slate-500 hover:text-slate-800 transition-all cursor-pointer border border-white/5"
                  >
                    <FiX className="h-4.5 w-4.5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-300 text-slate-600 font-bold text-sm cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <FiUploadCloud className="h-4.5 w-4.5" />
                    <span>Upload</span>
                  </label>
                  
                  <button 
                    type="button" 
                    onClick={() => setShowMediaPicker(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#615fff]/15 hover:bg-[#615fff]/25 border border-[#615fff]/20 text-[#9693ff] font-bold text-sm cursor-pointer transition-colors"
                  >
                    <FiImage className="h-4.5 w-4.5" />
                    <span>Library</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className={`flex flex-col items-center justify-center aspect-[16/9] w-full bg-slate-100 border-2 border-dashed border-slate-200 hover:border-[#615fff]/50 rounded-lg cursor-pointer transition-colors p-4 text-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <FiUploadCloud className="h-8 w-8 text-slate-400 mb-2 animate-bounce" />
                  <span className="text-base font-semibold text-slate-500">{uploading ? 'Uploading Cover...' : 'Upload cover photo'}</span>
                  <span className="text-xs font-semibold text-slate-400 mt-1">PNG, JPG or WEBP up to 5MB</span>
                </label>
                
                <button 
                  type="button" 
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#615fff]/10 hover:bg-[#615fff]/20 border border-[#615fff]/20 text-[#9693ff] font-bold text-base transition-colors cursor-pointer"
                >
                  <FiImage className="h-4.5 w-4.5" />
                  <span>Choose from Media</span>
                </button>
              </div>
            )}
          </div>

          {/* Tags settings card */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200/50">Metadata & Tags</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Article Tags</label>
              <input 
                type="text" 
                value={tagsInput} 
                onChange={e => setTagsInput(e.target.value)}
                placeholder="e.g. Next.js, Design Patterns, Careers"
                className="bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none transition-colors" 
              />
              <p className="text-xs font-semibold text-slate-400 leading-normal">
                Separate multiple article tags using comma characters. Tag labels are parsed automatically.
              </p>
            </div>
          </div>

          {/* SEO Metadata Card (Moved to the Right Sidebar) */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
              <FiInfo className="text-[#615fff] h-5 w-5" />
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">Search Engine Optimization (SEO)</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">SEO Meta Title</label>
              <input 
                type="text" 
                value={metaTitle} 
                onChange={e => setMetaTitle(e.target.value)}
                placeholder="Alternative SEO title..."
                className="bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none transition-colors" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">SEO Meta Description</label>
              <textarea 
                rows={3}
                value={metaDescription} 
                onChange={e => setMetaDescription(e.target.value)}
                placeholder="Write a summary under 160 characters..."
                className="bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none resize-none transition-colors" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">SEO Keywords</label>
              <input 
                type="text" 
                value={keywords} 
                onChange={e => setKeywords(e.target.value)}
                placeholder="e.g. coaching, tutor tips"
                className="bg-slate-100 border border-slate-200 focus:border-[#615fff]/60 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none transition-colors" 
              />
            </div>
          </div>

        </div>
      </div>

      {/* Media Library Picker Modal */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaPickerSelect}
        title="Select Cover Image"
      />

    </div>
  )
}
