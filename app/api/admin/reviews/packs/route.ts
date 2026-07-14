import { NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import { Review } from '@/lib/db/models/Review'
import { revalidatePath } from 'next/cache'
import { moderateReviewPack } from '@/lib/reviews/reviewPack'
import '@/lib/db/models/Student'
import '@/lib/db/models/User'

export const dynamic = 'force-dynamic'

/** Admin/staff: list course reviews packed with teacher reviews */
export async function GET() {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff'], 'reviews')
    if (!user) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const courseReviews = await Review.find()
      .populate({ path: 'course', select: 'title slug' })
      .populate({ path: 'student', select: 'name email' })
      .sort({ createdAt: -1 })
      .lean()

    const studentCoursePairs = courseReviews.map((r: any) => ({
      studentId: r.student?._id?.toString() || r.student?.toString(),
      courseId: r.course?._id?.toString() || r.course?.toString(),
      reviewId: r._id.toString(),
    }))

    const pairFilters = studentCoursePairs
      .filter((p) => p.studentId && p.courseId)
      .map((p) => ({ student: p.studentId, course: p.courseId }))

    const instructorReviews =
      pairFilters.length === 0
        ? []
        : await InstructorReview.find({ $or: pairFilters })
            .populate({ path: 'instructor', select: 'name designation' })
            .lean()

    const teacherMap = new Map<string, any[]>()
    for (const ir of instructorReviews as any[]) {
      const key = `${ir.student.toString()}:${ir.course.toString()}`
      const list = teacherMap.get(key) || []
      list.push({
        id: ir._id.toString(),
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

      const teacherStatuses = teacherReviews.map((t) => t.status as string)
      let jointStatus: 'pending' | 'approved' | 'rejected' = r.status
      if (r.status === 'rejected' || teacherStatuses.includes('rejected')) {
        jointStatus = 'rejected'
      } else if (
        r.status === 'approved' &&
        (teacherReviews.length === 0 ||
          teacherStatuses.every((s) => s === 'approved'))
      ) {
        jointStatus = 'approved'
      } else {
        jointStatus = 'pending'
      }

      return {
        id: r._id.toString(),
        jointStatus,
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

    return NextResponse.json({ success: true, packs })
  } catch (error: any) {
    console.error('GET /api/admin/reviews/packs error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load review packs.' },
      { status: 500 },
    )
  }
}

/** Admin/staff: approve/reject course + teacher reviews together */
export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff'], 'reviews')
    if (!user) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions.' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { reviewId, status } = body

    if (!reviewId || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters provided.' }, { status: 400 })
    }

    const { courseId } = await moderateReviewPack(reviewId, status)

    const course = await Course.findById(courseId).lean()
    const slug = (course as any)?.slug

    if (slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during pack moderation:', cacheError)
      }
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'approved'
          ? 'Course and teacher reviews approved together. Certificate unlocked for the student.'
          : `Review pack updated to ${status}.`,
      review: { id: reviewId, status },
    })
  } catch (error: any) {
    console.error('POST /api/admin/reviews/packs error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to moderate review pack.' },
      { status: 500 },
    )
  }
}
