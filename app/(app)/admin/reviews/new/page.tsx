import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import ReviewFormClient from './ReviewFormClient'

export const metadata = {
  title: 'Add Review - Canadian Nest School Admin',
  description: 'Add a custom review testimonial from the admin panel.',
}

export default async function NewReviewPage() {
  await connectToDatabase()

  // 1. Session verification
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
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) {
    redirect('/login')
  }

  // 2. Fetch dependencies
  const [coursesDocs, studentsDocs] = await Promise.all([
    Course.find().select('title').lean(),
    Student.find({ status: 'active' }).select('name email').lean(),
  ])

  // 3. Serialize options for client component
  const courses = coursesDocs.map((c: any) => ({
    id: c._id.toString(),
    title: c.title,
  }))

  const students = studentsDocs.map((s: any) => ({
    id: s._id.toString(),
    name: s.name,
    email: s.email,
  }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <ReviewFormClient
        courses={courses}
        students={students}
      />
    </div>
  )
}
