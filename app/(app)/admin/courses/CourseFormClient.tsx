'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiPlus, FiTrash2, FiUploadCloud, FiCheck, FiX, FiInfo, FiImage, FiVideo, FiRadio, FiEdit2, FiHelpCircle, FiUsers, FiCalendar, FiSearch, FiCheckCircle, FiUser } from 'react-icons/fi'
import Swal from 'sweetalert2'
import { parseJsonResponse } from '@/lib/safeJson'
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
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(null)
  const [editingModuleName, setEditingModuleName] = useState<string>('')

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

  const handleEditModule = (indexToEdit: number) => {
    setEditingModuleIndex(indexToEdit)
    setEditingModuleName(modules[indexToEdit])
  }

  const handleSaveEditedModule = () => {
    if (editingModuleIndex === null) return
    const trimmed = editingModuleName.trim()
    if (!trimmed) {
      setEditingModuleIndex(null)
      return
    }
    if (trimmed !== modules[editingModuleIndex] && modules.includes(trimmed)) {
      Swal.fire({
        icon: 'warning',
        title: 'Duplicate Module',
        text: 'This module name already exists.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }
    const updatedModules = [...modules]
    updatedModules[editingModuleIndex] = trimmed
    setModules(updatedModules)
    setEditingModuleIndex(null)
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



  // Tracks the persisted course ID once this draft has been saved at least
  // once — starts as the real ID in edit mode, or null for a brand-new
  // course that hasn't been saved yet.
  const [savedCourseId, setSavedCourseId] = useState<string | null>(initialData?._id || null)

  // Curriculum lessons (available once the course has been saved at least once)
  interface LessonSummary { id: string; title: string; order: number; lessonType: 'recorded' | 'live' | 'quiz'; duration: number }
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)

  useEffect(() => {
    if (!savedCourseId) return
    setLessonsLoading(true)
    fetch(`/api/admin/lessons?courseId=${savedCourseId}`)
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
  }, [savedCourseId])

  // ── Batches (intake groups, available once the course has been saved) ──
  interface BatchStudent { _id: string; name: string; email: string }
  interface BatchItem {
    _id: string
    name: string
    instructor: { _id: string; name: string } | null
    startDate: string
    endDate: string
    status: 'upcoming' | 'active' | 'completed'
    students: BatchStudent[]
    maxStudents: number
    reactivateDate: string | null
    isAcceptingStudents: boolean
  }

  const [batches, setBatches] = useState<BatchItem[]>([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [courseStudents, setCourseStudents] = useState<BatchStudent[]>([])

  // Add-batch inline form
  const [showAddBatchForm, setShowAddBatchForm] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchInstructor, setNewBatchInstructor] = useState('')
  const [newBatchStart, setNewBatchStart] = useState('')
  const [newBatchEnd, setNewBatchEnd] = useState('')
  const [newBatchMax, setNewBatchMax] = useState<number | ''>(0)
  const [newBatchReactivate, setNewBatchReactivate] = useState('')

  // Inline batch detail / student manager panel
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [batchActionMsg, setBatchActionMsg] = useState('')

  const fetchBatches = React.useCallback(() => {
    if (!savedCourseId) return
    setBatchesLoading(true)
    fetch(`/api/admin/batches?course=${savedCourseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.batches) {
          setBatches(data.batches.map((b: any) => ({
            _id: b._id,
            name: b.name,
            instructor: b.instructor,
            startDate: b.startDate,
            endDate: b.endDate,
            status: b.status,
            students: b.students || [],
            maxStudents: b.maxStudents || 0,
            reactivateDate: b.reactivateDate || null,
            isAcceptingStudents: b.isAcceptingStudents,
          })))
        }
      })
      .catch(console.error)
      .finally(() => setBatchesLoading(false))
  }, [savedCourseId])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Students enrolled in this specific course (candidates for batch assignment)
  useEffect(() => {
    if (!savedCourseId) return
    fetch('/api/enrollments?depth=2')
      .then(r => r.json())
      .then(data => {
        const docs = data.docs || []
        const uniqueMap: Record<string, BatchStudent> = {}
        docs.forEach((d: any) => {
          if (d.student && typeof d.student === 'object' && d.course?.id === savedCourseId) {
            uniqueMap[d.student._id || d.student.id] = {
              _id: d.student._id || d.student.id,
              name: d.student.name,
              email: d.student.email,
            }
          }
        })
        setCourseStudents(Object.values(uniqueMap))
      })
      .catch(console.error)
  }, [savedCourseId])

  const handleAddBatch = async () => {
    if (!savedCourseId) return
    if (!newBatchName.trim() || !newBatchInstructor || !newBatchStart || !newBatchEnd) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in batch name, instructor, and dates.', background: '#ffffff', color: '#1a1a1a' })
      return
    }

    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName,
          course: savedCourseId,
          instructor: newBatchInstructor,
          startDate: newBatchStart,
          endDate: newBatchEnd,
          maxStudents: newBatchMax === '' ? 0 : Number(newBatchMax),
          reactivateDate: newBatchReactivate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create batch.')

      setNewBatchName('')
      setNewBatchInstructor('')
      setNewBatchStart('')
      setNewBatchEnd('')
      setNewBatchMax(0)
      setNewBatchReactivate('')
      setShowAddBatchForm(false)
      fetchBatches()

      Swal.fire({ icon: 'success', title: 'Batch Created', timer: 1200, showConfirmButton: false, background: '#ffffff', color: '#1a1a1a' })
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Failed to Create Batch', text: err.message, background: '#ffffff', color: '#1a1a1a' })
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this batch?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete batch.')

      setBatches(prev => prev.filter(b => b._id !== batchId))
      if (selectedBatchId === batchId) setSelectedBatchId(null)
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Failed to Delete Batch', text: err.message, background: '#ffffff', color: '#1a1a1a' })
    }
  }

  const handleUpdateBatchField = async (batchId: string, field: 'maxStudents' | 'reactivateDate' | 'status', value: any) => {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update batch.')
      fetchBatches()
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Update Failed', text: err.message, background: '#ffffff', color: '#1a1a1a' })
    }
  }

  const handleAddStudentToBatch = async (batch: BatchItem, student: BatchStudent) => {
    if (batch.students.some(s => s._id === student._id)) return

    if (!batch.isAcceptingStudents) {
      setBatchActionMsg(`This batch is full (max ${batch.maxStudents} students).`)
      setTimeout(() => setBatchActionMsg(''), 3000)
      return
    }

    const updatedIds = [...batch.students.map(s => s._id), student._id]
    try {
      const res = await fetch(`/api/admin/batches/${batch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: updatedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add student.')

      setBatchActionMsg(`Added ${student.name} to the batch.`)
      setTimeout(() => setBatchActionMsg(''), 3000)
      fetchBatches()
    } catch (err: any) {
      setBatchActionMsg(err.message || 'Failed to add student.')
      setTimeout(() => setBatchActionMsg(''), 3000)
    }
  }

  const handleRemoveStudentFromBatch = async (batch: BatchItem, studentId: string) => {
    const updatedIds = batch.students.map(s => s._id).filter(id => id !== studentId)
    try {
      const res = await fetch(`/api/admin/batches/${batch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: updatedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove student.')

      setBatchActionMsg('Student removed from batch.')
      setTimeout(() => setBatchActionMsg(''), 3000)
      fetchBatches()
    } catch (err: any) {
      setBatchActionMsg(err.message || 'Failed to remove student.')
      setTimeout(() => setBatchActionMsg(''), 3000)
    }
  }

  const selectedBatch = batches.find(b => b._id === selectedBatchId) || null
  const availableStudentsForSelectedBatch = courseStudents.filter(s =>
    (s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())) &&
    !selectedBatch?.students.some(bs => bs._id === s._id)
  )

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
      const data = await parseJsonResponse(res)

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
      const data = await parseJsonResponse(res)

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
      const data = await parseJsonResponse(res)
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

  // Builds the API payload from current form state
  const buildPayload = () => ({
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
  })

  // Creates (POST) or updates (PUT, once savedCourseId exists) the course.
  // Used by both the explicit Save button and the "save as draft before
  // adding a lesson" flow. Returns the course ID on success, or null.
  const saveCourse = async (): Promise<string | null> => {
    const url = savedCourseId ? `/api/admin/courses/${savedCourseId}` : `/api/admin/courses`
    const method = savedCourseId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save course.')
    }

    const newId: string = data.data?.course?._id || savedCourseId
    if (newId && newId !== savedCourseId) {
      setSavedCourseId(newId)
      // Switch the URL to the edit route for this now-persisted course
      // without a full page reload, so "Save" never creates a duplicate.
      router.replace(`/admin/courses/${newId}/edit`)
    }
    return newId
  }

  // Saves the course (if needed) and takes the admin to the lesson form for
  // it — lessons can only be created against a real, persisted course ID.
  const handleAddLessonClick = async () => {
    if (!title || !slug) {
      Swal.fire({
        icon: 'warning',
        title: 'Add a Title First',
        text: 'Please fill in the course title and slug before adding lessons.',
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

    if (savedCourseId) {
      router.push(`/admin/lessons/new?courseId=${savedCourseId}`)
      return
    }

    setIsSubmitting(true)
    try {
      const id = await saveCourse()
      if (id) router.push(`/admin/lessons/new?courseId=${id}`)
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Could Not Save Draft',
        text: err.message || 'Please try again.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setIsSubmitting(false)
    }
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

    try {
      await saveCourse()

      await Swal.fire({
        icon: 'success',
        title: savedCourseId ? 'Course Updated' : 'Course Created',
        text: 'Syllabus parameters saved successfully.',
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      // Stay on the page (now in edit mode for this course) instead of
      // navigating away, so the admin can keep adding lessons/materials.
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
            {savedCourseId ? `Edit Course: ${title}` : 'Publish New Course'}
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
                    {editingModuleIndex === idx ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingModuleName}
                          onChange={(e) => setEditingModuleName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSaveEditedModule()
                            } else if (e.key === 'Escape') {
                              setEditingModuleIndex(null)
                            }
                          }}
                          autoFocus
                          className="bg-white border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-2 text-base font-semibold outline-none flex-1 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleSaveEditedModule}
                          className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Save module"
                        >
                          <FiCheck className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingModuleIndex(null)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-400 bg-slate-100/60 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-800 font-bold text-base">{modName}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditModule(idx)}
                            className="p-2 text-slate-400 hover:text-blue-500 bg-slate-100/60 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit module"
                          >
                            <FiEdit2 className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(idx)}
                            className="p-2 text-slate-400 hover:text-red-400 bg-slate-100/60 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Remove module"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Course Curriculum ────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Course Curriculum</h2>
                <button
                  type="button"
                  onClick={handleAddLessonClick}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FiPlus className="h-4 w-4" /> Add Lesson
                </button>
              </div>

              {!savedCourseId ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <FiVideo className="h-10 w-10 text-zinc-700" />
                  <p className="text-base font-semibold text-slate-400">Add a title and modules above, then click "Add Lesson" — the course will be saved as a draft automatically.</p>
                </div>
              ) : lessonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <FiVideo className="h-10 w-10 text-zinc-700" />
                  <p className="text-base font-semibold text-slate-400">No lessons yet. Add your first lesson to build the curriculum.</p>
                  <button
                    type="button"
                    onClick={handleAddLessonClick}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg font-bold text-base transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FiPlus className="h-4 w-4" /> Add First Lesson
                  </button>
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
                        className="p-2 rounded-lg bg-slate-100 hover:bg-zinc-700 text-slate-500 hover:text-white transition-all"
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

          {/* ── Batches (Intake Groups) ────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Batches</h2>
                <p className="text-sm font-semibold text-slate-400 mt-1">Group enrolled students into intakes with optional seat limits.</p>
              </div>
              {savedCourseId && (
                <button
                  type="button"
                  onClick={() => setShowAddBatchForm(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#E61C24] border border-[#E61C24]/20 rounded-lg text-base font-bold transition-colors cursor-pointer"
                >
                  <FiPlus className="h-4 w-4" /> Add Batch
                </button>
              )}
            </div>

            {!savedCourseId ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <FiUsers className="h-10 w-10 text-zinc-700" />
                <p className="text-base font-semibold text-slate-400">Save the course first (or click "Add Lesson" above) to start creating batches.</p>
              </div>
            ) : (
              <>
                {/* Add Batch inline form */}
                {showAddBatchForm && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">Batch Name *</label>
                        <input
                          type="text"
                          value={newBatchName}
                          onChange={(e) => setNewBatchName(e.target.value)}
                          placeholder="e.g. Batch 1 / Jan Intake 2026"
                          className="bg-white border border-slate-200 focus:border-[#E61C24]/80 rounded-lg p-3 text-base font-semibold outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">Instructor *</label>
                        <select
                          value={newBatchInstructor}
                          onChange={(e) => setNewBatchInstructor(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold outline-none w-full cursor-pointer"
                        >
                          <option value="">-- Select Instructor --</option>
                          <option value={user.id}>Myself ({user.role})</option>
                          {instructorsOptions.map(ins => (
                            <option key={ins.id} value={ins.id}>{ins.name} ({ins.email})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">Start Date *</label>
                        <input
                          type="date"
                          value={newBatchStart}
                          onChange={(e) => setNewBatchStart(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold outline-none w-full cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">End Date *</label>
                        <input
                          type="date"
                          value={newBatchEnd}
                          onChange={(e) => setNewBatchEnd(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold outline-none w-full cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">Max Students (0 = unlimited)</label>
                        <input
                          type="number"
                          min={0}
                          value={newBatchMax}
                          onChange={(e) => setNewBatchMax(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0"
                          className="bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold outline-none w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-slate-600">Reactivate Date (Optional)</label>
                        <input
                          type="date"
                          value={newBatchReactivate}
                          onChange={(e) => setNewBatchReactivate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold outline-none w-full cursor-pointer"
                        />
                        <p className="text-xs font-semibold text-slate-400">Once the seat limit is reached, joins reopen automatically on this date.</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddBatchForm(false)}
                        className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-base font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBatch}
                        className="px-5 py-2.5 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg text-base font-bold transition-all cursor-pointer"
                      >
                        Create Batch
                      </button>
                    </div>
                  </div>
                )}

                {/* Batches list */}
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : batches.length === 0 ? (
                  <p className="text-base font-semibold text-slate-400 py-2">No batches yet. Click "Add Batch" to create your first intake group.</p>
                ) : (
                  <div className="space-y-2.5">
                    {batches.map((batch) => {
                      const isSelected = selectedBatchId === batch._id
                      return (
                        <div key={batch._id} className={`border rounded-lg transition-colors ${isSelected ? 'border-[#E61C24]/40 bg-[#E61C24]/5' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex flex-wrap items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-bold text-slate-800">{batch.name}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-500 mt-1">
                                <span className="flex items-center gap-1.5"><FiUser className="h-3.5 w-3.5" />{batch.instructor?.name || 'Unassigned'}</span>
                                <span className="flex items-center gap-1.5"><FiCalendar className="h-3.5 w-3.5" />{new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              batch.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                                : batch.status === 'completed' ? 'bg-slate-200 border border-slate-300 text-slate-500'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-600'
                            }`}>
                              {batch.status}
                            </span>

                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                              batch.isAcceptingStudents ? 'bg-slate-100 text-slate-600' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}>
                              <FiUsers className="h-4 w-4" />
                              {batch.students.length}{batch.maxStudents > 0 ? `/${batch.maxStudents}` : ''}
                              {!batch.isAcceptingStudents && ' (Full)'}
                            </span>

                            <button
                              type="button"
                              onClick={() => { setSelectedBatchId(isSelected ? null : batch._id); setStudentSearchQuery('') }}
                              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800 text-sm font-bold transition-colors cursor-pointer"
                            >
                              {isSelected ? 'Close' : 'Manage'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(batch._id)}
                              className="p-2 rounded-lg border border-red-500/15 hover:border-red-500 bg-white text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete batch"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Inline manage panel */}
                          {isSelected && (
                            <div className="border-t border-slate-200 p-5 space-y-5">
                              {batchActionMsg && (
                                <div className="p-3 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] font-semibold text-sm">
                                  {batchActionMsg}
                                </div>
                              )}

                              {/* Capacity & status controls */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-bold text-slate-600">Max Students (0 = unlimited)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    defaultValue={batch.maxStudents}
                                    onBlur={(e) => handleUpdateBatchField(batch._id, 'maxStudents', Number(e.target.value) || 0)}
                                    className="bg-white border border-slate-200 rounded-lg p-2.5 text-base font-semibold outline-none w-full"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-bold text-slate-600">Reactivate Date</label>
                                  <input
                                    type="date"
                                    defaultValue={batch.reactivateDate ? batch.reactivateDate.split('T')[0] : ''}
                                    onBlur={(e) => handleUpdateBatchField(batch._id, 'reactivateDate', e.target.value || null)}
                                    className="bg-white border border-slate-200 rounded-lg p-2.5 text-base font-semibold outline-none w-full cursor-pointer"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-bold text-slate-600">Status</label>
                                  <select
                                    defaultValue={batch.status}
                                    onChange={(e) => handleUpdateBatchField(batch._id, 'status', e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg p-2.5 text-base font-semibold outline-none w-full cursor-pointer"
                                  >
                                    <option value="upcoming">Upcoming</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                {/* Current students */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <FiCheckCircle className="text-emerald-500 h-4 w-4" />
                                    Students in this batch ({batch.students.length})
                                  </h4>
                                  <div className="border border-slate-200 rounded-lg bg-white p-3 max-h-[260px] overflow-y-auto space-y-2">
                                    {batch.students.length === 0 ? (
                                      <p className="text-sm font-semibold text-slate-400 text-center py-6">No students added yet.</p>
                                    ) : (
                                      batch.students.map(s => (
                                        <div key={s._id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{s.email}</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveStudentFromBatch(batch, s._id)}
                                            className="px-3 py-1.5 rounded-lg border border-red-500/15 hover:border-red-500 bg-white text-red-500 hover:bg-red-50 text-sm font-bold transition-all cursor-pointer shrink-0"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Add students */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <FiPlus className="text-[#E61C24] h-4 w-4" />
                                    Add enrolled students
                                  </h4>
                                  <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                      type="text"
                                      value={studentSearchQuery}
                                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                                      placeholder="Search enrolled students..."
                                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-semibold outline-none"
                                    />
                                  </div>
                                  <div className="border border-slate-200 rounded-lg bg-white p-3 max-h-[220px] overflow-y-auto space-y-2">
                                    {availableStudentsForSelectedBatch.length === 0 ? (
                                      <p className="text-sm font-semibold text-slate-400 text-center py-6">No matching enrolled students.</p>
                                    ) : (
                                      availableStudentsForSelectedBatch.map(s => (
                                        <div key={s._id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{s.email}</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleAddStudentToBatch(batch, s)}
                                            disabled={!batch.isAcceptingStudents}
                                            className="px-3 py-1.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white text-sm font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  {!batch.isAcceptingStudents && (
                                    <p className="text-xs font-semibold text-rose-500">This batch is full. Set a reactivate date or raise the max students limit to allow more joins.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

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
              ) : savedCourseId ? (
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
