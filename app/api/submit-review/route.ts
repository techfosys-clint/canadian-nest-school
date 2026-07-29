import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Review } from '@/lib/db/models/Review'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { assertStudentCanReviewCourse, syncCertificateRequestWithReviewGate } from '@/lib/reviews/reviewPack'

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const cookieStore = await cookies()

    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    const token = studentToken || payloadToken
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { course, rating, comment } = body

    if (!course || !rating || !comment?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    try {
      await assertStudentCanReviewCourse(decoded.id, course)
    } catch (gateErr: any) {
      return NextResponse.json(
        { error: gateErr.message || 'Not allowed to review this course.' },
        { status: gateErr.status || 403 },
      )
    }

    const existing = await Review.findOne({
      course,
      student: decoded.id,
    }).lean()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a review for this course.', already: true },
        { status: 409 },
      )
    }

    const review = await Review.create({
      course,
      student: decoded.id,
      rating: String(rating) as '1' | '2' | '3' | '4' | '5',
      comment: comment.trim(),
      status: 'pending',
    })

    // Sync cert only when syllabus is also complete (progress recomputed inside).
    await syncCertificateRequestWithReviewGate(decoded.id, course)

    return NextResponse.json({ doc: review }, { status: 201 })
  } catch (err: any) {
    console.error('Submit review error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to submit review.' }, { status: 500 })
  }
}
