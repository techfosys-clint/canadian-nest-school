import { NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { InstructorReview } from '@/lib/db/models/InstructorReview'
import '@/lib/db/models/Course'
import '@/lib/db/models/Student'
import '@/lib/db/models/User'

export const dynamic = 'force-dynamic'

/** Instructor (or admin) — view teacher reviews about themselves */
export async function GET() {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'instructor'])
    if (!user) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const instructorId = user._id.toString()

    // Admins see nothing on this endpoint unless they are also reviewing as instructor;
    // scope always to the logged-in user id so instructors only see their own feedback.
    const reviews = await InstructorReview.find({ instructor: instructorId })
      .populate({ path: 'course', select: 'title slug' })
      .populate({ path: 'student', select: 'name email' })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      docs: reviews.map((r: any) => ({
        id: r._id.toString(),
        rating: Number(r.rating) || 0,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        studentName: r.student?.name || 'Anonymous',
        studentEmail: r.student?.email || null,
        courseTitle: r.course?.title || 'Course',
        courseSlug: r.course?.slug || null,
      })),
    })
  } catch (error: any) {
    console.error('GET /api/instructor/reviews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load instructor reviews.' },
      { status: 500 },
    )
  }
}
