import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { createZoomMeeting } from '@/lib/zoom'
import { revalidatePath } from 'next/cache'

/**
 * GET /api/admin/lessons
 * Fetch all lessons (optionally filtered by courseId)
 * Returns standardized response format
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const query: any = courseId ? { course: courseId } : {}
    const lessons = await Lesson.find(query)
      .populate({ path: 'course', select: 'title slug status instructor' })
      .sort({ course: 1, order: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: { lessons },
    })
  } catch (error: any) {
    console.error('GET /api/admin/lessons error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lessons',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while fetching lessons.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/lessons
 * Create a new lesson with validation
 * Returns standardized response format
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value
    if (!payloadToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'Session authentication token is missing.',
        },
        { status: 401 }
      )
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
          message: 'Session authentication token is invalid.',
        },
        { status: 401 }
      )
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create lessons.',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, slug, course: courseId, order, moduleName, lessonType, videoUrl, livePlatform, liveUrl, liveDate, content, duration, isPreviewable, autoGenerateZoom, quizQuestions } = body

    if (!title || !slug || !courseId || !duration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          message: 'Required fields: title, slug, course, duration.',
        },
        { status: 400 }
      )
    }

    // Verify course ownership
    const course = await Course.findById(courseId).lean()
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
          code: 'NOT_FOUND',
          message: 'The specified course does not exist.',
        },
        { status: 404 }
      )
    }
    if (user.role === 'instructor' && (course as any).instructor.toString() !== user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'NOT_OWNER',
          message: 'You do not own this course.',
        },
        { status: 403 }
      )
    }

    // Check slug uniqueness
    const existing = await Lesson.findOne({ slug }).lean()
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate slug',
          code: 'VALIDATION_ERROR',
          message: 'Lesson slug already exists.',
        },
        { status: 400 }
      )
    }

    let actualLiveUrl = liveUrl
    const finalAutoGenerate = !!(lessonType === 'live' && livePlatform === 'zoom' && autoGenerateZoom)

    if (finalAutoGenerate) {
      if (!liveDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required field',
            code: 'VALIDATION_ERROR',
            message: 'Scheduled Time & Date is required to auto-generate a Zoom meeting.',
          },
          { status: 400 }
        )
      }

      const zoomDetails = await createZoomMeeting(title, liveDate, Number(duration) || 60)
      if (!zoomDetails) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to auto-generate Zoom meeting',
            code: 'EXTERNAL_SERVICE_ERROR',
            message: 'Failed to auto-generate Zoom meeting link. Please verify your Zoom credentials.',
          },
          { status: 500 }
        )
      }
      actualLiveUrl = zoomDetails.joinUrl
    }

    let finalOrder = order
    if (!finalOrder) {
      const lastLesson = await Lesson.findOne({ course: courseId, moduleName: moduleName || 'General Module' })
        .sort({ order: -1 })
        .lean()
      finalOrder = lastLesson && lastLesson.order ? lastLesson.order + 1 : 1
    }

    const newLesson = new Lesson({
      title, slug, course: courseId, order: finalOrder, moduleName, lessonType: lessonType || 'recorded',
      videoUrl, livePlatform, liveUrl: actualLiveUrl,
      liveDate: liveDate ? new Date(liveDate) : undefined,
      content, duration: Number(duration),
      isPreviewable: isPreviewable || false,
      autoGenerateZoom: finalAutoGenerate,
      quizQuestions: lessonType === 'quiz' ? quizQuestions : undefined,
    })
    await newLesson.save()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    if (course && (course as any).slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${(course as any).slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during lesson creation:', cacheError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { lesson: newLesson },
        message: 'Lesson successfully created.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/admin/lessons error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create lesson',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while creating the lesson.',
      },
      { status: 500 }
    )
  }
}
