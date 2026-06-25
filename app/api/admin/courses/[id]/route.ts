import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { Review } from '@/lib/db/models/Review'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { User } from '@/lib/db/models/User'
import { verifyToken, getAuthorizedUser } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Import additional models for cascade delete
const getSubmissionModel = async () => {
  const { Submission } = await import('@/lib/db/models/Submission')
  return Submission
}

/**
 * GET /api/admin/courses/[id]
 * Fetch a specific course by ID
 * Returns standardized response format
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff', 'instructor'], 'courses')
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED', message: 'You must be signed in to view this course.' },
        { status: 401 }
      )
    }

    const { id } = await params

    const course = await Course.findById(id)
      .populate('category')
      .populate('instructor')
      .populate('thumbnail')
      .lean()

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
          code: 'NOT_FOUND',
          message: 'The requested course does not exist.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { course },
    })
  } catch (error: any) {
    console.error('GET /api/admin/courses/[id] error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while fetching the course.',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/courses/[id]
 * Delete a course and cascade delete all related data (admin only)
 * Returns standardized response format
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params

    // 1. Session verification
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
    if (!decoded || !decoded.id) {
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'ADMIN_ONLY',
          message: 'Only administrators can delete courses.',
        },
        { status: 403 }
      )
    }

    // Fetch course details before deleting
    const courseToDelete = await Course.findById(id).lean() as any
    if (!courseToDelete) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
          code: 'NOT_FOUND',
          message: 'The requested course does not exist.',
        },
        { status: 404 }
      )
    }
    const slug = courseToDelete?.slug

    // ═══════════════════════════════════════════════════════════════
    // 2. Cascade Delete — Delete ALL related data in correct order
    // ═══════════════════════════════════════════════════════════════

    // Step 1: Find all lessons for this course (to delete lesson-specific data)
    const lessons = await Lesson.find({ course: id }).select('_id').lean()
    const lessonIds = lessons.map((l: any) => l._id)

    // Step 2: Delete all submissions for these lessons
    const Submission = await getSubmissionModel()
    if (lessonIds.length > 0) {
      await Submission.deleteMany({ lesson: { $in: lessonIds } })
    }

    // Note: WatchSession records are per-user device sessions (not scoped to
    // a course/lesson), used only for device-limit anti-sharing checks. They
    // self-expire via a TTL index, so there's nothing course-specific to
    // cascade-delete here.

    // Step 4: Delete lessons
    await Lesson.deleteMany({ course: id })

    // Step 5: Delete reviews
    await Review.deleteMany({ course: id })

    // Step 6: Delete enrollments
    await Enrollment.deleteMany({ course: id })

    // Step 7: Delete the course itself
    await Course.findByIdAndDelete(id)

    // ═══════════════════════════════════════════════════════════════
    // 3. Revalidate paths for the public frontend
    // ═══════════════════════════════════════════════════════════════
    if (slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during delete:', cacheError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedItemCounts: {
          lessons: lessonIds.length,
          course: 1,
        },
      },
      message: 'Course and all related data (lessons, submissions, enrollments, reviews) successfully deleted.',
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/courses/[id] error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Course deletion failed',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while deleting the course. Please check if enrollments exist.',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/courses/[id]
 * Update a course (admin: any, instructor: own only)
 * TASK 6: Validates duration (0-10000 mins) and price (valid positive number)
 * Returns standardized response format
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params

    // 1. Session verification
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
    if (!decoded || !decoded.id) {
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
          message: 'You do not have permission to update courses.',
        },
        { status: 403 }
      )
    }

    // 2. Find course
    const course = await Course.findById(id)
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
          code: 'NOT_FOUND',
          message: 'The requested course does not exist.',
        },
        { status: 404 }
      )
    }

    // Instructor owner verification
    if (user.role === 'instructor' && course.instructor.toString() !== user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'NOT_OWNER',
          message: 'You do not have permission to update this course.',
        },
        { status: 403 }
      )
    }

    // 3. Parse and validate body
    const body = await request.json()
    const {
      title,
      slug,
      summary,
      description,
      price,
      thumbnail,
      category,
      instructor,
      status,
      duration,
      level,
      whatYouWillLearn,
      requirements,
      seo,
      studyMaterials,
      modules,
    } = body

    if (!title || !slug || !summary || !description || price === undefined || !thumbnail || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          code: 'VALIDATION_ERROR',
          message: 'Required fields: title, slug, summary, description, price, thumbnail, category.',
        },
        { status: 400 }
      )
    }

    // TASK 6: Validate duration
    if (duration !== undefined && (duration < 0 || duration > 10000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid duration value',
          code: 'VALIDATION_ERROR',
          message: 'Duration must be between 0 and 10000 minutes.',
        },
        { status: 400 }
      )
    }

    // TASK 6: Validate price
    if (price !== undefined && (price < 0 || !Number.isFinite(price))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid price value',
          code: 'VALIDATION_ERROR',
          message: 'Price must be a valid positive number.',
        },
        { status: 400 }
      )
    }

    // Check slug uniqueness (excluding current course)
    const existingCourse = await Course.findOne({ slug, _id: { $ne: id } }).lean()
    if (existingCourse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate slug',
          code: 'VALIDATION_ERROR',
          message: 'Slug must be unique. A course with this slug already exists.',
        },
        { status: 400 }
      )
    }

    // Capture old slug for revalidation if it changes
    const oldSlug = course.slug

    // 4. Perform Mongoose Update
    course.title = title
    course.slug = slug
    course.summary = summary
    course.description = description
    course.price = Number(price)
    course.thumbnail = thumbnail
    course.category = category
    // Admin can reassign instructors, instructor cannot reassign themselves
    if (user.role === 'admin' && instructor) {
      course.instructor = instructor
    }
    course.status = status || course.status
    course.duration = duration
    course.level = level || course.level
    course.whatYouWillLearn = whatYouWillLearn || []
    course.requirements = requirements || []
    course.seo = seo || {}
    course.studyMaterials = studyMaterials || []
    course.modules = modules || []

    await course.save()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    try {
      revalidatePath('/')
      revalidatePath('/courses')
      revalidatePath('/instructors')
      revalidatePath(`/courses/${course.slug}`)
      if (oldSlug && oldSlug !== course.slug) {
        revalidatePath(`/courses/${oldSlug}`)
      }
    } catch (cacheError) {
      console.error('Failed to revalidate paths during update:', cacheError)
    }

    return NextResponse.json({
      success: true,
      data: { course },
      message: 'Course successfully updated.',
    })
  } catch (error: any) {
    console.error('PUT /api/admin/courses/[id] error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update course',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while updating the course.',
      },
      { status: 500 }
    )
  }
}
