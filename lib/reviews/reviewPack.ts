import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import { Review } from '@/lib/db/models/Review'
import { getCourseProgressPercent } from '@/lib/progress/getCourseProgress'

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
  expectedInstructorIds: string[],
  instructorReviews: Array<{ status: string; instructor?: unknown }>,
): ReviewFlowStatus {
  if (expectedInstructorIds.length === 0) {
    // No teachers assigned — treat teacher reviews as satisfied
    return 'approved'
  }

  const expectedSet = new Set(expectedInstructorIds)
  // Ignore reviews for teachers no longer assigned to the course.
  const relevantReviews = instructorReviews.filter((r) =>
    expectedSet.has(toId(r.instructor)),
  )

  const reviewedIds = new Set(
    relevantReviews.map((r) => toId(r.instructor)).filter(Boolean),
  )
  const coversAllCurrentTeachers = expectedInstructorIds.every((id) =>
    reviewedIds.has(id),
  )

  if (!coversAllCurrentTeachers || relevantReviews.length === 0) {
    return 'idle'
  }
  if (relevantReviews.some((r) => r.status === 'rejected')) return 'rejected'
  if (relevantReviews.every((r) => r.status === 'approved')) return 'approved'
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

/**
 * Certificate download unlocks once both review tracks are submitted
 * (pending or approved). Staff approval is moderation-only and does not
 * gate the PDF. Rejected reviews must be resubmitted.
 */
export function canDownloadCertificate(
  courseStatus: ReviewFlowStatus,
  teacherStatus: ReviewFlowStatus,
) {
  if (courseStatus === 'rejected' || teacherStatus === 'rejected') return false
  return courseStatus !== 'idle' && teacherStatus !== 'idle'
}

/** Joint admin-pack status — never "approved" while teacher reviews are still missing */
export function computeJointPackStatus(args: {
  courseStatus: string
  teacherReviews: Array<{ status: string; instructor?: unknown }>
  expectedInstructorIds: string[]
}): 'pending' | 'approved' | 'rejected' {
  const { courseStatus, teacherReviews, expectedInstructorIds } = args

  if (courseStatus === 'rejected') {
    return 'rejected'
  }

  const expectedSet = new Set(expectedInstructorIds)
  const relevantRejected = teacherReviews.some(
    (t) => t.status === 'rejected' && expectedSet.has(toId(t.instructor)),
  )
  if (relevantRejected) {
    return 'rejected'
  }

  const teacherGate = deriveTeacherReviewStatus(
    expectedInstructorIds,
    teacherReviews,
  )
  const teachersComplete =
    expectedInstructorIds.length === 0 || teacherGate === 'approved'

  if (courseStatus === 'approved' && teachersComplete) {
    return 'approved'
  }

  return 'pending'
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
      instructorIds,
      instructorReviews,
    ),
  }
}

/** Paid enrollment required before submitting reviews (anytime after purchase). */
export async function assertStudentCanReviewCourse(studentId: string, courseId: string) {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    paymentStatus: 'completed',
  }).lean()

  if (!enrollment) {
    const error = new Error(
      'You must be enrolled in this course with completed payment to submit reviews.',
    )
    ;(error as Error & { status: number }).status = 403
    throw error
  }

  const progress = await getCourseProgressPercent(
    courseId,
    enrollment.completedLessons || [],
  )

  return { enrollment, progress }
}

async function syncCertificateForReviewPack(
  studentId: string,
  courseId: string,
  status: 'approved' | 'rejected' | 'pending',
) {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    paymentStatus: 'completed',
  })
    .select('completedLessons')
    .lean()

  const progress = enrollment
    ? await getCourseProgressPercent(courseId, enrollment.completedLessons || [])
    : 0

  if (status === 'approved') {
    // Reviews may be moderated before the student finishes the syllabus —
    // never approve the certificate until progress is 100%.
    if (progress < 100) {
      await CertificateRequest.findOneAndUpdate(
        { student: studentId, course: courseId },
        { $set: { progress, status: 'pending' } },
        { upsert: false },
      )
      return
    }

    await CertificateRequest.findOneAndUpdate(
      { student: studentId, course: courseId },
      {
        $set: { status: 'approved', progress },
        $setOnInsert: { student: studentId, course: courseId },
      },
      { upsert: true, returnDocument: 'after' },
    )
    return
  }

  if (status === 'rejected') {
    await CertificateRequest.findOneAndUpdate(
      { student: studentId, course: courseId },
      { $set: { status: 'rejected', progress } },
      { upsert: false },
    )
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

  const course = await Course.findById(courseId).select('instructor instructors').lean()
  if (!course) {
    throw new Error('Course not found for this review.')
  }

  const instructorIds = getCourseInstructorIds(course)
  const teacherReviews = await InstructorReview.find({
    student: studentId,
    course: courseId,
  }).lean()

  if (status === 'approved') {
    const reviewedIds = new Set(teacherReviews.map((t) => toId(t.instructor)))
    const missingInstructor = instructorIds.some((id) => !reviewedIds.has(id))
    if (instructorIds.length > 0 && missingInstructor) {
      const error = new Error(
        'Cannot approve yet: the student must submit reviews for every assigned teacher first.',
      )
      ;(error as Error & { status: number }).status = 400
      throw error
    }
  }

  courseReview.status = status
  await courseReview.save()

  await InstructorReview.updateMany(
    { student: studentId, course: courseId },
    { $set: { status } },
  )

  if (status === 'approved' || status === 'rejected') {
    await syncCertificateForReviewPack(studentId, courseId, status)
  }

  return {
    courseReview,
    studentId,
    courseId,
  }
}

