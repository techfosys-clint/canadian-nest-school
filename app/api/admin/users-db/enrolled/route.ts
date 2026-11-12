import { getAuthorizedUser } from '@/lib/auth/auth'
import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getSubscriptionAccessSnapshot } from '@/lib/subscriptions/billing'
import { NextRequest, NextResponse } from 'next/server'

export type EnrolledStudentRow = {
  id: string
  name: string
  email: string
  phone: string
  status: string
  enrollmentId: string
  billingType: string
  paymentStatus: string
  /** paid = current period ok; due = renewal needed / blocked / overdue notice */
  feeStatus: 'paid' | 'due'
  paidUntil: string | null
  accessStatus: string
}

/**
 * GET /api/admin/users-db/enrolled?courseId=&batchId=
 * Returns completed enrollments for the course (optional batch) with paid/due fee status.
 */
export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAuthorizedUser(['admin'])
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const courseId = req.nextUrl.searchParams.get('courseId')?.trim()
    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 },
      )
    }

    const batchId = req.nextUrl.searchParams.get('batchId')?.trim() || ''

    await connectToDatabase()

    const course = await Course.findById(courseId)
      .select(
        'title billingType noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays',
      )
      .lean()
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const filter: Record<string, unknown> = {
      course: courseId,
      paymentStatus: 'completed',
    }
    if (batchId) {
      filter.batch = batchId
    }

    const enrollments = await Enrollment.find(filter)
      .select(
        'student billingType paymentStatus paidUntil accessStatus batch createdAt',
      )
      .lean()

    const studentIds = enrollments
      .map((e: any) => e.student?.toString?.() || String(e.student))
      .filter(Boolean)

    const students = await Student.find({ _id: { $in: studentIds } })
      .select('name email phone status')
      .lean()

    const studentMap = new Map(
      students.map((s: any) => [s._id.toString(), s]),
    )

    const now = new Date()
    const rows: EnrolledStudentRow[] = []

    for (const enrollment of enrollments as any[]) {
      const sid = enrollment.student?.toString?.() || String(enrollment.student)
      const student = studentMap.get(sid)
      if (!student) continue

      const snap = getSubscriptionAccessSnapshot(enrollment, course as any, now)
      const feeStatus: 'paid' | 'due' = snap.isRecurring
        ? snap.isBlocked || snap.showOverdueNotice || snap.daysPastDue > 0
          ? 'due'
          : 'paid'
        : 'paid'

      rows.push({
        id: sid,
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        status: student.status || 'active',
        enrollmentId: enrollment._id.toString(),
        billingType: enrollment.billingType || course.billingType || 'one_time',
        paymentStatus: enrollment.paymentStatus || 'completed',
        feeStatus,
        paidUntil: enrollment.paidUntil
          ? new Date(enrollment.paidUntil).toISOString()
          : null,
        accessStatus: snap.accessStatus,
      })
    }

    // Newest enrollments first; unique student preference keeps first occurrence
    const seen = new Set<string>()
    const uniqueRows: EnrolledStudentRow[] = []
    for (const row of rows) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      uniqueRows.push(row)
    }

    return NextResponse.json({
      success: true,
      courseTitle: (course as any).title || '',
      studentIds: uniqueRows.map((r) => r.id),
      students: uniqueRows,
    })
  } catch (err: any) {
    console.error('Error fetching enrolled student IDs:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
