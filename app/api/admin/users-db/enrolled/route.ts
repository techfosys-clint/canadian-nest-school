import { getAuthorizedUser } from '@/lib/auth/auth'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { connectToDatabase } from '@/lib/db/mongodb'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/users-db/enrolled?courseId=&batchId=
 * Returns student IDs with a completed enrollment for the given course
 * (and batch, when provided).
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

    const filter: Record<string, unknown> = {
      course: courseId,
      paymentStatus: 'completed',
    }
    if (batchId) {
      filter.batch = batchId
    }

    const enrollments = await Enrollment.find(filter).select('student').lean()
    const studentIds = Array.from(
      new Set(
        enrollments
          .map((e: any) => e.student?.toString?.() || String(e.student))
          .filter(Boolean),
      ),
    )

    return NextResponse.json({ success: true, studentIds })
  } catch (err: any) {
    console.error('Error fetching enrolled student IDs:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
