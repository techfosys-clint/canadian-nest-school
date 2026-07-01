import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * GET /api/admin/courses
 * Fetch all courses (admin: all, instructor: own)
 * Returns standardized response format
 */
export async function GET(request: Request) {
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
    if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource.',
        },
        { status: 403 }
      )
    }

    let query = {}
    if (user.role === 'instructor') {
      query = { instructor: user._id }
    }

    const courses = await Course.find(query).select('title _id').sort({ title: 1 }).lean()

    return NextResponse.json({
      success: true,
      data: { courses },
    })
  } catch (error: any) {
    console.error('GET /api/admin/courses error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch courses',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while fetching courses.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/courses
 * Create a new course with validation
 * TASK 6: Validates duration (0-10000 mins) and price (valid positive number)
 * Returns standardized response format
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()

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
          message: 'You do not have permission to create courses.',
        },
        { status: 403 }
      )
    }

    // 2. Parse and validate parameters
    const body = await request.json()
    const {
      title,
      slug,
      summary,
      description,
      price,
      thumbnail,
      categories,
      instructors,
      status,
      duration,
      level,
      whatYouWillLearn,
      requirements,
      seo,
      studyMaterials,
      modules,
    } = body

    if (!title || !slug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          code: 'VALIDATION_ERROR',
          message: 'Required fields: title, slug.',
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

    // Check slug uniqueness
    const existingCourse = await Course.findOne({ slug }).lean()
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

    // Force instructor ID for instructor role
    const finalInstructors = user.role === 'instructor' ? [user._id.toString()] : (instructors?.length ? instructors : [user._id.toString()])

    // 3. Create course document
    const finalCategories = categories || []
    const newCourse = new Course({
      title,
      slug,
      summary,
      description,
      price: price ? Number(price) : undefined,
      thumbnail,
      categories: finalCategories,
      category: finalCategories[0] || undefined,
      instructors: finalInstructors,
      instructor: finalInstructors[0] || undefined,
      status: status || 'draft',
      duration,
      level: level || 'all',
      whatYouWillLearn: whatYouWillLearn || [],
      requirements: requirements || [],
      seo: seo || {},
      studyMaterials: studyMaterials || [],
      modules: modules || [],
    })

    await newCourse.save()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    try {
      revalidatePath('/')
      revalidatePath('/courses')
      revalidatePath('/instructors')
      revalidatePath(`/courses/${slug}`)
    } catch (cacheError) {
      console.error('Failed to revalidate paths:', cacheError)
    }

    return NextResponse.json(
      {
        success: true,
        data: { course: newCourse },
        message: 'Course successfully created.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/admin/courses error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create course',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while creating the course.',
      },
      { status: 500 }
    )
  }
}
