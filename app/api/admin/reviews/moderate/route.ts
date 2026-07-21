import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { revalidatePath } from 'next/cache'
import { moderateReviewPack } from '@/lib/reviews/reviewPack'
import '@/lib/db/models/InstructorReview'
import '@/lib/db/models/CertificateRequest'

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff'], 'reviews')
    if (!user) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    const body = await request.json()
    const { reviewId, status } = body

    if (!reviewId || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters provided.' }, { status: 400 })
    }

    // Approves/rejects course review + all teacher reviews for that pack together
    const { courseReview, courseId } = await moderateReviewPack(reviewId, status)

    const course = await Course.findById(courseId).lean()
    const slug = (course as any)?.slug

    if (slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during review moderation:', cacheError)
      }
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'approved'
          ? 'Course and teacher reviews approved together.'
          : `Review pack successfully updated to ${status}.`,
      review: {
        id: courseReview._id.toString(),
        status: courseReview.status,
      },
    })

  } catch (error: any) {
    console.error('Moderation API Error:', error)
    const statusCode = error?.status || 500
    return NextResponse.json(
      { error: error.message || 'Failed to update review status.' },
      { status: statusCode },
    )
  }
}
