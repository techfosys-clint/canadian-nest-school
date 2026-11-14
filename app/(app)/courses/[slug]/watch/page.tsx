import { resolveLessonDelivery } from '@/lib/lessons/delivery'
import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { getEnrollmentPreview } from '@/lib/auth/enrollmentPreview'
import { getLearningSession } from '@/lib/auth/learningSession'
import { assertCourseContentAccess } from '@/lib/subscriptions/access'
import '@/lib/db/models/Category'
import CoursePlayerClient from '@/components/CoursePlayerClient'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string | string[]; from?: string | string[] }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()
  const course = await Course.findOne({ slug, status: 'published' }).lean()
  if (!course) return { title: 'Course Player - Canadian Nest School' }
  return {
    title: `Player: ${course.title} - Canadian Nest School`,
    description: `Watch course lectures for ${course.title}`,
  }
}

export const dynamic = 'force-dynamic'

export default async function CourseWatchPage({ params, searchParams }: Props) {
  const { slug } = await params
  await connectToDatabase()

  const { preview, from } = await searchParams
  if (preview !== undefined && (typeof preview !== 'string' || !preview)) notFound()
  const dashboardPath = from === 'courses' ? '/dashboard/courses' : '/dashboard'
  const fromDashboard = from === 'courses' || from === 'dashboard'
  const previewSession = preview ? await getEnrollmentPreview(preview) : null
  if (preview && !previewSession) notFound()

  const session = previewSession ? null : await getLearningSession()
  const account = previewSession?.admin ?? session?.account
  if (!account) {
    const returnTo = `/courses/${encodeURIComponent(slug)}/watch${fromDashboard ? `?from=${from}` : ''}`
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
  }

  const course = await Course.findOne({ slug, status: 'published' })
    .populate('category')
    .populate('instructor')
    .lean() as any
  if (!course) {
    if (fromDashboard) redirect(`${dashboardPath}?courseAccess=unavailable`)
    notFound()
  }

  let enrollment = previewSession?.enrollment
  if (previewSession) {
    if (String(enrollment?.course) !== String(course._id)) notFound()
  } else {
    const access = await assertCourseContentAccess(account.id, String(course._id))
    if (!access.allowed) {
      if (access.reason === 'SUBSCRIPTION_BLOCKED') {
        redirect(`${dashboardPath}?courseAccess=blocked`)
      }
      if (fromDashboard) {
        const reason = access.reason === 'NOT_ENROLLED' ? 'enrollment' : 'unavailable'
        redirect(`${dashboardPath}?courseAccess=${reason}`)
      }
      redirect(`/courses/${encodeURIComponent(slug)}`)
    }
    enrollment = access.enrollment
  }
  const studentBatchId = enrollment?.batch?.toString()

  // Shared lessons (no batch) + lessons for this student's batch only
  const lessonsDocs = await Lesson.find({
    course: course._id,
  })
    .sort({ order: 1 })
    .lean()

  // Watermark data — mask sensitive info for privacy
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@')
    return `${local.charAt(0)}***@${domain}`
  }

  const serializedStudent = {
    name: account.name || 'Student',
    email: maskEmail(account.email || 'student@example.com'),
  }

  // Serialize models into safe plain structures for the client component
  const serializedCourse = {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    summary: course.summary || '',
    category: course.category ? {
      name: course.category.name
    } : undefined,
    instructor: course.instructor ? {
      name: course.instructor.name || course.instructor.email
    } : undefined,
  }

  const serializedLessons = lessonsDocs
    .flatMap((lesson) => {
      const delivery = resolveLessonDelivery(lesson, studentBatchId)
      return delivery ? [delivery] : []
    })
    .sort((a, b) => a.order - b.order)
    .map((l) => ({
    id: l._id.toString(),
    title: l.title,
    slug: l.slug,
    order: l.order || 1,
    moduleOrder: l.moduleOrder || undefined,
    lessonType: l.lessonType || 'recorded',
    duration: l.duration || 10,
    isPreviewable: l.isPreviewable || false,
    livePlatform: l.livePlatform || '',
    liveDate: l.liveDate ? l.liveDate.toISOString() : undefined,
    videoUrl: l.videoUrl || '',
    liveUrl: l.liveUrl || '',
    moduleName: l.moduleName || 'General Module',
    content: l.content || undefined,
    quizQuestions: l.quizQuestions ? JSON.parse(JSON.stringify(l.quizQuestions)) : undefined,
  }))

  return (
    <CoursePlayerClient 
      key={preview ?? String(course._id)}
      course={serializedCourse} 
      lessons={serializedLessons} 
      student={serializedStudent}
      previewEnrollmentId={preview}
      initialCompletedLessonIds={previewSession ? previewSession.enrollment.completedLessons?.filter(
        (id: string) => serializedLessons.some((lesson) => lesson.id === id),
      ) : undefined}
    />
  )
}
