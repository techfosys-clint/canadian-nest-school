import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Category } from '@/lib/db/models/Category'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CourseFormClient from '../../CourseFormClient'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  // 1. Session verification
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'instructor'].includes(sessionUser.role)) redirect('/login')

  // 2. Fetch the course to edit
  const course = await Course.findById(id)
    .populate('category')
    .populate('instructor')
    .populate('thumbnail')
    .lean()

  if (!course) notFound()

  // Instructors can only edit their own courses
  if (
    sessionUser.role === 'instructor' &&
    (course as any).instructor?._id?.toString() !== sessionUser._id.toString()
  ) {
    redirect('/admin/courses')
  }

  // 3. Fetch dependencies
  const [categoriesDocs, instructorsDocs] = await Promise.all([
    Category.find().lean(),
    User.find({ role: 'instructor' }).lean(),
  ])

  const categories = categoriesDocs.map((cat: any) => ({
    id: cat._id.toString(),
    name: cat.name,
  }))

  const instructors = instructorsDocs.map((ins: any) => ({
    id: ins._id.toString(),
    name: ins.name,
    email: ins.email,
  }))

  const serializedUser = {
    id: sessionUser._id.toString(),
    role: sessionUser.role as 'admin' | 'staff' | 'instructor',
  }

  // 4. Serialize course data to plain objects
  const initialData = JSON.parse(JSON.stringify(course))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CourseFormClient
        initialData={initialData}
        categories={categories}
        instructors={instructors}
        user={serializedUser}
      />
    </div>
  )
}
