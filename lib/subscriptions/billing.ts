import type { ICourse } from '@/lib/db/models/Course'
import type { IEnrollment } from '@/lib/db/models/Enrollment'
import { BD_TIME_ZONE } from '@/lib/bdTime'

export const BILLING_PERIOD_DAYS = 30

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Start of "today" in Asia/Dhaka as a Date (UTC instant). */
export function bdStartOfToday(now: Date = new Date()): Date {
  const ymd = now.toLocaleDateString('en-CA', { timeZone: BD_TIME_ZONE })
  return new Date(`${ymd}T00:00:00+06:00`)
}

export function daysBetweenBd(from: Date, to: Date): number {
  const a = bdStartOfToday(from).getTime()
  const b = bdStartOfToday(to).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

export function isMonthlyCourse(
  course: Pick<ICourse, 'billingType'> | null | undefined,
): boolean {
  return course?.billingType === 'monthly'
}

export function isMonthlyEnrollment(
  enrollment: Pick<IEnrollment, 'billingType'> | null | undefined,
): boolean {
  return enrollment?.billingType === 'monthly'
}

/**
 * Next paidUntil after a successful renewal: always previous period end + 30 days
 * (+ optional extension days from coupon). Cycle does not shift with pay date.
 */
export function nextPaidUntil(
  previousPaidUntil: Date,
  extensionDays = 0,
): Date {
  return addDays(previousPaidUntil, BILLING_PERIOD_DAYS + Math.max(0, extensionDays))
}

export function initialPaidUntil(from: Date = new Date()): Date {
  return addDays(from, BILLING_PERIOD_DAYS)
}

export type SubscriptionAccessSnapshot = {
  isMonthly: boolean
  paidUntil: Date | null
  accessStatus: 'active' | 'blocked'
  /** True when live join / recordings must be denied. */
  isBlocked: boolean
  /** True when red dashboard notice should show. */
  showOverdueNotice: boolean
  daysPastDue: number
  daysUntilDue: number
  blockAt: Date | null
  noticeStartAt: Date | null
  noticeEndAt: Date | null
}

export function getSubscriptionAccessSnapshot(
  enrollment: Pick<
    IEnrollment,
    'billingType' | 'paidUntil' | 'accessStatus' | 'paymentStatus'
  >,
  course: Pick<
    ICourse,
    | 'billingType'
    | 'noticeStartOffsetDays'
    | 'noticeEndOffsetDays'
    | 'blockOffsetDays'
  >,
  now: Date = new Date(),
): SubscriptionAccessSnapshot {
  const isMonthly =
    enrollment.paymentStatus === 'completed' &&
    (enrollment.billingType === 'monthly' || course.billingType === 'monthly')

  if (!isMonthly || !enrollment.paidUntil) {
    return {
      isMonthly: false,
      paidUntil: null,
      accessStatus: 'active',
      isBlocked: false,
      showOverdueNotice: false,
      daysPastDue: 0,
      daysUntilDue: 0,
      blockAt: null,
      noticeStartAt: null,
      noticeEndAt: null,
    }
  }

  const paidUntil = new Date(enrollment.paidUntil)
  const noticeStart = Math.max(0, course.noticeStartOffsetDays ?? 5)
  const noticeEnd = Math.max(0, course.noticeEndOffsetDays ?? 2)
  const blockOffset = Math.max(0, course.blockOffsetDays ?? 2)

  const noticeStartAt = addDays(paidUntil, -noticeStart)
  const noticeEndAt = addDays(paidUntil, noticeEnd)
  const blockAt = addDays(paidUntil, blockOffset)

  const daysUntilDue = daysBetweenBd(now, paidUntil)
  const daysPastDue = Math.max(0, -daysUntilDue)

  const isBlocked =
    enrollment.accessStatus === 'blocked' || now.getTime() >= blockAt.getTime()

  // Show from noticeStart until block (noticeEnd is soft end for SMS window;
  // dashboard keeps the red banner until access is blocked or paid).
  const showOverdueNotice =
    !isBlocked && now.getTime() >= noticeStartAt.getTime()

  return {
    isMonthly: true,
    paidUntil,
    accessStatus: isBlocked ? 'blocked' : 'active',
    isBlocked,
    showOverdueNotice,
    daysPastDue,
    daysUntilDue,
    blockAt,
    noticeStartAt,
    noticeEndAt,
  }
}

export function computeRenewalAmount(
  course: Pick<ICourse, 'monthlyFee' | 'lateFeeEnabled' | 'lateFeeAmount'>,
  enrollment: Pick<IEnrollment, 'paidUntil'>,
  options?: {
    overrideFee?: number | null
    now?: Date
  },
): { baseFee: number; lateFee: number; total: number } {
  const now = options?.now ?? new Date()
  const baseFee =
    typeof options?.overrideFee === 'number' && options.overrideFee >= 0
      ? options.overrideFee
      : Number(course.monthlyFee || 0)

  let lateFee = 0
  if (
    options?.overrideFee == null &&
    course.lateFeeEnabled &&
    enrollment.paidUntil &&
    now.getTime() > new Date(enrollment.paidUntil).getTime()
  ) {
    lateFee = Math.max(0, Number(course.lateFeeAmount || 0))
  }

  const total = Math.round((baseFee + lateFee) * 100) / 100
  return { baseFee, lateFee, total }
}

export function buildFeeReminderSms(params: {
  studentName: string
  courseTitle: string
  paidUntilLabel: string
  amount: number
}): string {
  return (
    `[ Canadian Nest School ]\n\n` +
    `Dear ${params.studentName},\n` +
    `Please pay the monthly fee for "${params.courseTitle}" ` +
    `(due ${params.paidUntilLabel}). Amount: BDT ${params.amount}.\n` +
    `Pay from your student portal to keep access.\n\n` +
    `Thank you.`
  )
}
