import { canStudentJoinBatch } from '@/lib/batchCapacity'
import { Batch } from '@/lib/db/models/Batch'
import { Course } from '@/lib/db/models/Course'
import { connectToDatabase } from '@/lib/db/mongodb'
import { isRecurringCourse } from '@/lib/subscriptions/billing'
import { NextResponse } from 'next/server'

type Props = {
  params: Promise<{ courseId: string }>
}

export const dynamic = 'force-dynamic'

/**
 * Public: the batch(es) currently in an open join window for a monthly/quarterly course.
 * Join windows are expected not to overlap — typically 0 or 1 result.
 */
export async function GET(_request: Request, { params }: Props) {
  try {
    await connectToDatabase()
    const { courseId } = await params

    const course = await Course.findById(courseId)
      .select('billingType status title')
      .lean()

    if (!course || course.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Course not found.' },
        { status: 404 },
      )
    }

    if (!isRecurringCourse(course)) {
      return NextResponse.json({
        success: true,
        requiresBatch: false,
        batches: [],
      })
    }

    const batches = await Batch.find({
      course: courseId,
      status: { $ne: 'completed' },
    })
      .select(
        'name startDate endDate joinOpensAt joinClosesAt maxStudents students status',
      )
      .sort({ joinOpensAt: 1, startDate: 1 })
      .lean()

    const open = batches
      .filter((b) => canStudentJoinBatch(b as any))
      .map((b: any) => ({
        id: b._id.toString(),
        name: b.name,
        startDate: b.startDate,
        endDate: b.endDate,
        joinOpensAt: b.joinOpensAt,
        joinClosesAt: b.joinClosesAt,
        seatsLeft:
          b.maxStudents > 0
            ? Math.max(0, b.maxStudents - (b.students?.length || 0))
            : null,
        maxStudents: b.maxStudents || 0,
      }))

    return NextResponse.json({
      success: true,
      requiresBatch: true,
      batches: open,
    })
  } catch (error: any) {
    console.error('Open batches API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load batches.' },
      { status: 500 },
    )
  }
}