/**
 * Hold legacy/previously-approved certificates until course + teacher reviews
 * are submitted. Safe to call on certificate list/download.
 * Never approves a certificate when syllabus progress is below 100%.
 */
export async function reconcileCertificateWithReviewGate(
  studentId: string,
  courseId: string,
) {
  const existing = await CertificateRequest.findOne({
    student: studentId,
    course: courseId,
  })
  if (!existing) {
    return {
      certificate: null,
      gate: await getStudentCourseReviewGate(studentId, courseId),
      heldForReviews: false,
    }
  }

  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    paymentStatus: 'completed',
  })
    .select('completedLessons')
    .lean()

  const progress = enrollment
    ? await getCourseProgressPercent(courseId, enrollment.completedLessons || [])
    : 0

  existing.progress = progress

  const gate = await getStudentCourseReviewGate(studentId, courseId)
  const reviewsApproved = canDownloadCertificate(
    gate.courseReviewStatus,
    gate.teacherReviewStatus,
  )
  const reviewsRejected =
    gate.courseReviewStatus === 'rejected' ||
    gate.teacherReviewStatus === 'rejected'
  const reviewsSubmitted = hasSubmittedRequiredReviews(
    gate.courseReviewStatus,
    gate.teacherReviewStatus,
  )

  let heldForReviews = false

  if (progress < 100) {
    // Reviews alone must never unlock/approve a certificate early.
    // If reviews were resubmitted after a rejection, clear stale "rejected".
    if (reviewsRejected) {
      existing.status = 'rejected'
    } else if (existing.status === 'approved' || existing.status === 'rejected') {
      existing.status = 'pending'
    }
    await existing.save()
    return { certificate: existing, gate, heldForReviews: !reviewsSubmitted }
  }

  if (reviewsApproved) {
    if (existing.status !== 'approved') {
      existing.status = 'approved'
    }
    await existing.save()
  } else if (reviewsRejected) {
    if (existing.status !== 'rejected') {
      existing.status = 'rejected'
    }
    await existing.save()
  } else {
    // Reviews still missing — hold download until the student submits them.
    // Also clear a stale rejected status if the gate is no longer rejected.
    if (existing.status === 'approved' || existing.status === 'rejected') {
      existing.status = 'pending'
      if (!existing.adminNotes && !reviewsSubmitted) {
        existing.adminNotes =
          'Held until the student submits course and teacher reviews.'
      }
      heldForReviews = true
    } else if (!reviewsSubmitted) {
      heldForReviews = true
    }
    await existing.save()
  }

  return { certificate: existing, gate, heldForReviews }
}

/**
 * Sync certificate row with review gate.
 * Always recomputes syllabus progress from enrollment.
 */
export async function syncCertificateRequestWithReviewGate(
  studentId: string,
  courseId: string,
) {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    paymentStatus: 'completed',
  })
    .select('completedLessons')
    .lean()

  const progress = enrollment
    ? await getCourseProgressPercent(courseId, enrollment.completedLessons || [])
    : 0

  const existing = await CertificateRequest.findOne({
    student: studentId,
    course: courseId,
  })

  if (progress < 100) {
    if (existing) {
      existing.progress = progress
      const gate = await getStudentCourseReviewGate(studentId, courseId)
      const reviewsRejected =
        gate.courseReviewStatus === 'rejected' ||
        gate.teacherReviewStatus === 'rejected'
      // Never approved below 100%. Clear stale rejected after resubmit.
      if (reviewsRejected) {
        existing.status = 'rejected'
      } else if (existing.status === 'approved' || existing.status === 'rejected') {
        existing.status = 'pending'
      }
      await existing.save()
    }
    return
  }

  const gate = await getStudentCourseReviewGate(studentId, courseId)
  const reviewsApproved = canDownloadCertificate(
    gate.courseReviewStatus,
    gate.teacherReviewStatus,
  )
  const reviewsRejected =
    gate.courseReviewStatus === 'rejected' ||
    gate.teacherReviewStatus === 'rejected'

  let nextStatus: 'pending' | 'approved' | 'rejected' = 'pending'
  if (reviewsRejected) nextStatus = 'rejected'
  else if (reviewsApproved) nextStatus = 'approved'

  if (existing) {
    existing.progress = progress
    // Always mirror review gate — do not keep a legacy "approved" cert
    // while reviews are still missing/pending.
    existing.status = nextStatus
    await existing.save()
    return
  }

  await CertificateRequest.create({
    student: studentId,
    course: courseId,
    status: nextStatus,
    progress,
  })
}
