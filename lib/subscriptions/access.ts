import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import {
  getSubscriptionAccessSnapshot,
  type SubscriptionAccessSnapshot,
} from '@/lib/subscriptions/billing'

/**
 * Returns whether a student may access live/recordings for a course.
 * One-time completed enrollments always pass. Monthly enrollments respect block.
 */
export async function assertCourseContentAccess(
  studentId: string,
  courseId: string,
): Promise<{
  allowed: boolean
  reason?: string
  enrollment?: any
  snapshot?: SubscriptionAccessSnapshot
}> {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    paymentStatus: 'completed',
  })

  if (!enrollment) {
    return { allowed: false, reason: 'NOT_ENROLLED' }
  }

  if (enrollment.billingType !== 'monthly') {
    return { allowed: true, enrollment }
  }

  const course = await Course.findById(courseId)
    .select(
      'billingType noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays title monthlyFee',
    )
    .lean()

  if (!course) {
    return { allowed: false, reason: 'COURSE_NOT_FOUND', enrollment }
  }

  const snapshot = getSubscriptionAccessSnapshot(enrollment, course)

  // Persist blocked status when cron hasn't run yet.
  if (snapshot.isBlocked && enrollment.accessStatus !== 'blocked') {
    enrollment.accessStatus = 'blocked'
    await enrollment.save()
  }

  if (snapshot.isBlocked) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_BLOCKED',
      enrollment,
      snapshot,
    }
  }

  return { allowed: true, enrollment, snapshot }
}

export async function getStudentSubscriptionNotices(studentId: string) {
  const enrollments = await Enrollment.find({
    student: studentId,
    paymentStatus: 'completed',
    billingType: 'monthly',
  })
    .populate({
      path: 'course',
      select:
        'title slug billingType monthlyFee noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays lateFeeEnabled lateFeeAmount',
    })
    .lean()

  const notices: Array<{
    enrollmentId: string
    courseId: string
    courseTitle: string
    courseSlug: string
    paidUntil: string
    isBlocked: boolean
    showOverdueNotice: boolean
    daysPastDue: number
    daysUntilDue: number
    monthlyFee: number
  }> = []

  for (const e of enrollments as any[]) {
    const course = e.course
    if (!course) continue
    const snapshot = getSubscriptionAccessSnapshot(e, course)
    if (!snapshot.showOverdueNotice && !snapshot.isBlocked) continue

    notices.push({
      enrollmentId: e._id.toString(),
      courseId: course._id.toString(),
      courseTitle: course.title || 'Course',
      courseSlug: course.slug || '',
      paidUntil: snapshot.paidUntil
        ? snapshot.paidUntil.toISOString()
        : '',
      isBlocked: snapshot.isBlocked,
      showOverdueNotice: snapshot.showOverdueNotice,
      daysPastDue: snapshot.daysPastDue,
      daysUntilDue: snapshot.daysUntilDue,
      monthlyFee: Number(course.monthlyFee || 0),
    })
  }

  return notices
}
