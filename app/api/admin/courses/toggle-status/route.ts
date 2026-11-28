import { NextResponse } from 'next/server'
import { courseHasInstructor } from '@/lib/auth/staffScope'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    // 1. Session verification
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    // 2. Parse request parameters
    const body = await request.json()
    const { courseId, status } = body

    if (!courseId || !['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters provided.' }, { status: 400 })
    }

    // 3. Find and verify ownership
    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ error: 'Course document not found.' }, { status: 404 })
    }

    // Instructors can only toggle their own courses
    if (user.role === 'instructor' && !courseHasInstructor(course as any, user._id.toString())) {
      return NextResponse.json({ error: 'Forbidden: You do not own this course.' }, { status: 403 })
    }

    // 4. Update course status
    course.status = status
    await course.save()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    try {
      revalidatePath('/')
      revalidatePath('/courses')
      revalidatePath('/instructors')
      revalidatePath(`/courses/${course.slug}`)
    } catch (cacheError) {
      console.error('Failed to revalidate paths during status toggle:', cacheError)
    }

    return NextResponse.json({
      success: true,
      message: `Course successfully updated to ${status}.`,
      course: {
        id: course._id.toString(),
        status: course.status,
      },
    })

  } catch (error: any) {
    console.error('Course Toggle API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update course status.' }, { status: 500 })
  }
}
