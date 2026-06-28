'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiPlus, FiTrash2, FiUploadCloud, FiCheck, FiX, FiInfo, FiImage, FiVideo, FiRadio, FiEdit2, FiHelpCircle } from 'react-icons/fi'
import Swal from 'sweetalert2'
import RichTextEditor from '@/components/RichTextEditor'
import MediaPickerModal from '@/components/MediaPickerModal'
import type { MediaItem } from '@/components/MediaPickerModal'

interface CategoryOption {
  id: string
  name: string
}

interface InstructorOption {
  id: string
  name: string
  email: string
}

interface CourseFormProps {
  initialData?: any
  categories: CategoryOption[]
  instructors: InstructorOption[]
  user: {
    id: string
    role: 'admin' | 'staff' | 'instructor'
  }
}

export default function CourseFormClient({
  initialData,
  categories: categoriesOptions,
  instructors: instructorsOptions,
  user,
}: CourseFormProps) {
  const router = useRouter()
  const isEditMode = !!initialData

  // State parameters matching course schema
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [summary, setSummary] = useState(initialData?.summary || '')
  const [description, setDescription] = useState(
    typeof initialData?.description === 'string'
      ? initialData.description
      : typeof initialData?.description === 'object' && initialData?.description !== null
      ? JSON.stringify(initialData.description) // legacy fallback
      : ''
  )
  const [price, setPrice] = useState<number | ''>(initialData?.price ?? '')
  const [duration, setDuration] = useState(initialData?.duration || '')
  const [level, setLevel] = useState<string>(initialData?.level || 'all')
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories?.map((c: any) => c._id || c) || (initialData?.category ? [initialData.category._id || initialData.category] : [])
  )
  const [instructors, setInstructors] = useState<string[]>(
    initialData?.instructors?.map((i: any) => i._id || i) || (initialData?.instructor ? [initialData.instructor._id || initialData.instructor] : (user.role === 'instructor' ? [user.id] : []))
  )
  const [status, setStatus] = useState<string>(initialData?.status || 'draft')

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState('')

  const handleAddCategory = () => {
    if (selectedCategory && !categories.includes(selectedCategory)) {
      setCategories([...categories, selectedCategory])
    }
    setSelectedCategory('')
  }
  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(c => c !== id))
  }

  const handleAddInstructor = () => {
    if (selectedInstructor && !instructors.includes(selectedInstructor)) {
      setInstructors([...instructors, selectedInstructor])
    }
    setSelectedInstructor('')
  }
  const handleRemoveInstructor = (id: string) => {
    setInstructors(instructors.filter(i => i !== id))
  }

  // Thumbnail state (either Mongoose ID or populated Media doc)
  const [thumbnailId, setThumbnailId] = useState<string>(
    initialData?.thumbnail?._id || initialData?.thumbnail || ''
  )
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(
    initialData?.thumbnail?.url || ''
  )
  const [thumbnailAlt, setThumbnailAlt] = useState<string>(
    initialData?.thumbnail?.alt || ''
  )
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const thumbnailFileRef = useRef<HTMLInputElement>(null)

  // Outcomes & Prerequisites Lists
  const [whatYouWillLearn, setWhatYouWillLearn] = useState<Array<{ outcome: string }>>(
    initialData?.whatYouWillLearn || []
  )
  const [requirements, setRequirements] = useState<Array<{ requirement: string }>>(
    initialData?.requirements || []
  )
  const [modules, setModules] = useState<string[]>(initialData?.modules || [])
  const [newModuleName, setNewModuleName] = useState('')

  const handleAddModule = () => {
    const trimmed = newModuleName.trim()
    if (!trimmed) return
    if (modules.includes(trimmed)) {
      Swal.fire({
        icon: 'warning',
        title: 'Duplicate Module',
        text: 'This module name already exists.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }
    setModules([...modules, trimmed])
    setNewModuleName('')
  }

  const handleRemoveModule = (indexToRemove: number) => {
    setModules(modules.filter((_, idx) => idx !== indexToRemove))
  }

  const [studyMaterials, setStudyMaterials] = useState<Array<{ title: string; url: string; materialType: 'pdf' | 'epub' | 'link' | 'other'; coverImage?: string }>>(
    initialData?.studyMaterials || []
  )
  const [uploadingStates, setUploadingStates] = useState<Record<number, boolean>>({})
  const [uploadingCoverStates, setUploadingCoverStates] = useState<Record<number, boolean>>({})

  // SEO accordion
  const [metaTitle, setMetaTitle] = useState(initialData?.seo?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(initialData?.seo?.metaDescription || '')
  const [keywords, setKeywords] = useState(initialData?.seo?.keywords || '')
  const [seoOpen, setSeoOpen] = useState(false)



  // Curriculum lessons (edit mode only)
  interface LessonSummary { id: string; title: string; order: number; lessonType: 'recorded' | 'live' | 'quiz'; duration: number }
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)

  useEffect(() => {
    if (!isEditMode || !initialData?._id) return
    setLessonsLoading(true)
    fetch(`/api/admin/lessons?courseId=${initialData._id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.lessons) {
          setLessons(data.data.lessons.map((l: any) => ({
            id: l._id,
            title: l.title,
            order: l.order,
            lessonType: l.lessonType,
            duration: l.duration,
          })).sort((a: LessonSummary, b: LessonSummary) => a.order - b.order))
        }
      })
      .catch(console.error)
      .finally(() => setLessonsLoading(false))
  }, [isEditMode, initialData?._id])

  // Slug states
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic host detection state
  const [domainOrigin, setDomainOrigin] = useState('tutorspace.com')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomainOrigin(window.location.host)
    }
  }, [])

  // Automatic title-to-slug generator
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start
      .replace(/-+$/, '') // Trim - from end
  }

  // Handle title change and generate slug in creation mode
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (!isEditMode) {
      setSlug(slugify(val))
    }
  }

  // Asynchronous Slug Check
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle')
      return
    }

    const delayDebounce = setTimeout(async () => {
      setSlugChecking(true)
      try {
        const url = `/api/admin/courses/check-slug?slug=${slug}${
          isEditMode ? `&excludeId=${initialData._id}` : ''
        }`
        const res = await fetch(url)
        const data = await res.json()

        if (data.available) {
          setSlugStatus('valid')
        } else {
          setSlugStatus('invalid')
        }
      } catch (err) {
        console.error('Slug validation failed:', err)
      } finally {
        setSlugChecking(false)
      }
    }, 500) // Debounce

    return () => clearTimeout(delayDebounce)
  }, [slug, isEditMode, initialData])

  // Dynamic Lists handlers
  const handleAddOutcome = () => {
    setWhatYouWillLearn([...whatYouWillLearn, { outcome: '' }])
  }

  const handleOutcomeChange = (index: number, val: string) => {
    const updated = [...whatYouWillLearn]
    updated[index].outcome = val
    setWhatYouWillLearn(updated)
  }

  const handleRemoveOutcome = (index: number) => {
    setWhatYouWillLearn(whatYouWillLearn.filter((_, i) => i !== index))
  }

  const handleAddRequirement = () => {
    setRequirements([...requirements, { requirement: '' }])
  }

  const handleRequirementChange = (index: number, val: string) => {
    const updated = [...requirements]
    updated[index].requirement = val
    setRequirements(updated)
  }

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const handleAddStudyMaterial = () => {
    setStudyMaterials([...studyMaterials, { title: '', url: '', materialType: 'pdf', coverImage: '' }])
  }

  const handleStudyMaterialChange = (index: number, field: 'title' | 'url' | 'materialType', val: string) => {
    const updated = [...studyMaterials]
    updated[index] = { ...updated[index], [field]: val }
    setStudyMaterials(updated)
  }

  const handleRemoveStudyMaterial = (index: number) => {
    setStudyMaterials(studyMaterials.filter((_, i) => i !== index))
  }

  const handleStudyMaterialCoverUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCoverStates(prev => ({ ...prev, [index]: true }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', `Cover for ${studyMaterials[index]?.title || 'Study Material'}`)

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload cover image.')
      }

      const updated = [...studyMaterials]
      updated[index] = { ...updated[index], coverImage: data.media.url }
      setStudyMaterials(updated)

      Swal.fire({
        icon: 'success',
        title: 'Cover Uploaded',
        text: 'Cover image saved successfully.',
        timer: 1200,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Could not upload cover image.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setUploadingCoverStates(prev => ({ ...prev, [index]: false }))
      e.target.value = ''
    }
  }

  const handleStudyMaterialUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingStates(prev => ({ ...prev, [index]: true }))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/study-materials/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document.')
      }

      // Automatically fill the URL and detect type
      const updated = [...studyMaterials]
      updated[index].url = data.url
      
      // Auto-detect type based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') {
        updated[index].materialType = 'pdf'
      } else if (ext === 'epub') {
        updated[index].materialType = 'epub'
      } else {
        updated[index].materialType = 'other'
      }
      
      // Set title if it is currently empty
      if (!updated[index].title) {
        updated[index].title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      }

      setStudyMaterials(updated)
      Swal.fire({
        icon: 'success',
        title: 'File Uploaded',
        text: `${file.name} uploaded successfully.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Could not upload file.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setUploadingStates(prev => ({ ...prev, [index]: false }))
      e.target.value = ''
    }
  }

  // Direct file upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', title ? `Cover for ${title}` : '')

    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload image.')
      setThumbnailId(data.media.id)
      setThumbnailUrl(data.media.url)
      setThumbnailAlt(data.media.alt)
      Swal.fire({ icon: 'success', title: 'Image Uploaded', text: 'Cover photo processed.', timer: 1500, showConfirmButton: false, background: '#ffffff', color: '#1a1a1a' })
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message || 'Could not upload media.', background: '#ffffff', color: '#1a1a1a' })
    } finally {
      setUploadingImage(false)
      if (thumbnailFileRef.current) thumbnailFileRef.current.value = ''
    }
  }

  // Pick from media library
  function handleMediaPickerSelect(item: MediaItem) {
    setThumbnailId(item.id)
    setThumbnailUrl(item.url)
    setThumbnailAlt(item.alt)
  }

  // Form Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !slug) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please complete required fields (Title, Slug).',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }

    if (slugStatus === 'invalid') {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Slug',
        text: 'This course URL slug is already taken. Please provide a unique one.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }

    setIsSubmitting(true)

    const payload = {
      title,
      slug,
      summary,
      description,
      price: Number(price),
      thumbnail: thumbnailId || null,
      categories,
      instructors: user.role === 'instructor' ? [user.id] : instructors,
      status,
      duration,
      level,
      whatYouWillLearn: whatYouWillLearn.filter((item) => item.outcome.trim() !== ''),
      requirements: requirements.filter((item) => item.requirement.trim() !== ''),
      studyMaterials: studyMaterials.filter((item) => item.title.trim() !== '' && item.url.trim() !== ''),
      modules,
      seo: {
        metaTitle,
        metaDescription,
        keywords,
      },
    }

    try {
      const url = isEditMode ? `/api/admin/courses/${initialData._id}` : `/api/admin/courses`
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save course.')
      }

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Course Updated' : 'Course Created',
        text: isEditMode ? 'Syllabus parameters successfully edited.' : 'New curriculum published.',
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      router.push('/admin/courses')
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Operation Failed',
        text: err.message || 'Could not complete the write request.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Back & Heading panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/40">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">
            {isEditMode ? `Edit Course: ${initialData.title}` : 'Publish New Course'}
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Build and optimize platform syllabus programs
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/courses')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-base font-bold transition-colors cursor-pointer"
        >
          Cancel & Back
        </button>
      </div>

      {/* Grid of inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (MAIN METADATA) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main info card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Course Parameters</h2>

            {/* Title field */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Course Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Master Next.js 16 and Mongoose Database Engineering"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            {/* Slug URL selector */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">URL path suffix (Slug) *</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold select-none hidden sm:inline">{domainOrigin}/courses/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="master-nextjs-16"
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold">
                {slugChecking ? (
                  <span className="text-slate-500">Checking URL availability...</span>
                ) : slugStatus === 'valid' ? (
                  <span className="text-emerald-400 flex items-center gap-1"><FiCheck /> Unique slug registered. URL path suffix is available!</span>
                ) : slugStatus === 'invalid' ? (
                  <span className="text-rose-400 flex items-center gap-1"><FiX /> Slug is taken! This path will overwrite or conflict.</span>
                ) : null}
              </div>
            </div>

            {/* Summary field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-base font-bold text-slate-600">Short Summary (Optional)</label>
                <span className="text-sm font-semibold text-slate-450">
                  {summary.length}/160 characters
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={160}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Give a quick, captivating 1-2 sentence sell for this syllabus catalog."
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors resize-none"
              />
            </div>

            {/* Detailed Description */}
            <RichTextEditor
              label="Detailed Description (Optional)"
              rows={8}
              value={description}
              onChange={setDescription}
              placeholder="Write an absolute premium, highly structured syllabus overview detailing modules, targets, tools, and schedules..."
            />

          </div>

          {/* Outcomes list card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">What You Will Learn</h2>
              <button
                type="button"
                onClick={handleAddOutcome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer"
              >
                <FiPlus className="h-4.5 w-4.5" /> Add Outcome
              </button>
            </div>

            {whatYouWillLearn.length === 0 ? (
              <p className="text-base font-semibold text-slate-400 py-2">
                No outcomes defined yet. Define what achievements students gain.
              </p>
            ) : (
              <div className="space-y-2.5">
                {whatYouWillLearn.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      required
                      value={item.outcome}
                      onChange={(e) => handleOutcomeChange(idx, e.target.value)}
                      placeholder={`e.g. Master React 19 hooks and async Server Actions`}
                      className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(idx)}
                      className="p-3 text-slate-400 hover:text-red-400 bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requirements list card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Syllabus Requirements</h2>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer"
              >
                <FiPlus className="h-4.5 w-4.5" /> Add Requirement
              </button>
            </div>

            {requirements.length === 0 ? (
              <p className="text-base font-semibold text-slate-400 py-2">
                No prerequisites defined yet. Specify baseline developer competencies.
              </p>
            ) : (
              <div className="space-y-2.5">
                {requirements.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      required
                      value={item.requirement}
                      onChange={(e) => handleRequirementChange(idx, e.target.value)}
                      placeholder={`e.g. Fundamental knowledge of JavaScript (ES6)`}
                      className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      className="p-3 text-slate-400 hover:text-red-400 bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study Materials list card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Study Materials & eBooks</h2>
                <p className="text-sm font-semibold text-slate-500 mt-1">Upload eBooks/PDFs or add external learning links</p>
              </div>
              <button
                type="button"
                onClick={handleAddStudyMaterial}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer"
              >
                <FiPlus className="h-5 w-5" /> Add Material
              </button>
            </div>

            {studyMaterials.length === 0 ? (
              <div className="text-center py-8 bg-slate-100 rounded-lg border border-dashed border-slate-200 p-6">
                <p className="text-base font-semibold text-slate-500">
                  No study materials added yet. Click "Add Material" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {studyMaterials.map((item, idx) => (
                  <div key={idx} className="bg-slate-100 p-5 rounded-lg border border-slate-200/80 space-y-4 relative group">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-base font-bold text-[#E61C24]">Material #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudyMaterial(idx)}
                        className="text-slate-400 hover:text-red-400 p-1.5 bg-slate-100/60 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Remove material"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-bold text-slate-600">Material Title *</label>
                        <input
                          type="text"
                          required
                          value={item.title}
                          onChange={(e) => handleStudyMaterialChange(idx, 'title', e.target.value)}
                          placeholder="e.g. JavaScript Cheat Sheet"
                          className="bg-white border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                        />
                      </div>

                      {/* Material Type */}
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-bold text-slate-600">Material Type *</label>
                        <select
                          value={item.materialType}
                          onChange={(e) => handleStudyMaterialChange(idx, 'materialType', e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
                        >
                          <option value="pdf">PDF Document</option>
                          <option value="epub">eBook (ePub)</option>
                          <option value="link">External Link / Website</option>
                          <option value="other">Other Resource</option>
                        </select>
                      </div>
                    </div>

                    {/* Cover Image Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="text-base font-bold text-slate-600">Material Cover Image <span className="text-slate-400 font-semibold">(shown in student portal)</span></label>
                      <div className="flex items-center gap-4">
                        {/* Preview */}
                        <div className="h-20 w-32 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                          {uploadingCoverStates[idx] ? (
                            <div className="h-5 w-5 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                          ) : item.coverImage ? (
                            <img src={item.coverImage} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <FiImage className="h-6 w-6" />
                              <span className="text-xs font-semibold">No cover</span>
                            </div>
                          )}
                        </div>

                        {/* Upload / Remove buttons */}
                        <div className="flex flex-col gap-2">
                          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 border border-[#E61C24]/20 text-[#E61C24] font-bold text-sm cursor-pointer transition-all ${uploadingCoverStates[idx] ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleStudyMaterialCoverUpload(idx, e)}
                              className="hidden"
                            />
                            <FiUploadCloud className="h-4 w-4" />
                            {uploadingCoverStates[idx] ? 'Uploading...' : item.coverImage ? 'Change Cover' : 'Upload Cover'}
                          </label>
                          {item.coverImage && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...studyMaterials]
                                updated[idx] = { ...updated[idx], coverImage: '' }
                                setStudyMaterials(updated)
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 font-bold text-sm cursor-pointer transition-all"
                            >
                              <FiTrash2 className="h-4 w-4" /> Remove
                            </button>
                          )}
                          <p className="text-xs font-semibold text-slate-400">JPG, PNG, WEBP — 4:3 ratio recommended</p>
                        </div>
                      </div>
                    </div>

                    {/* URL & Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="text-base font-bold text-slate-600">Resource URL / Upload *</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          required
                          value={item.url}
                          onChange={(e) => handleStudyMaterialChange(idx, 'url', e.target.value)}
                          placeholder="https://example.com/material or upload below"
                          className="bg-white border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 transition-colors"
                        />
                        <div className="relative shrink-0">
                          <input
                            type="file"
                            accept=".pdf,.epub,.mobi,.zip,.doc,.docx"
                            onChange={(e) => handleStudyMaterialUpload(idx, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id={`file-upload-${idx}`}
                          />
                          <button
                            type="button"
                            className="px-4 py-3 bg-slate-100 hover:bg-zinc-700 border border-zinc-750 text-slate-700 hover:text-slate-800 rounded-lg text-base font-bold transition-colors w-full cursor-pointer flex items-center gap-2 justify-center"
                          >
                            <FiUploadCloud className="h-5 w-5" />
                            <span>Upload File</span>
                          </button>
                        </div>
                      </div>
                      {uploadingStates[idx] && (
                        <p className="text-sm font-semibold text-[#FF4D55] animate-pulse flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin inline-block" />
                          Uploading secure document to server...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Course Modules card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Course Modules</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="e.g. Module 1: Introduction to React"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddModule()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddModule}
                className="px-5 py-3 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg text-base font-bold transition-all shadow-md shadow-[#E61C24]/20 cursor-pointer border-none"
              >
                Add Module
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-400">
              Create the curriculum modules for this course first. Later, you can select these modules when assigning lessons.
            </p>

            {modules.length === 0 ? (
              <p className="text-base font-semibold text-slate-400 py-2">
                No modules defined yet. Course lessons will default to "General Module" if no modules are created.
              </p>
            ) : (
              <div className="space-y-2.5 pt-2">
                {modules.map((modName, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-100 border border-slate-200 hover:border-zinc-750 px-4 py-3 rounded-lg transition-colors">
                    <span className="text-slate-800 font-bold text-base">{modName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveModule(idx)}
                      className="p-2 text-slate-400 hover:text-red-400 bg-slate-100/60 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Remove module"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Course Curriculum (edit mode only) ────────────────────── */}
          {isEditMode && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Course Curriculum</h2>
                <Link
                  href={`/admin/lessons/new?courseId=${initialData._id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors"
                >
                  <FiPlus className="h-4 w-4" /> Add Lesson
                </Link>
              </div>

              {lessonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <FiVideo className="h-10 w-10 text-zinc-700" />
                  <p className="text-base font-semibold text-slate-400">No lessons yet. Add your first lesson to build the curriculum.</p>
                  <Link
                    href={`/admin/lessons/new?courseId=${initialData._id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg font-bold text-base transition-all"
                  >
                    <FiPlus className="h-4 w-4" /> Add First Lesson
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-300 transition-colors">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 font-bold text-sm">
                        {lesson.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-bold text-base truncate">{lesson.title}</p>
                        <p className="text-slate-400 text-sm font-semibold">{lesson.duration} min</p>
                      </div>
                       <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-bold ${
                        lesson.lessonType === 'live'
                          ? 'bg-rose-500/15 text-rose-400'
                          : lesson.lessonType === 'quiz'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lesson.lessonType === 'live' ? (
                          <FiRadio className="h-3 w-3" />
                        ) : lesson.lessonType === 'quiz' ? (
                          <FiHelpCircle className="h-3 w-3" />
                        ) : (
                          <FiVideo className="h-3 w-3" />
                        )}
                        {lesson.lessonType === 'live' ? 'Live' : lesson.lessonType === 'quiz' ? 'Quiz' : 'Video'}
                      </span>
                      <Link
                        href={`/admin/lessons/${lesson.id}/edit`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-zinc-700 text-slate-500 hover:text-slate-800 transition-all"
                        title="Edit lesson"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                  <p className="text-sm font-semibold text-slate-400 text-right pt-1">
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} — {lessons.reduce((a, l) => a + l.duration, 0)} min total
                  </p>
                </div>
              )}
            </div>
          )}



        </div>

        {/* RIGHT COLUMN (MEDIA, STATUS, PRICING, SYSTEM INSTRUCTORS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Thumbnail media box */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">Course Thumbnail Cover</h3>

            {thumbnailUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={thumbnailUrl} alt={thumbnailAlt} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setThumbnailId(''); setThumbnailUrl(''); setThumbnailAlt('') }}
                    className="absolute top-2 right-2 p-1.5 rounded bg-black/70 hover:bg-rose-500 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Remove cover"
                  >
                    <FiX className="h-4.5 w-4.5" />
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-400"><span className="font-bold text-slate-500">Alt:</span> &ldquo;{thumbnailAlt}&rdquo;</p>
                {/* Change buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => thumbnailFileRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100/50 hover:bg-slate-100 border border-slate-300 text-slate-600 font-bold text-sm cursor-pointer transition-all disabled:opacity-50"
                  >
                    <FiUploadCloud className="h-4 w-4" /> Upload New
                  </button>
                  <button type="button" onClick={() => setShowMediaPicker(true)}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[#E61C24]/15 hover:bg-[#E61C24]/25 border border-[#E61C24]/20 text-[#E61C24] font-bold text-sm cursor-pointer transition-all">
                    <FiImage className="h-4 w-4" /> From Library
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadingImage ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#E61C24]/40 rounded-lg p-8 gap-3 bg-[#E61C24]/5">
                    <div className="h-8 w-8 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                    <p className="text-base font-semibold text-slate-500">Processing with Sharp...</p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => thumbnailFileRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#E61C24]/60 rounded-lg p-6 text-center cursor-pointer transition-colors group disabled:opacity-50"
                    >
                      <FiUploadCloud className="h-9 w-9 text-slate-400 group-hover:text-[#E61C24] transition-colors mb-2" />
                      <p className="text-base font-bold text-slate-800">Upload New File</p>
                      <p className="text-sm font-semibold text-slate-400">PNG, JPEG, WEBP — Recommended size: 1280x720 (16:9 ratio)</p>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-sm font-bold text-slate-400">or</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 border border-[#E61C24]/20 hover:border-[#E61C24]/40 text-[#E61C24] font-bold text-base transition-all cursor-pointer"
                    >
                      <FiImage className="h-5 w-5" /> Pick from Media Library
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hidden file input — triggered programmatically to avoid browser tooltip */}
          <input
            ref={thumbnailFileRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Media Picker Modal */}
          <MediaPickerModal
            open={showMediaPicker}
            onClose={() => setShowMediaPicker(false)}
            onSelect={handleMediaPickerSelect}
            title="Pick Course Thumbnail"
          />



          {/* Pricing & Status controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">Finance & Status</h3>

            {/* Price field */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Price (BDT)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="4500"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            {/* Status Select */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Catalog Visibility Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
              >
                <option value="draft">Draft (Restricted to Staff/Admin)</option>
                <option value="published">Published (Render on Public Landing Page)</option>
              </select>
            </div>
          </div>

          {/* Categories & Classifications */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2.5">Academic Scope</h3>

            {/* Categories Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Course Categories</label>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 min-w-0 truncate transition-colors cursor-pointer"
                >
                  <option value="">-- Select a Category --</option>
                  {categoriesOptions.map((cat) => (
                    <option key={cat.id} value={cat.id} disabled={categories.includes(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!selectedCategory}
                  className="bg-[#E61C24] text-white px-4 rounded-lg font-bold hover:bg-[#E61C24]/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
              
              {/* Selected Categories List */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((catId) => {
                    const catName = categoriesOptions.find(c => c.id === catId)?.name || 'Unknown'
                    return (
                      <span key={catId} className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                        {catName}
                        <button type="button" onClick={() => handleRemoveCategory(catId)} className="text-slate-400 hover:text-[#E61C24] transition-colors">
                          <FiX className="h-4 w-4" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Instructors Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Lead Mentor(s) (Instructor)</label>
              {user.role === 'instructor' ? (
                <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-lg p-3 text-base font-semibold select-none flex items-center gap-2">
                  <FiInfo className="text-[#E61C24]" />
                  <span>
                    {instructorsOptions.find((ins) => ins.id === user.id)?.name || 'You (Assigned Mentor)'}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <select
                      value={selectedInstructor}
                      onChange={(e) => setSelectedInstructor(e.target.value)}
                      className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none flex-1 min-w-0 truncate transition-colors cursor-pointer"
                    >
                      <option value="">-- Select an Instructor --</option>
                      <option value={user.id} disabled={instructors.includes(user.id)}>Myself ({user.role === 'admin' ? 'Admin' : 'Staff'})</option>
                      {instructorsOptions.map((ins) => (
                        <option key={ins.id} value={ins.id} disabled={instructors.includes(ins.id)}>
                          {ins.name} ({ins.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddInstructor}
                      disabled={!selectedInstructor}
                      className="bg-[#E61C24] text-white px-4 rounded-lg font-bold hover:bg-[#E61C24]/90 disabled:opacity-50 transition-colors shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Selected Instructors List */}
                  {instructors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {instructors.map((insId) => {
                        const insData = instructorsOptions.find(i => i.id === insId)
                        const insName = insId === user.id ? `Myself (${user.role === 'admin' ? 'Admin' : 'Staff'})` : (insData?.name || 'Unknown')
                        return (
                          <span key={insId} className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                            {insName}
                            <button type="button" onClick={() => handleRemoveInstructor(insId)} className="text-slate-400 hover:text-[#E61C24] transition-colors">
                              <FiX className="h-4 w-4" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Level Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Audience Tier Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Content Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Course Duration</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 14 Hours of video lectures"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>
          </div>

          {/* SEO Accordion block */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-800 text-xl hover:bg-slate-100/10 transition-colors select-none"
            >
              <span>SEO Parameters</span>
              <span className="text-slate-400">{seoOpen ? '▲' : '▼'}</span>
            </button>

            {seoOpen && (
              <div className="p-6 border-t border-slate-100 space-y-4.5 bg-slate-50">
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">SEO Meta Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Search snippet header title"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">SEO Meta Description</label>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Search snippet summary block (160 characters max recommendation)"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. Next.js, Mongoose, MongoDB, Course"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action block */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/20 hover:shadow-[#E61C24]/30 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                isSubmitting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving course to Mongoose...</span>
                </div>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Publish Course Cover & Metadata'
              )}
            </button>
          </div>

        </div>

      </div>

    </form>
  )
}
