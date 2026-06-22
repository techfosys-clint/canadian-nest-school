import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import LessonFormClient from '../LessonFormClient'

export const metadata = {
  title: 'Add Lesson - Canadian Nest School Admin',
  description: 'Add a new syllabus lesson document.',
}

export default async function NewLessonPage() {
  await connectToDatabase()

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

  // Fetch all courses (visible/published/draft) so they can select
  const coursesDocs = await Course.find().select('title status').lean()
  const courses = coursesDocs.map((c: any) => ({
    id: c._id.toString(),
    title: `${c.title} ${c.status === 'draft' ? '(Draft)' : ''}`,
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <LessonFormClient courses={courses} />
    </div>
  )
}
