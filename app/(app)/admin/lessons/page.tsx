import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import LessonsPageClient from './LessonsPageClient'

export const metadata = {
  title: 'Lessons Syllabus Hub - Canadian Nest School Admin',
  description: 'Manage and organise course lessons and live sessions.',
}

export const dynamic = 'force-dynamic'

export default async function LessonsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'instructor'].includes(sessionUser.role)) redirect('/login')

  // Fetch courses this user can manage
  const courseQuery: any = sessionUser.role === 'instructor'
    ? { instructor: sessionUser._id }
    : {}

  const coursesDocs = await Course.find(courseQuery).select('title slug status').sort({ title: 1 }).lean()

  const courses = coursesDocs.map((c: any) => ({
    id: c._id.toString(),
    title: c.title,
    status: c.status,
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <LessonsPageClient courses={courses} />
    </div>
  )
}
