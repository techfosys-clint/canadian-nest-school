import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FiPlus, FiBookOpen } from 'react-icons/fi'
import CoursesGridClient from './CoursesGridClient'

export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  await connectToDatabase()

  // 1. Double check RBAC access on server level
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id || !['admin', 'instructor'].includes(decoded.role)) {
    redirect('/login')
  }

  // 2. Fetch courses with Mongoose populates
  const coursesDocs = await Course.find()
    .populate('category')
    .populate('instructor')
    .populate('thumbnail')
    .sort({ createdAt: -1 })
    .lean()

  // 3. Serialize Documents to clean plain JSON objects
  const serializedCourses = coursesDocs.map((c: any) => {
    let thumbnailUrl = null
    if (c.thumbnail && typeof c.thumbnail === 'object') {
      thumbnailUrl = c.thumbnail.url || null
    }

    return {
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      price: c.price,
      status: c.status,
      level: c.level,
      duration: c.duration || 'N/A',
      categoryName: c.category && typeof c.category === 'object' ? c.category.name : 'Unassigned',
      instructorName: c.instructor && typeof c.instructor === 'object' ? c.instructor.name : 'Unknown',
      thumbnail: thumbnailUrl,
      createdAt: c.createdAt ? c.createdAt.toISOString() : null,
    }
  })

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <FiBookOpen className="text-[#E61C24] h-6 w-6" />
            Courses Management
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Configure curriculum catalogs, pricing schemas, and student visibility toggles.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 cursor-pointer"
        >
          <FiPlus className="h-5 w-5" />
          Create Course
        </Link>
      </div>

      {/* Render the Client-Side Interactive Data Grid Component */}
      <CoursesGridClient initialCourses={serializedCourses} userRole={decoded.role} />

    </div>
  )
}
