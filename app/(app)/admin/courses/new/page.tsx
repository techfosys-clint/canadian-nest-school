import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Category } from '@/lib/db/models/Category'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CourseFormClient from '../CourseFormClient'

export const dynamic = 'force-dynamic'

export default async function NewCoursePage() {
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
  if (!sessionUser || !['admin', 'instructor'].includes(sessionUser.role)) {
    redirect('/login')
  }

  // 2. Fetch dependencies
  const [categoriesDocs, instructorsDocs] = await Promise.all([
    Category.find().lean(),
    User.find({ role: { $in: ['admin', 'staff', 'instructor'] } }).lean(),
  ])

  // 3. Serialize options for client components
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CourseFormClient
        categories={categories}
        instructors={instructors}
        user={serializedUser}
      />
    </div>
  )
}
