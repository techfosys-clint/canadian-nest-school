import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { Enrollment } from '@/lib/db/models/Enrollment'
import '@/lib/db/models/Student'
import '@/lib/db/models/User'
import '@/lib/db/models/Category'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import CoursePlayerClient from '@/components/CoursePlayerClient'

type Props = {
  params: Promise<{ slug: string }>
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

export default async function CourseWatchPage({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()

  // Fetch course
  const course = await Course.findOne({ slug, status: 'published' })
    .populate('category')
    .populate('instructor')
    .lean() as any

  if (!course) notFound()

  // ─── Session and Enrollment Check ───
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const payloadToken = cookieStore.get('payload-token')?.value

  let userId: string | null = null
  if (studentToken) {
    const decoded = verifyToken(studentToken)
    if (decoded && decoded.id) userId = decoded.id
  }
  if (!userId && payloadToken) {
    const decoded = verifyToken(payloadToken)
    if (decoded && decoded.id) userId = decoded.id
  }

  // If not logged in, redirect to login page
  if (!userId) {
    redirect(`/login?redirectTo=/courses/${slug}/watch`)
  }

  // Check enrollment
  const existingEnrollment = await Enrollment.findOne({
    student: userId,
    course: course._id,
    paymentStatus: 'completed'
  }).lean()

  // If not enrolled, redirect back to landing page
  if (!existingEnrollment) {
    redirect(`/courses/${slug}`)
  }

  // Fetch all lessons belonging to the course
  const lessonsDocs = await Lesson.find({ course: course._id }).sort({ order: 1 }).lean()

  // Load student details for DRM watermark overlays
  let studentDoc: any = null
  if (userId) {
    const { Student } = await import('@/lib/db/models/Student')
    studentDoc = await Student.findById(userId).lean()
    if (!studentDoc) {
      const { User } = await import('@/lib/db/models/User')
      studentDoc = await User.findById(userId).lean()
    }
  }

  // Watermark data — mask sensitive info for privacy
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@')
    return `${local.charAt(0)}***@${domain}`
  }

  const serializedStudent = studentDoc ? {
    name: studentDoc.name || 'Student',
    email: maskEmail(studentDoc.email || 'student@example.com'),
  } : undefined

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

  const serializedLessons = (lessonsDocs as any[]).map((l: any) => ({
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
      course={serializedCourse} 
      lessons={serializedLessons} 
      student={serializedStudent}
    />
  )
}
