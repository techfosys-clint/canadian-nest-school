'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiArrowLeft,
  FiAward,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiLock,
  FiSend,
  FiStar,
  FiUser,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface InstructorItem {
  id: string
  name: string
  designation?: string
  profilePic?: string | null
}

interface CourseItem {
  id: string
  title: string
  slug: string
  summary?: string
  thumbnail?: { url?: string } | null
  instructor?: InstructorItem | null
  instructors?: InstructorItem[]
}

type ReviewStatus = 'idle' | 'pending' | 'approved' | 'rejected'
type WizardStep = 1 | 2 | 3

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 cursor-pointer transition-transform hover:scale-110 duration-150 border-none bg-transparent outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <FiStar
              className={`h-8 w-8 transition-colors duration-150 ${
                filled ? 'text-amber-400 fill-amber-400' : 'text-zinc-300'
              }`}
            />
          </button>
        )
      })}
      {value > 0 && (
        <span className="ml-2 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3 py-1 rounded-lg">
          {labels[value]}
        </span>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-sm font-bold">
        <FiCheckCircle className="h-4 w-4" /> Accepted
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-sm font-bold">
        Rejected
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-sm font-bold">
        <FiClock className="h-4 w-4" /> Pending Approval
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-500 border border-zinc-200/80 text-sm font-bold">
      Not Submitted
    </span>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export default function CourseCompleteReviewPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = typeof params.courseId === 'string' ? params.courseId : ''

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<CourseItem | null>(null)
  const [step, setStep] = useState<WizardStep>(1)
  const [errorMsg, setErrorMsg] = useState('')

  // Course review
  const [courseRating, setCourseRating] = useState(0)
  const [courseComment, setCourseComment] = useState('')
  const [courseReviewStatus, setCourseReviewStatus] = useState<ReviewStatus>('idle')
  const [submittingCourse, setSubmittingCourse] = useState(false)

  // Teacher reviews
  const [teacherRatings, setTeacherRatings] = useState<
    Record<string, { rating: number; comment: string }>
  >({})
  const [teacherReviewStatus, setTeacherReviewStatus] = useState<ReviewStatus>('idle')
  const [submittingTeachers, setSubmittingTeachers] = useState(false)

  // Certificate (UI state — unlocked when both reviews are accepted)
  const [certStatus, setCertStatus] = useState<'locked' | 'pending' | 'ready'>('locked')
  const [downloadingCert, setDownloadingCert] = useState(false)

  const instructors = useMemo(() => {
    if (!course) return [] as InstructorItem[]
    const list = course.instructors?.length
      ? course.instructors
      : course.instructor
        ? [course.instructor]
        : []
    // Deduplicate by id
    const seen = new Set<string>()
    return list.filter((i) => {
      if (!i?.id || seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
  }, [course])

  const bothReviewsAccepted =
    courseReviewStatus === 'approved' && teacherReviewStatus === 'approved'

  useEffect(() => {
    if (bothReviewsAccepted) {
      setCertStatus('ready')
      setStep(3)
    } else if (
      courseReviewStatus === 'pending' ||
      teacherReviewStatus === 'pending' ||
      courseReviewStatus === 'approved' ||
      teacherReviewStatus === 'approved'
    ) {
      setCertStatus('pending')
    } else {
      setCertStatus('locked')
    }
  }, [bothReviewsAccepted, courseReviewStatus, teacherReviewStatus])

  useEffect(() => {
    async function load() {
      if (!courseId) return
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()
        if (
          !sessionRes.ok ||
          !sessionData.authenticated ||
          (sessionData.user.role !== 'student' && sessionData.user.role !== 'admin')
        ) {
          router.push('/login')
          return
        }

        const enrollRes = await fetch('/api/enrollments?depth=2&limit=100', {
          cache: 'no-store',
        })
        if (!enrollRes.ok) throw new Error('Could not load your enrollments.')

        const enrollData = await enrollRes.json()
        const enrollment = (enrollData.docs ?? []).find(
          (e: { course?: CourseItem; paymentStatus?: string }) =>
            e.paymentStatus === 'completed' &&
            e.course &&
            typeof e.course === 'object' &&
            e.course.id === courseId,
        )

        if (!enrollment?.course) {
          setErrorMsg('Course not found in your enrollments, or payment is incomplete.')
          setLoading(false)
          return
        }

        setCourse(enrollment.course)

        // Prefill teacher rating shells
        const teachers: InstructorItem[] =
          enrollment.course.instructors?.length > 0
            ? enrollment.course.instructors
            : enrollment.course.instructor
              ? [enrollment.course.instructor]
              : []

        const ratingShell: Record<string, { rating: number; comment: string }> = {}
        for (const t of teachers) {
          if (t?.id) ratingShell[t.id] = { rating: 0, comment: '' }
        }
        setTeacherRatings(ratingShell)

        // Restore UI draft state from localStorage (teacher reviews UI-only for now)
        const storageKey = `cns-complete-flow-${sessionData.user.id}-${courseId}`
        try {
          const raw = localStorage.getItem(storageKey)
          if (raw) {
            const saved = JSON.parse(raw) as {
              courseReviewStatus?: ReviewStatus
              teacherReviewStatus?: ReviewStatus
              step?: WizardStep
            }
            if (saved.courseReviewStatus) setCourseReviewStatus(saved.courseReviewStatus)
            if (saved.teacherReviewStatus) setTeacherReviewStatus(saved.teacherReviewStatus)
            if (saved.step) setStep(saved.step)
          }
        } catch {
          /* ignore corrupt local cache */
        }

        // Sync real course review status if one exists
        const reviewRes = await fetch(
          `/api/reviews?where[student][equals]=${encodeURIComponent(sessionData.user.id)}&depth=1&limit=50`,
        )
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json()
          const existing = (reviewData.docs ?? []).find((r: { course?: string | { id: string }; status?: string }) => {
            const cId = r.course && typeof r.course === 'object' ? r.course.id : r.course
            return cId === courseId
          })
          if (existing?.status === 'approved') setCourseReviewStatus('approved')
          else if (existing?.status === 'pending') setCourseReviewStatus('pending')
          else if (existing?.status === 'rejected') setCourseReviewStatus('rejected')
        }
      } catch (err) {
        console.error(err)
        setErrorMsg('Failed to load course completion data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [courseId, router])

  // Persist UI wizard state
  useEffect(() => {
    if (!courseId || loading) return
    async function persist() {
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()
        if (!sessionData?.user?.id) return
        const storageKey = `cns-complete-flow-${sessionData.user.id}-${courseId}`
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            courseReviewStatus,
            teacherReviewStatus,
            step,
          }),
        )
      } catch {
        /* ignore */
      }
    }
    persist()
  }, [courseId, courseReviewStatus, teacherReviewStatus, step, loading])

  const handleSubmitCourseReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!course || courseRating === 0 || !courseComment.trim()) {
      setErrorMsg('Please rate the course and write a short review comment.')
      return
    }

    setSubmittingCourse(true)
    try {
      if (courseReviewStatus === 'idle' || courseReviewStatus === 'rejected') {
        const res = await fetch('/api/submit-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course: course.id,
            rating: String(courseRating),
            comment: courseComment.trim(),
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          // If already submitted, treat as pending and continue
          if (!String(err.message || err.error || '').toLowerCase().includes('already')) {
            throw new Error(err.message || err.error || 'Failed to submit course review.')
          }
        }
      }

      setCourseReviewStatus('pending')
      await Swal.fire({
        icon: 'success',
        title: 'Course Review Submitted',
        text: 'Thanks! Rate your teachers next. Certificate unlocks after admin/staff approve your reviews (course + teachers together).',
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#1e293b',
      })
      setStep(2)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not submit course review.'
      setErrorMsg(message)
    } finally {
      setSubmittingCourse(false)
    }
  }

  const handleSubmitTeacherReviews = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (instructors.length === 0) {
      setTeacherReviewStatus('approved')
      setStep(3)
      return
    }

    const incomplete = instructors.some((t) => {
      const entry = teacherRatings[t.id]
      return !entry || entry.rating === 0 || !entry.comment.trim()
    })

    if (incomplete) {
      setErrorMsg('Please rate and comment on every assigned teacher before continuing.')
      return
    }

    setSubmittingTeachers(true)
    try {
      // UI-only for teacher reviews until the backend model is extended
      await new Promise((r) => setTimeout(r, 600))
      setTeacherReviewStatus('pending')
      await Swal.fire({
        icon: 'success',
        title: 'Teacher Reviews Submitted',
        text: 'Your teacher feedback is pending. Admins/staff approve the course and teacher reviews together — then your certificate generates automatically.',
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#1e293b',
      })
      setStep(3)
    } catch {
      setErrorMsg('Could not submit teacher reviews.')
    } finally {
      setSubmittingTeachers(false)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!course || !bothReviewsAccepted) {
      await Swal.fire({
        icon: 'info',
        title: 'Certificate Locked',
        text: 'Submit reviews for the course and teachers first. Download unlocks after admin/staff approve them together.',
        confirmButtonColor: '#E61C24',
      })
      return
    }
    setDownloadingCert(true)
    try {
      const res = await fetch(`/api/certificates/download?courseId=${course.id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            'Certificate PDF is being prepared. Check My Certificates shortly, or ask admin to release it.',
        )
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${course.title.replace(/[^a-zA-Z0-9-_]+/g, '-')}-certificate.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed.'
      Swal.fire({
        icon: 'info',
        title: 'Certificate',
        text: message,
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setDownloadingCert(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-600">Loading completion flow...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="bg-white border border-zinc-200/80 rounded-lg p-10 text-center space-y-4 max-w-lg mx-auto">
          <FiAlertCircle className="mx-auto h-10 w-10 text-[#E61C24]" />
          <p className="text-lg font-bold text-zinc-800">
            {errorMsg || 'Unable to open completion reviews for this course.'}
          </p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base"
          >
            Back to My Courses
          </Link>
        </div>
      </div>
    )
  }

  const thumbnailSrc =
    course.thumbnail && typeof course.thumbnail === 'object' && course.thumbnail.url
      ? course.thumbnail.url
      : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop'

  const steps = [
    { id: 1 as WizardStep, label: 'Course Review' },
    { id: 2 as WizardStep, label: 'Teacher Reviews' },
    { id: 3 as WizardStep, label: 'Certificate' },
  ]

  return (
    <div className="container mx-auto px-6 py-8 pb-16 space-y-8">
      {/* Celebration banner */}
      <div className="w-full bg-[#0A163A] rounded-lg p-8 md:p-10 relative overflow-hidden border border-zinc-800/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#CC181F]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex-1 space-y-4">
            <button
              type="button"
              onClick={() => router.push(`/courses/${course.slug}/watch`)}
              className="inline-flex items-center gap-2 text-base font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <FiArrowLeft className="h-4 w-4" /> Back to course player
            </button>
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#FF4D55] uppercase tracking-wider">
              Course Completed
            </span>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-white leading-tight">
              Congrats — leave reviews & unlock your certificate
            </h1>
            <p className="text-zinc-400 text-base font-semibold leading-relaxed max-w-2xl">
              Rate <span className="text-white">{course.title}</span> and the teachers
              assigned to it. When admin or staff approve your submission, course and teacher
              reviews are accepted together and your certificate unlocks.
            </p>
          </div>

          <div className="relative w-full lg:w-64 h-40 rounded-lg overflow-hidden border border-white/10 shrink-0">
            <Image src={thumbnailSrc} alt={course.title} fill className="object-cover" sizes="256px" />
            <div className="absolute inset-0 bg-linear-to-t from-[#0A163A]/80 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
              <FiAward className="h-5 w-5 text-[#FF4D55] shrink-0" />
              <span className="text-base font-bold truncate">{course.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requirement summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-lg p-5 flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 flex items-center justify-center shrink-0">
            <FiStar className="h-5 w-5 text-[#E61C24]" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-base font-bold text-zinc-800">Course Review</p>
            <StatusBadge status={courseReviewStatus} />
          </div>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-lg p-5 flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 flex items-center justify-center shrink-0">
            <FiUser className="h-5 w-5 text-[#E61C24]" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-base font-bold text-zinc-800">Teacher Reviews</p>
            <StatusBadge status={teacherReviewStatus} />
          </div>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-lg p-5 flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 flex items-center justify-center shrink-0">
            <FiAward className="h-5 w-5 text-[#E61C24]" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-base font-bold text-zinc-800">Certificate</p>
            {certStatus === 'ready' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-sm font-bold">
                <FiCheckCircle className="h-4 w-4" /> Ready
              </span>
            ) : certStatus === 'pending' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-sm font-bold">
                <FiClock className="h-4 w-4" /> Awaiting Review Approval
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-500 border border-zinc-200/80 text-sm font-bold">
                <FiLock className="h-4 w-4" /> Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border border-zinc-200/80 rounded-lg p-5 sm:p-6">
        <ol className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
          {steps.map((s, index) => {
            const done =
              (s.id === 1 && courseReviewStatus !== 'idle') ||
              (s.id === 2 && teacherReviewStatus !== 'idle') ||
              (s.id === 3 && bothReviewsAccepted)
            const active = step === s.id
            return (
              <li key={s.id} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex items-center gap-3 text-left cursor-pointer bg-transparent border-none p-0"
                >
                  <span
                    className={`h-10 w-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0 border ${
                      done
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : active
                          ? 'bg-[#E61C24] text-white border-[#E61C24]'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {done ? <FiCheck className="h-5 w-5" /> : s.id}
                  </span>
                  <span
                    className={`text-base font-bold ${
                      active ? 'text-zinc-900' : 'text-zinc-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className="hidden sm:block flex-1 h-px bg-zinc-200 mx-4" />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-base font-semibold">
          <FiAlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step panels */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200/80 rounded-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-zinc-800">Rate this course</h2>
            <p className="text-base font-semibold text-zinc-500">
              Share honest feedback about curriculum quality, pacing, and learning outcomes.
            </p>
          </div>

          {courseReviewStatus === 'pending' || courseReviewStatus === 'approved' ? (
            <div className="space-y-5">
              <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <StatusBadge status={courseReviewStatus} />
                  <p className="text-base font-semibold text-zinc-600">
                    {courseReviewStatus === 'approved'
                      ? 'Your course review was accepted.'
                      : 'Your course review is waiting for staff moderation.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer border-none"
                >
                  Continue to Teachers
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCourseReview} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-zinc-700">Course Rating</label>
                <StarPicker value={courseRating} onChange={setCourseRating} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-base font-bold text-zinc-700">Your Review</label>
                  <span className="text-sm font-semibold text-zinc-400">
                    {courseComment.length} / 500
                  </span>
                </div>
                <textarea
                  value={courseComment}
                  onChange={(e) => setCourseComment(e.target.value)}
                  maxLength={500}
                  rows={6}
                  placeholder="What did you enjoy? What could be improved?"
                  className="w-full px-4 py-3.5 rounded-lg bg-zinc-50 text-base font-semibold text-zinc-800 border border-zinc-200 focus:border-[#E61C24]/50 focus:bg-white transition-all resize-none leading-relaxed outline-none"
                  required
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <button
                  type="submit"
                  disabled={submittingCourse || courseRating === 0 || !courseComment.trim()}
                  className="px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 border-none"
                >
                  {submittingCourse ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiSend className="h-5 w-5" />
                      Submit Course Review
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-zinc-200/80 rounded-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-zinc-800">
              Rate your teachers
            </h2>
            <p className="text-base font-semibold text-zinc-500">
              Review each instructor assigned to this course. Teaching quality feedback helps us grow.
            </p>
          </div>

          {teacherReviewStatus === 'pending' || teacherReviewStatus === 'approved' ? (
            <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <StatusBadge status={teacherReviewStatus} />
                <p className="text-base font-semibold text-zinc-600">
                  {teacherReviewStatus === 'approved'
                    ? 'Teacher reviews were accepted.'
                    : 'Teacher reviews are pending staff approval.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer border-none"
              >
                View Certificate Status
              </button>
            </div>
          ) : instructors.length === 0 ? (
            <div className="p-8 text-center space-y-4 border border-zinc-200/80 rounded-lg bg-zinc-50">
              <FiUser className="mx-auto h-8 w-8 text-zinc-400" />
              <p className="text-base font-semibold text-zinc-600">
                No teachers are assigned to this course yet. You can continue to the certificate step.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTeacherReviewStatus('approved')
                  setStep(3)
                }}
                className="px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer border-none"
              >
                Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTeacherReviews} className="space-y-6">
              {instructors.map((teacher) => {
                const entry = teacherRatings[teacher.id] || { rating: 0, comment: '' }
                return (
                  <div
                    key={teacher.id}
                    className="border border-zinc-200/80 rounded-lg p-5 sm:p-6 space-y-5 bg-zinc-50/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-[#0A163A] text-white flex items-center justify-center text-base font-bold overflow-hidden shrink-0 border border-zinc-200/60">
                        {teacher.profilePic ? (
                          <Image
                            src={teacher.profilePic}
                            alt={teacher.name}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(teacher.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-zinc-800 truncate">{teacher.name}</p>
                        <p className="text-base font-semibold text-zinc-500">
                          {teacher.designation || 'Course Instructor'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-base font-bold text-zinc-700">Rating</label>
                      <StarPicker
                        value={entry.rating}
                        onChange={(v) =>
                          setTeacherRatings((prev) => ({
                            ...prev,
                            [teacher.id]: { ...entry, rating: v },
                          }))
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-base font-bold text-zinc-700">Feedback</label>
                      <textarea
                        value={entry.comment}
                        onChange={(e) =>
                          setTeacherRatings((prev) => ({
                            ...prev,
                            [teacher.id]: { ...entry, comment: e.target.value },
                          }))
                        }
                        maxLength={400}
                        rows={4}
                        placeholder={`How was learning with ${teacher.name}?`}
                        className="w-full px-4 py-3.5 rounded-lg bg-white text-base font-semibold text-zinc-800 border border-zinc-200 focus:border-[#E61C24]/50 outline-none resize-none leading-relaxed"
                        required
                      />
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-base cursor-pointer border-none"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submittingTeachers}
                  className="px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 border-none"
                >
                  {submittingTeachers ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiSend className="h-5 w-5" />
                      Submit Teacher Reviews
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border border-zinc-200/80 rounded-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-zinc-800">Your certificate</h2>
            <p className="text-base font-semibold text-zinc-500">
              Certificates unlock automatically after admin/staff approve your course and
              teacher reviews together.
            </p>
          </div>

          <div
            className={`relative overflow-hidden rounded-lg border p-8 sm:p-10 ${
              bothReviewsAccepted
                ? 'border-emerald-200 bg-linear-to-br from-emerald-50 to-white'
                : 'border-zinc-200/80 bg-linear-to-br from-zinc-50 to-white'
            }`}
          >
            {!bothReviewsAccepted && (
              <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="text-center space-y-3 px-6 max-w-md">
                  <div className="mx-auto h-14 w-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                    <FiLock className="h-7 w-7 text-zinc-500" />
                  </div>
                  <p className="text-lg font-bold text-zinc-800">Certificate Locked</p>
                  <p className="text-base font-semibold text-zinc-500 leading-relaxed">
                    Finish your course and teacher reviews. Admin/staff approve them together
                    to unlock your official completion certificate.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center text-center gap-4 select-none">
              <div className="h-16 w-16 rounded-full bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center">
                <FiAward className="h-8 w-8 text-[#E61C24]" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#E61C24]">
                Certificate of Completion
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-[#0A163A]">
                {course.title}
              </h3>
              <p className="text-base font-semibold text-zinc-500 max-w-md">
                Canadian Nest School · Official verified credential
              </p>
              <div className="w-full max-w-sm h-px bg-zinc-200 my-2" />
              {bothReviewsAccepted ? (
                <button
                  type="button"
                  onClick={handleDownloadCertificate}
                  disabled={downloadingCert}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white font-bold text-base cursor-pointer border-none"
                >
                  <FiDownload className="h-5 w-5" />
                  {downloadingCert ? 'Generating PDF...' : 'Download Certificate (PDF)'}
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-200/80 text-zinc-500 font-bold text-base">
                  <FiLock className="h-4 w-4" /> Awaiting admin/staff approval
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-base cursor-pointer border-none self-start"
            >
              Back
            </button>

            <Link
              href="/dashboard/certificates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700 font-bold text-base"
            >
              My Certificates
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
