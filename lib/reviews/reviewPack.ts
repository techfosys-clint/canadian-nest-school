import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { Course } from '@/lib/db/models/Course'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import { Review } from '@/lib/db/models/Review'

export type ReviewFlowStatus = 'idle' | 'pending' | 'approved' | 'rejected'

function toId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id)
  }
  return String(value)
}

export function getCourseInstructorIds(course: {
  instructor?: unknown
  instructors?: unknown[]
}): string[] {
  const ids: string[] = []
  const seen = new Set<string>()

  const push = (value: unknown) => {
    const id = toId(value)
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  if (Array.isArray(course.instructors) && course.instructors.length > 0) {
    for (const item of course.instructors) push(item)
  } else if (course.instructor) {
    push(course.instructor)
  }

  return ids
}

export function deriveTeacherReviewStatus(
  expectedInstructorCount: number,
  instructorReviews: Array<{ status: string }>,
): ReviewFlowStatus {
  if (expectedInstructorCount === 0) {
    // No teachers assigned — treat teacher reviews as satisfied
    return 'approved'
  }
  if (instructorReviews.length === 0) return 'idle'
  if (instructorReviews.length < expectedInstructorCount) return 'idle'
  if (instructorReviews.some((r) => r.status === 'rejected')) return 'rejected'
  if (instructorReviews.every((r) => r.status === 'approved')) return 'approved'
  return 'pending'
}

export function deriveCourseReviewStatus(
  review: { status: string } | null | undefined,
): ReviewFlowStatus {
  if (!review) return 'idle'
  if (review.status === 'approved') return 'approved'
  if (review.status === 'rejected') return 'rejected'
  return 'pending'
}

export function hasSubmittedRequiredReviews(
  courseStatus: ReviewFlowStatus,
  teacherStatus: ReviewFlowStatus,
) {
  return courseStatus !== 'idle' && teacherStatus !== 'idle'
}

export function canDownloadCertificate(
  courseStatus: ReviewFlowStatus,
  teacherStatus: ReviewFlowStatus,
) {
  return courseStatus === 'approved' && teacherStatus === 'approved'
}

export async function getStudentCourseReviewGate(studentId: string, courseId: string) {
  const course = await Course.findById(courseId)
    .select('instructor instructors')
    .lean()
  if (!course) {
    return {
      courseReviewStatus: 'idle' as ReviewFlowStatus,
      teacherReviewStatus: 'idle' as ReviewFlowStatus,
      courseReview: null,
      instructorReviews: [] as any[],
      instructorIds: [] as string[],
    }
  }

  const instructorIds = getCourseInstructorIds(course)

  const [courseReview, instructorReviews] = await Promise.all([
    Review.findOne({ student: studentId, course: courseId }).lean(),
    InstructorReview.find({ student: studentId, course: courseId }).lean(),
  ])

  return {
    courseReview,
    instructorReviews,
    instructorIds,
    courseReviewStatus: deriveCourseReviewStatus(courseReview),
    teacherReviewStatus: deriveTeacherReviewStatus(
      instructorIds.length,
      instructorReviews,
    ),
  }
}

/** Approve/reject course review + all teacher reviews for that student/course together */
export async function moderateReviewPack(
  courseReviewId: string,
  status: 'approved' | 'rejected' | 'pending',
) {
  const courseReview = await Review.findById(courseReviewId)
  if (!courseReview) {
    throw new Error('Review document not found.')
  }

  const studentId = courseReview.student.toString()
  const courseId = courseReview.course.toString()

  courseReview.status = status
  await courseReview.save()

  await InstructorReview.updateMany(
    { student: studentId, course: courseId },
    { $set: { status } },
  )

  if (status === 'approved') {
    await CertificateRequest.findOneAndUpdate(
      { student: studentId, course: courseId },
      { $set: { status: 'approved' } },
      { upsert: false },
    )
  } else if (status === 'rejected') {
    await CertificateRequest.findOneAndUpdate(
      { student: studentId, course: courseId },
      { $set: { status: 'rejected' } },
      { upsert: false },
    )
  }

  return {
    courseReview,
    studentId,
    courseId,
  }
}
