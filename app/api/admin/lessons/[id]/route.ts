import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { LessonDeliveryError, saveDeliveryFields } from '@/lib/lessons/saveDelivery'
import type { ILessonBatchSettings } from '@/lib/db/models/Lesson'
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
    if (user.role === 'instructor' && (course as any)?.instructor?.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Not your course.' }, { status: 403 })
    }

    const body = await request.json()
    if (body.course && String(body.course) !== String(lesson.course)) {
      return NextResponse.json({ error: 'A saved lesson belongs to its original course.' }, { status: 400 })
    }

    const title = body.title ?? lesson.title
    const batch = body.batch === undefined ? lesson.batch?.toString() || null : body.batch || null
    const existing = lesson.batchSettings?.find((item: ILessonBatchSettings) => String(item.batch) === batch)
    const legacyBatch = lesson.batch?.toString()
    const previous = existing ?? (
      (batch && batch === legacyBatch) ||
      (!batch && !legacyBatch && lesson.hasDefaultDelivery !== false)
        ? lesson
        : undefined
    )
    if (!batch && legacyBatch) {
      return NextResponse.json({ error: 'Save the original batch settings before adding a default.' }, { status: 409 })
    }
    const delivery = await saveDeliveryFields(String(lesson.course), batch, title, body, previous)
    const shared = {
      title,
      slug: body.slug ?? lesson.slug,
      moduleOrder: body.moduleOrder ? Number(body.moduleOrder) : lesson.moduleOrder,
      moduleName: body.moduleName ?? lesson.moduleName,
      content: body.content ?? lesson.content,
      isPreviewable: body.isPreviewable ?? lesson.isPreviewable,
      quizQuestions: body.quizQuestions ?? lesson.quizQuestions,
      totalMarks: body.totalMarks ?? lesson.totalMarks,
    }

    // Replace only the selected configuration and keep other batch saves intact.
    if (batch) {
      const settings = { batch, ...delivery }
      const legacyScope = legacyBatch === batch
        ? { batch: null, hasDefaultDelivery: false }
        : {}
      const updated = await Lesson.updateOne(
        { _id: id, 'batchSettings.batch': batch },
        { $set: { ...shared, ...legacyScope, 'batchSettings.$': settings } },
        { runValidators: true },
      )
      if (!updated.matchedCount) {
        const inserted = await Lesson.updateOne(
          { _id: id, 'batchSettings.batch': { $ne: batch } },
          { $set: { ...shared, ...legacyScope }, $push: { batchSettings: settings } },
          { runValidators: true },
        )
        if (!inserted.matchedCount) {
          return NextResponse.json({ error: 'This batch configuration changed. Reload and try again.' }, { status: 409 })
        }
      }
    } else {
      Object.assign(lesson, shared, delivery, { hasDefaultDelivery: true })
      await lesson.save()
    }

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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof LessonDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
      if ((course as any)?.instructor?.toString() !== user._id.toString()) {
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
