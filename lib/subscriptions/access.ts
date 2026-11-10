import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import {
  courseFee,
  getSubscriptionAccessSnapshot,
  isRecurringEnrollment,
  type SubscriptionAccessSnapshot,
} from '@/lib/subscriptions/billing'

/**
 * Returns whether a student may access live/recordings for a course.
 * One-time completed enrollments always pass. Recurring enrollments respect block.
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

  if (!isRecurringEnrollment(enrollment)) {
    return { allowed: true, enrollment }
  }

  const course = await Course.findById(courseId)
    .select(
      'billingType noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays title monthlyFee quarterlyFee',
    )
    .lean()

  if (!course) {
    return { allowed: false, reason: 'COURSE_NOT_FOUND', enrollment }
  }

  const snapshot = getSubscriptionAccessSnapshot(enrollment, course)

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
    billingType: { $in: ['monthly', 'quarterly'] },
  })
    .populate({
      path: 'course',
      select:
        'title slug billingType monthlyFee quarterlyFee noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays lateFeeEnabled lateFeeAmount',
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
    fee: number
    billingType: 'monthly' | 'quarterly'
  }> = []

  for (const e of enrollments as any[]) {
    const course = e.course
    if (!course) continue
    const snapshot = getSubscriptionAccessSnapshot(e, course)
    if (!snapshot.showOverdueNotice && !snapshot.isBlocked) continue

    const fee = courseFee(course)
    const billingType =
      e.billingType === 'quarterly' ? 'quarterly' : 'monthly'

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
      monthlyFee: fee,
      fee,
      billingType,
    })
  }

  return notices
}
