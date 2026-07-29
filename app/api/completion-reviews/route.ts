import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import { Review } from '@/lib/db/models/Review'
import {
  assertStudentCanReviewCourse,
  canDownloadCertificate,
  getCourseInstructorIds,
  getStudentCourseReviewGate,
  hasSubmittedRequiredReviews,
  syncCertificateRequestWithReviewGate,
} from '@/lib/reviews/reviewPack'
import '@/lib/db/models/User'
import '@/lib/db/models/Student'
import '@/lib/db/models/Media'

export const dynamic = 'force-dynamic'

async function getStudentId(): Promise<string | null> {
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const payloadToken = cookieStore.get('payload-token')?.value
  const token = studentToken || payloadToken
  if (!token) return null
  const decoded = verifyToken(token)
  return decoded?.id || null
}

/** GET: student's review gate status for a course */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    const studentId = await getStudentId()
    if (!studentId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 })
    }

    let progress = 0
    try {
      const enrolled = await assertStudentCanReviewCourse(studentId, courseId)
      progress = enrolled.progress
    } catch {
      // Still return gate for enrolled UI; download stays locked without payment.
    }

    const gate = await getStudentCourseReviewGate(studentId, courseId)
    const instructors = await Course.findById(courseId)
      .populate({
        path: 'instructor',
        select: 'name designation profilePic',
        populate: { path: 'profilePic', select: 'url' },
      })
      .populate({
        path: 'instructors',
        select: 'name designation profilePic',
        populate: { path: 'profilePic', select: 'url' },
      })
      .lean()

    const mapInstructor = (i: any) => ({
      id: i._id.toString(),
      name: i.name,
      designation: i.designation || null,
      profilePic:
        i.profilePic && typeof i.profilePic === 'object' && i.profilePic.url
          ? i.profilePic.url
          : null,
    })

    const instructorList = (() => {
      if (!instructors) return []
      const fromArray = Array.isArray(instructors.instructors)
        ? instructors.instructors.filter((i: any) => i && typeof i === 'object')
        : []
      if (fromArray.length > 0) return fromArray.map(mapInstructor)
      if (instructors.instructor && typeof instructors.instructor === 'object') {
        return [mapInstructor(instructors.instructor)]
      }
      return []
    })()

    const reviewsOk = canDownloadCertificate(
      gate.courseReviewStatus,
      gate.teacherReviewStatus,
    )

    return NextResponse.json({
      success: true,
      progress,
      courseReviewStatus: gate.courseReviewStatus,
      teacherReviewStatus: gate.teacherReviewStatus,
      submitted: hasSubmittedRequiredReviews(
        gate.courseReviewStatus,
        gate.teacherReviewStatus,
      ),
      // Certificate still requires 100% syllabus + submitted reviews.
      canDownload: reviewsOk && progress >= 100,
      courseReview: gate.courseReview
        ? {
            id: gate.courseReview._id.toString(),
            rating: gate.courseReview.rating,
            comment: gate.courseReview.comment,
            status: gate.courseReview.status,
          }
        : null,
      instructorReviews: gate.instructorReviews.map((r: any) => ({
        id: r._id.toString(),
        instructor: r.instructor?.toString?.() || String(r.instructor),
        rating: r.rating,
        comment: r.comment,
        status: r.status,
      })),
      instructors: instructorList,
    })
  } catch (error: any) {
    console.error('GET /api/completion-reviews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load completion reviews.' },
      { status: 500 },
    )
  }
}

/** POST: submit instructor reviews for a course */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const studentId = await getStudentId()
    if (!studentId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, reviews } = body as {
      courseId?: string
      reviews?: Array<{ instructor: string; rating: string | number; comment: string }>
    }

    if (!courseId || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { error: 'courseId and reviews are required.' },
        { status: 400 },
      )
    }

    try {
      await assertStudentCanReviewCourse(studentId, courseId)
    } catch (gateErr: any) {
      return NextResponse.json(
        { error: gateErr.message || 'Not allowed to review this course.' },
        { status: gateErr.status || 403 },
      )
    }

    const courseReview = await Review.findOne({ student: studentId, course: courseId }).lean()
    if (!courseReview) {
      return NextResponse.json(
        { error: 'Submit your course review before rating teachers.' },
        { status: 400 },
      )
    }

    const course = await Course.findById(courseId).select('instructor instructors').lean()
    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
    }

    const allowedInstructorIds = new Set(getCourseInstructorIds(course))
    if (allowedInstructorIds.size === 0) {
      return NextResponse.json(
        { error: 'This course has no assigned teachers to review.' },
        { status: 400 },
      )
    }

    for (const item of reviews) {
      if (!item.instructor || !item.rating || !item.comment?.trim()) {
        return NextResponse.json(
          { error: 'Each teacher review needs instructor, rating, and comment.' },
          { status: 400 },
        )
      }
      if (!allowedInstructorIds.has(String(item.instructor))) {
        return NextResponse.json(
          { error: 'One or more teachers are not assigned to this course.' },
          { status: 400 },
        )
      }
    }

    const reviewedIds = new Set(reviews.map((r) => String(r.instructor)))
    for (const requiredId of allowedInstructorIds) {
      if (!reviewedIds.has(requiredId)) {
        return NextResponse.json(
          { error: 'Please submit a review for every assigned teacher.' },
          { status: 400 },
        )
      }
    }

    const existing = await InstructorReview.find({
      student: studentId,
      course: courseId,
    }).lean()

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Teacher reviews already submitted for this course.' },
        { status: 409 },
      )
    }

    const docs = await InstructorReview.insertMany(
      reviews.map((item) => ({
        course: courseId,
        student: studentId,
        instructor: item.instructor,
        rating: String(item.rating) as '1' | '2' | '3' | '4' | '5',
        comment: item.comment.trim(),
        status: 'pending',
      })),
    )

    // Unlock certificate only when syllabus is also complete (recomputed inside).
    await syncCertificateRequestWithReviewGate(studentId, courseId)

    return NextResponse.json(
      {
        success: true,
        docs: docs.map((d) => ({
          id: d._id.toString(),
          instructor: d.instructor.toString(),
          rating: d.rating,
          comment: d.comment,
          status: d.status,
        })),
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /api/completion-reviews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit teacher reviews.' },
      { status: 500 },
    )
  }
}
