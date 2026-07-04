import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { createZoomMeeting } from '@/lib/zoom'
import { parseBdDate } from '@/lib/bdTime'
import { revalidatePath } from 'next/cache'

async function authCheck() {
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) return null
  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) return null
  return await User.findById(decoded.id).lean()
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    const user = await authCheck()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    if (!['admin', 'instructor'].includes(user.role)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const lesson = await Lesson.findById(id)
    if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 })

    // Ownership check
    const course = await Course.findById(lesson.course).lean()
    if (user.role === 'instructor' && (course as any)?.instructor.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Not your course.' }, { status: 403 })
    }

    const body = await request.json()

    const finalLessonType = body.lessonType ?? lesson.lessonType
    const finalLivePlatform = body.livePlatform ?? lesson.livePlatform
    const finalAutoGenerateZoom = body.autoGenerateZoom ?? lesson.autoGenerateZoom
    const finalLiveDate = body.liveDate ? parseBdDate(body.liveDate) : lesson.liveDate
    const finalTitle = body.title ?? lesson.title
    const finalDuration = body.duration ? Number(body.duration) : lesson.duration

    let finalLiveUrl = body.liveUrl ?? lesson.liveUrl

    const shouldGenerateZoom = 
      finalLessonType === 'live' &&
      finalLivePlatform === 'zoom' &&
      finalAutoGenerateZoom &&
      (
        !lesson.liveUrl || 
        !lesson.autoGenerateZoom ||
        (body.liveDate && parseBdDate(body.liveDate).getTime() !== new Date(lesson.liveDate).getTime()) ||
        (body.title && body.title !== lesson.title)
      )

    if (shouldGenerateZoom) {
      if (!finalLiveDate) {
        return NextResponse.json({ error: 'Scheduled Time & Date is required to auto-generate a Zoom meeting.' }, { status: 400 })
      }

      const zoomDetails = await createZoomMeeting(finalTitle, finalLiveDate.toISOString(), finalDuration || 60)
      if (!zoomDetails) {
        return NextResponse.json({ error: 'Failed to auto-generate Zoom meeting link. Please verify your Zoom credentials.' }, { status: 500 })
      }
      finalLiveUrl = zoomDetails.joinUrl
    }

    Object.assign(lesson, {
      title: finalTitle,
      slug: body.slug ?? lesson.slug,
      // order (course-wide serial) is server-managed and never editable
      moduleOrder: body.moduleOrder ? Number(body.moduleOrder) : lesson.moduleOrder,
      moduleName: body.moduleName ?? lesson.moduleName,
      lessonType: finalLessonType,
      videoUrl: body.videoUrl ?? lesson.videoUrl,
      livePlatform: finalLivePlatform,
      liveUrl: finalLiveUrl,
      liveDate: finalLiveDate,
      content: body.content ?? lesson.content,
      duration: finalDuration,
      isPreviewable: body.isPreviewable ?? lesson.isPreviewable,
      autoGenerateZoom: finalAutoGenerateZoom,
      quizQuestions: finalLessonType === 'quiz' ? (body.quizQuestions ?? lesson.quizQuestions) : undefined,
    })
    await lesson.save()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    if (course && (course as any).slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${(course as any).slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during lesson update:', cacheError)
      }
    }

    return NextResponse.json({ success: true, lesson })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update lesson.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    const user = await authCheck()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    if (!['admin', 'instructor'].includes(user.role)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const lesson = await Lesson.findById(id)
    if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 })

    // Fetch course details before deleting to get its slug for revalidation
    const course = await Course.findById(lesson.course).lean()
    const slug = (course as any)?.slug

    // Ownership check
    if (user.role === 'instructor') {
      if ((course as any)?.instructor.toString() !== user._id.toString()) {
        return NextResponse.json({ error: 'Forbidden: Not your course.' }, { status: 403 })
      }
    }

    await lesson.deleteOne()

    // Revalidate paths for the public frontend to ensure changes are immediately visible
    if (slug) {
      try {
        revalidatePath('/')
        revalidatePath('/courses')
        revalidatePath('/instructors')
        revalidatePath(`/courses/${slug}`)
      } catch (cacheError) {
        console.error('Failed to revalidate paths during lesson deletion:', cacheError)
      }
    }

    return NextResponse.json({ success: true, message: 'Lesson deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete lesson.' }, { status: 500 })
  }
}
