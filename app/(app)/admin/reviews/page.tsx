import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Review } from '@/lib/db/models/Review'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import ReviewsModerationClient from './ReviewsModerationClient'
import {
  computeJointPackStatus,
  getCourseInstructorIds,
} from '@/lib/reviews/reviewPack'
import '@/lib/db/models/Student'

export const metadata = {
  title: 'Reviews Moderation - Canadian Nest School Admin',
  description: 'Approve or reject student course and teacher review packs.',
}

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const courseReviews = await Review.find()
    .populate({ path: 'course', select: 'title slug instructor instructors' })
    .populate({ path: 'student', select: 'name email' })
    .sort({ createdAt: -1 })
    .lean()

  const pairFilters = courseReviews
    .map((r: any) => ({
      student: r.student?._id?.toString() || r.student?.toString(),
      course: r.course?._id?.toString() || r.course?.toString(),
    }))
    .filter((p) => p.student && p.course)

  const instructorReviews =
    pairFilters.length === 0
      ? []
      : await InstructorReview.find({ $or: pairFilters })
          .populate({ path: 'instructor', select: 'name designation' })
          .lean()

  // Also load instructor counts for courses that weren't fully populated
  const courseIdsNeedingInstructors = courseReviews
    .map((r: any) => r.course?._id?.toString())
    .filter(Boolean) as string[]

  const coursesLean = await Course.find({ _id: { $in: courseIdsNeedingInstructors } })
    .select('instructor instructors')
    .lean()
  const courseInstructorIds = new Map<string, string[]>()
  for (const c of coursesLean as any[]) {
    courseInstructorIds.set(c._id.toString(), getCourseInstructorIds(c))
  }

  const teacherMap = new Map<string, any[]>()
  for (const ir of instructorReviews as any[]) {
    const key = `${ir.student.toString()}:${ir.course.toString()}`
    const list = teacherMap.get(key) || []
    list.push({
      id: ir._id.toString(),
      instructorId: ir.instructor?._id?.toString() || ir.instructor?.toString() || '',
      instructor: ir.instructor?._id?.toString() || ir.instructor?.toString() || '',
      teacherName: ir.instructor?.name || 'Instructor',
      rating: Number(ir.rating) || 0,
      comment: ir.comment,
      status: ir.status,
    })
    teacherMap.set(key, list)
  }

  const packs = courseReviews.map((r: any) => {
    const studentId = r.student?._id?.toString() || ''
    const courseId = r.course?._id?.toString() || ''
    const teacherReviews = teacherMap.get(`${studentId}:${courseId}`) || []
    const expectedInstructorIds = courseInstructorIds.get(courseId) || []

    const jointStatus = computeJointPackStatus({
      courseStatus: r.status,
      teacherReviews,
      expectedInstructorIds,
    })

    const teachersIncomplete =
      expectedInstructorIds.length > 0 &&
      (teacherReviews.length < expectedInstructorIds.length ||
        expectedInstructorIds.some(
          (id) => !teacherReviews.some((t: any) => t.instructorId === id),
        ))

    return {
      id: r._id.toString(),
      jointStatus,
      expectedInstructorCount: expectedInstructorIds.length,
      teachersIncomplete,
      courseReview: {
        _id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        course: r.course
          ? { title: r.course.title, slug: r.course.slug }
          : undefined,
        student: r.student
          ? { name: r.student.name, email: r.student.email }
          : undefined,
      },
      teacherReviews,
    }
  })

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <ReviewsModerationClient initialPacks={JSON.parse(JSON.stringify(packs))} />
    </div>
  )
}
