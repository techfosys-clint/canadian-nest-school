import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import LessonFormClient from '../../LessonFormClient'

export const metadata = {
  title: 'Edit Lesson - Canadian Nest School Admin',
  description: 'Edit a syllabus lesson.',
}

type Props = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditLessonPage({ params }: Props) {
  await connectToDatabase()
  const { id } = await params

  // Session verification
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id) {
    redirect('/login')
  }

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff', 'instructor'].includes(sessionUser.role)) {
    redirect('/login')
  }

  // Fetch lesson
  const lessonDoc = await Lesson.findById(id).lean() as any
  if (!lessonDoc) notFound()

  // Fetch all courses
  const coursesDocs = await Course.find().select('title status').lean()
  const courses = coursesDocs.map((c: any) => ({
    id: c._id.toString(),
    title: `${c.title} ${c.status === 'draft' ? '(Draft)' : ''}`,
  }))

  const serializedLesson = {
    id: lessonDoc._id.toString(),
    title: lessonDoc.title,
    slug: lessonDoc.slug,
    order: lessonDoc.order || 1,
    moduleOrder: lessonDoc.moduleOrder || undefined,
    moduleName: lessonDoc.moduleName || 'General Module',
    totalMarks: lessonDoc.totalMarks || 100,
    content: lessonDoc.content ? JSON.parse(JSON.stringify(lessonDoc.content)) : '',
    lessonType: lessonDoc.lessonType as 'recorded' | 'live' | 'quiz',
    videoUrl: lessonDoc.videoUrl || '',
    livePlatform: lessonDoc.livePlatform || 'zoom',
    liveUrl: lessonDoc.liveUrl || '',
    liveDate: lessonDoc.liveDate ? lessonDoc.liveDate.toISOString() : '',
    duration: lessonDoc.duration || 60,
    isPreviewable: lessonDoc.isPreviewable ?? false,
    courseId: lessonDoc.course ? lessonDoc.course.toString() : '',
    autoGenerateZoom: lessonDoc.autoGenerateZoom ?? false,
    quizQuestions: lessonDoc.quizQuestions ? JSON.parse(JSON.stringify(lessonDoc.quizQuestions)) : [],
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <LessonFormClient courses={courses} initialData={serializedLesson} />
    </div>
  )
}
