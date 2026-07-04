'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiSave, FiX, FiVideo, FiRadio, FiHelpCircle, FiPlus, FiTrash2, FiFileText, FiImage } from 'react-icons/fi'
import Swal from 'sweetalert2'
import VideoUploadWidget from '@/components/VideoUploadWidget'
import RichTextEditor from '@/components/RichTextEditor'
import MediaPickerModal from '@/components/MediaPickerModal'
import { toBdInputValue } from '@/lib/bdTime'

interface CourseOption {
  id: string
  title: string
}

interface QuizQuestion {
  questionText: string
  imageUrl?: string
  options: string[]
  correctAnswerIndex: number
}

interface LessonFormProps {
  courses: CourseOption[]
  initialData?: {
    id: string
    title: string
    slug: string
    order: number
    moduleName?: string
    lessonType: 'recorded' | 'live' | 'quiz' | 'assignment'
    videoUrl?: string
    livePlatform?: string
    liveUrl?: string
    liveDate?: string
    duration: number
    isPreviewable: boolean
    courseId: string
    autoGenerateZoom?: boolean
    quizQuestions?: QuizQuestion[]
    totalMarks?: number
    content?: any
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export default function LessonFormClient({ courses, initialData }: LessonFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = !!initialData

  // Determine active course
  const defaultCourseId = initialData?.courseId || searchParams.get('courseId') || ''

  // Form states
  const [courseId, setCourseId] = useState(defaultCourseId)
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [moduleName, setModuleName] = useState(initialData?.moduleName || 'General Module')
  const [order, setOrder] = useState<number | ''>(initialData?.order || '')
  const [content, setContent] = useState<string>(
    initialData?.content || ''
  )
  const [lessonType, setLessonType] = useState<'recorded' | 'live' | 'quiz' | 'assignment'>(
    initialData?.lessonType || 'recorded'
  )
  const [totalMarks, setTotalMarks] = useState<number>(initialData?.totalMarks || 100)
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '')
  const [livePlatform, setLivePlatform] = useState(initialData?.livePlatform || 'zoom')
  const [liveUrl, setLiveUrl] = useState(initialData?.liveUrl || '')
  const [liveDate, setLiveDate] = useState(
    initialData?.liveDate ? toBdInputValue(initialData.liveDate) : ''
  )
  const [duration, setDuration] = useState(initialData?.duration || 60)
  const [isPreviewable, setIsPreviewable] = useState(initialData?.isPreviewable || false)
  const [autoGenerateZoom, setAutoGenerateZoom] = useState(initialData?.autoGenerateZoom || false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    initialData?.quizQuestions || [
      { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]
  )
  const [saving, setSaving] = useState(false)
  const [existingModules, setExistingModules] = useState<string[]>([])
  const [autoOrderLoading, setAutoOrderLoading] = useState(false)
  const [showMediaPickerForQuestion, setShowMediaPickerForQuestion] = useState<number | null>(null)

  // Fetch unique module names of the selected course
  React.useEffect(() => {
    if (!courseId) {
      setExistingModules([])
      return
    }
    fetch(`/api/admin/courses/${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        const course = data.data?.course
        if (course && course.modules) {
          const courseMods = course.modules as string[]
          setExistingModules(courseMods)

          // If editing a lesson, and its current moduleName is not in the course's modules,
          // we append it so it's selectable/visible
          const initialModName = initialData?.moduleName
          if (initialModName && !courseMods.includes(initialModName)) {
            setExistingModules((prev) => [...prev, initialModName])
          } else if (!initialData && courseMods.length > 0) {
            // If creating a new lesson, default to the first module of the course
            setModuleName(courseMods[0])
          }
        } else {
          setExistingModules([])
        }
      })
      .catch((err) => console.error('Failed to load course modules:', err))
  }, [courseId, initialData])

  // Auto-calculate order number for NEW lessons when course or module changes
  React.useEffect(() => {
    if (isEditMode || !courseId) return
    setAutoOrderLoading(true)
    fetch(`/api/admin/lessons?courseId=${courseId}`)
      .then(r => r.json())
      .then(data => {
        const lessons: any[] = data.data?.lessons || []
        const inModule = lessons.filter(l => (l.moduleName || 'General Module') === (moduleName || 'General Module'))
        const maxOrder = inModule.reduce((max: number, l: any) => Math.max(max, l.order || 0), 0)
        setOrder(maxOrder + 1)
      })
      .catch(() => {})
      .finally(() => setAutoOrderLoading(false))
  }, [courseId, moduleName, isEditMode])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (!isEditMode) {
      setSlug(slugify(val))
    }
  }

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim()
    if (val.startsWith('<iframe')) {
      const match = val.match(/src="([^"]+)"/)
      if (match && match[1]) {
        setVideoUrl(match[1])
        return
      }
    }
    setVideoUrl(val)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !slug.trim() || !courseId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Course, lesson title, and slug are required.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
      return
    }

    if (lessonType === 'quiz') {
      const invalid = quizQuestions.some(q => !q.questionText.trim() || q.options.some(o => !o.trim()))
      if (invalid) {
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please fill in all quiz question texts and option answers.',
          background: '#ffffff',
          color: '#1a1a1a',
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        title,
        slug,
        course: courseId,
        order,
        moduleName,
        lessonType,
        videoUrl: lessonType === 'recorded' ? videoUrl : undefined,
        livePlatform: lessonType === 'live' ? livePlatform : undefined,
        liveUrl: lessonType === 'live' ? liveUrl : undefined,
        liveDate: lessonType === 'live' && liveDate ? liveDate : undefined,
        duration,
        isPreviewable,
        autoGenerateZoom: lessonType === 'live' && livePlatform === 'zoom' ? autoGenerateZoom : false,
        quizQuestions: lessonType === 'quiz' ? quizQuestions : undefined,
        totalMarks: (lessonType === 'quiz' || lessonType === 'assignment') ? totalMarks : undefined,
        content: content || undefined,
      }

      const url = isEditMode ? `/api/admin/lessons/${initialData?.id}` : '/api/admin/lessons'
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Lesson Updated' : 'Lesson Created',
        text: isEditMode
          ? 'Syllabus lesson has been successfully updated.'
          : 'Syllabus lesson has been successfully created.',
        timer: 1200,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      router.push(`/admin/courses/${courseId}/edit`)
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to save lesson.',
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSave} className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Back & Heading panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/40">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">
            {isEditMode ? 'Edit Lesson' : 'Add Lesson'}
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Build and sequence premium syllabus catalog programs
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(courseId ? `/admin/courses/${courseId}/edit` : '/admin/lessons')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-base font-bold transition-colors cursor-pointer"
        >
          Cancel & Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Lesson Parameters</h2>

            {/* Course Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Target Syllabus Course *</label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Lesson Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Introduction to Next.js routing structures"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            {/* Target Module Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Target Module *</label>
              <select
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
              >
                <option value="General Module">General Module</option>
                {existingModules.map((mod) => (
                  mod !== 'General Module' && (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  )
                ))}
              </select>
              <p className="text-base font-medium text-slate-400 leading-relaxed">
                Select from the curriculum modules defined for this course. (Add/edit modules in the Course parameters page).
              </p>
            </div>

            {/* Slug & Order Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-600">URL path suffix (Slug) *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="intro-to-routing"
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-slate-600">Display / Lecture Order *</label>
                  {!isEditMode && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 select-none">
                      {autoOrderLoading ? 'Calculating...' : 'Auto-set · editable'}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                />
                {!isEditMode && (
                  <p className="text-sm font-semibold text-slate-400">
                    Auto-counted from existing lessons in this module. Change if needed.
                  </p>
                )}
              </div>
            </div>

            {/* Lesson Format / Type Selector */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-base font-bold text-slate-600">Lesson Format</label>
              <div className="flex flex-wrap gap-3">
                {(['recorded', 'live', 'quiz', 'assignment'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setLessonType(type)
                      if (type === 'quiz') {
                        setDuration(15) // default duration for quiz
                      } else if (type === 'assignment') {
                        setDuration(30) // default duration for assignment
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-base border transition-all cursor-pointer ${
                      lessonType === type
                        ? 'bg-[#E61C24] border-[#E61C24] text-white shadow-md shadow-[#E61C24]/20'
                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {type === 'recorded' ? (
                      <FiVideo className="h-5 w-5" />
                    ) : type === 'live' ? (
                      <FiRadio className="h-5 w-5" />
                    ) : type === 'quiz' ? (
                      <FiHelpCircle className="h-5 w-5" />
                    ) : (
                      <FiFileText className="h-5 w-5" />
                    )}
                    {type === 'recorded'
                      ? 'Recorded Video'
                      : type === 'live'
                      ? 'Live Session'
                      : type === 'quiz'
                      ? 'Interactive Quiz'
                      : 'Assignment'}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields depending on format */}
            {lessonType === 'recorded' ? (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-base font-bold text-slate-600">📹 Upload Video to R2 (Recommended)</label>
                  <VideoUploadWidget
                    onUploadSuccess={(objectKey) => {
                      setVideoUrl(objectKey)
                      Swal.fire({
                        icon: 'success',
                        title: 'Video Key Added',
                        text: 'Video key has been automatically filled in the form below.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#ffffff',
                        color: '#1a1a1a',
                      })
                    }}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-base">
                    <span className="px-2 bg-slate-100 text-slate-500">OR</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-base font-bold text-slate-600">Or Paste Video URL</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={handleVideoUrlChange}
                    placeholder="https://www.youtube.com/embed/...  or  videos/lesson-1.mp4"
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
                  />
                  <p className="text-base font-medium text-slate-400 leading-relaxed">
                    Paste a <span className="text-slate-600 font-semibold">YouTube / Vimeo URL</span> to embed it,
                    or an <span className="text-slate-600 font-semibold">R2 object key</span> (e.g. <span className="font-mono text-[#FF4D55]">videos/lesson-1.mp4</span>).
                  </p>
                </div>
              </div>
            ) : lessonType === 'live' ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-bold text-slate-600">Live Meeting Platform</label>
                    <select
                      value={livePlatform}
                      onChange={(e) => setLivePlatform(e.target.value)}
                      className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
                    >
                      <option value="zoom">Zoom</option>
                      <option value="meet">Google Meet</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="other">Other / Custom</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-bold text-slate-600">Scheduled Time & Date (Bangladesh time)</label>
                    <input
                      type="datetime-local"
                      value={liveDate}
                      onChange={(e) => setLiveDate(e.target.value)}
                      className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                    />
                  </div>
                </div>
                {livePlatform === 'zoom' && (
                  <div className="bg-slate-100 border border-slate-200/80 rounded-lg p-4 flex flex-col gap-3 animate-fadeIn">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          autoGenerateZoom ? 'bg-[#E61C24]' : 'bg-zinc-700'
                        }`}
                        onClick={() => setAutoGenerateZoom(!autoGenerateZoom)}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            autoGenerateZoom ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-base font-bold text-slate-600">Auto-generate Zoom Meeting Link</span>
                    </label>
                    <p className="text-base font-medium text-slate-500">
                      When enabled, Canadian Nest School will automatically create a Zoom meeting using your Server-to-Server OAuth credentials.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">
                    {autoGenerateZoom ? 'Meeting Join URL (Auto-generated)' : 'Meeting Join URL'}
                  </label>
                  <input
                    type="url"
                    value={liveUrl || ''}
                    disabled={autoGenerateZoom}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder={autoGenerateZoom ? 'Will be automatically generated upon save' : 'https://zoom.us/j/...'}
                    className={`bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono ${
                      autoGenerateZoom ? 'opacity-50 cursor-not-allowed select-none' : ''
                    }`}
                  />
                </div>
              </div>
            ) : lessonType === 'assignment' ? (
              <div className="space-y-4 border border-[#E61C24]/25 rounded-lg p-6 bg-gradient-to-b from-slate-50 to-white shadow-2xl shadow-[#E61C24]/5 animate-fadeIn">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FiFileText className="text-[#E61C24] h-6 w-6" /> Assignment Configuration
                </h3>
                
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-600">Assignment Evaluation Marks *</label>
                  <input
                    type="number"
                    min={1}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors animate-fadeIn"
                  />
                </div>
                <p className="text-base font-semibold text-slate-500">
                  Students will see this assignment and submit a secure Google Drive link containing their work for grading.
                </p>
              </div>
            ) : (
              <div className="space-y-6 border border-[#E61C24]/25 rounded-lg p-6 bg-gradient-to-b from-slate-50 to-white shadow-2xl shadow-[#E61C24]/5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <FiHelpCircle className="text-[#E61C24] h-6 w-6" /> Quiz Questions Builder
                    </h3>
                    <p className="text-base font-medium text-slate-500 mt-1">
                      Configure dynamic evaluation queries with dynamic option selection
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Quiz Total Marks */}
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-lg">
                      <span className="text-base font-bold text-slate-500">Quiz Marks:</span>
                      <input
                        type="number"
                        min={1}
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                        className="bg-transparent border-none text-slate-800 w-16 text-base font-bold outline-none text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuizQuestions([...quizQuestions, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }])}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E61C24] to-[#CC181F] hover:from-[#CC181F] hover:to-[#4338ca] text-slate-800 rounded-lg text-base font-bold shadow-lg shadow-[#E61C24]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-none"
                    >
                      <FiPlus className="h-5 w-5" /> Add Question
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {quizQuestions.map((q, qIdx) => (
                    <div 
                      key={qIdx} 
                      className="bg-slate-50 backdrop-blur border border-slate-200/80 hover:border-[#E61C24]/30 p-6 rounded-lg space-y-6 transition-all duration-300 relative"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100/50">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E61C24] to-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/20 select-none">
                            {String(qIdx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <span className="text-base font-bold text-slate-800 block">Question Details</span>
                            <span className="text-base font-medium text-slate-500 block mt-0.5">Define your question and choices below</span>
                          </div>
                        </div>
                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuizQuestions(quizQuestions.filter((_, idx) => idx !== qIdx))
                            }}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center"
                            title="Delete question"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-bold text-slate-600">Question Title / Text *</label>
                        <input
                          type="text"
                          required
                          value={q.questionText}
                          onChange={(e) => {
                            const newQuestions = [...quizQuestions]
                            newQuestions[qIdx].questionText = e.target.value
                            setQuizQuestions(newQuestions)
                          }}
                          placeholder="e.g. What does CSS stand for in web development?"
                          className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none w-full transition-colors"
                        />
                      </div>
                      
                      {/* Optional Question Image */}
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-bold text-slate-600">Optional Image</label>
                        {q.imageUrl ? (
                          <div className="relative inline-block w-48 h-32 rounded-lg overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={q.imageUrl} alt="Question" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                const newQuestions = [...quizQuestions]
                                newQuestions[qIdx].imageUrl = undefined
                                setQuizQuestions(newQuestions)
                              }}
                              className="absolute top-1 right-1 bg-black/50 hover:bg-[#E61C24] text-white p-1 rounded-md transition-colors"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowMediaPickerForQuestion(qIdx)}
                            className="flex items-center justify-center gap-2 w-48 h-12 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 rounded-lg text-slate-600 font-bold transition-colors cursor-pointer"
                          >
                            <FiImage className="w-5 h-5" /> Add Image
                          </button>
                        )}
                      </div>

                      {/* Options Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                        <div>
                          <h4 className="text-base font-bold text-slate-600">Configure Options / Answers *</h4>
                          <p className="text-base font-medium text-slate-500 mt-0.5">Add up to 6 options and mark the correct one.</p>
                        </div>
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newQuestions = [...quizQuestions]
                              newQuestions[qIdx].options.push('')
                              setQuizQuestions(newQuestions)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#E61C24]/10 hover:bg-[#E61C24]/20 border border-[#E61C24]/20 hover:border-[#E61C24]/40 text-[#FF4D55] hover:text-slate-800 rounded-lg text-base font-bold transition-all cursor-pointer"
                          >
                            <FiPlus className="h-5 w-5" /> Add Choice
                          </button>
                        )}
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = q.correctAnswerIndex === optIdx
                          return (
                            <div 
                              key={optIdx} 
                              className={`p-4 bg-white border rounded-lg flex flex-col gap-3.5 transition-all duration-300 relative group/opt ${
                                isCorrect
                                  ? 'border-emerald-500/50 bg-emerald-950/10 shadow-sm shadow-emerald-500/5'
                                  : 'border-slate-200/80 hover:border-slate-300/80'
                              }`}
                            >
                              <div className="flex items-center justify-between select-none">
                                <span className={`text-base font-bold ${
                                  isCorrect ? 'text-emerald-400' : 'text-slate-500'
                                }`}>
                                  Option {String.fromCharCode(65 + optIdx)} *
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {/* Set Correct Trigger */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQuestions = [...quizQuestions]
                                      newQuestions[qIdx].correctAnswerIndex = optIdx
                                      setQuizQuestions(newQuestions)
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-bold transition-all border cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                                        : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                                    }`}
                                  >
                                    {isCorrect ? '✓ Correct' : 'Set Correct'}
                                  </button>

                                  {/* Delete Option Trigger */}
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newQuestions = [...quizQuestions]
                                        const deletedIdx = optIdx
                                        const oldCorrect = newQuestions[qIdx].correctAnswerIndex
                                        
                                        newQuestions[qIdx].options = newQuestions[qIdx].options.filter((_, idx) => idx !== optIdx)
                                        
                                        if (oldCorrect === deletedIdx) {
                                          newQuestions[qIdx].correctAnswerIndex = 0
                                        } else if (oldCorrect > deletedIdx) {
                                          newQuestions[qIdx].correctAnswerIndex = oldCorrect - 1
                                        }
                                        
                                        setQuizQuestions(newQuestions)
                                      }}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                      title="Delete choice"
                                    >
                                      <FiTrash2 className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => {
                                  const newQuestions = [...quizQuestions]
                                  newQuestions[qIdx].options[optIdx] = e.target.value
                                  setQuizQuestions(newQuestions)
                                }}
                                placeholder={`Enter Option ${String.fromCharCode(65 + optIdx)} answer`}
                                className={`bg-slate-100 border rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors ${
                                  isCorrect 
                                    ? 'border-emerald-500/30 focus:border-emerald-500 text-slate-800 focus:ring-1 focus:ring-emerald-500' 
                                    : 'border-slate-200/80 focus:border-slate-300/80 text-slate-800 focus:ring-1 focus:ring-[#E61C24]/80'
                                }`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Lecture Duration (Minutes) *</label>
              <input
                type="number"
                min={1}
                required
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            {/* Order */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Lecture Order</label>
              <input
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(e.target.value ? Number(e.target.value) : '')}
                placeholder="Auto-assigned if left blank"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
              <p className="text-xs text-slate-500 font-semibold mt-1">Leave empty to auto-assign the next logical sequence for this module.</p>
            </div>

            {/* Content / Description */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 mt-4">
              <label className="text-base font-bold text-slate-600">Lesson Notes / Description</label>
              <p className="text-sm font-medium text-slate-500 mb-2">Optional content shown beneath the lesson video or assignment.</p>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write lesson notes, attach links, or provide further instructions..."
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
                  isPreviewable ? 'bg-[#E61C24]' : 'bg-zinc-700'
                }`}
                onClick={() => setIsPreviewable(!isPreviewable)}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    isPreviewable ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="text-base font-bold text-slate-600">Free Preview Lecture</span>
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
                'Save Lesson'
              )}
            </button>
          </div>
        </div>

      </div>

    </form>

    {/* Quiz Media Picker Modal */}
    {showMediaPickerForQuestion !== null && (
      <MediaPickerModal
        open={true}
        onClose={() => setShowMediaPickerForQuestion(null)}
        onSelect={(media) => {
          const newQuestions = [...quizQuestions]
          newQuestions[showMediaPickerForQuestion].imageUrl = media.url
          setQuizQuestions(newQuestions)
          setShowMediaPickerForQuestion(null)
        }}
      />
    )}
    </>
  )
}
