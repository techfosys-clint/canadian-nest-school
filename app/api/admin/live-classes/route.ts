import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Course } from '@/lib/db/models/Course'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff', 'instructor'], 'live-classes')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const lessonsQuery: any = { lessonType: 'live' }

    if (user.role === 'instructor') {
      // Instructors only see live classes in their assigned courses (regardless of who created the lesson)
      const instructorCourses = await Course.find({ instructor: user._id }).select('_id').lean()
      const courseIds = instructorCourses.map((c) => c._id)
      lessonsQuery.course = { $in: courseIds }
    }

    const liveLessons = await Lesson.find(lessonsQuery)
      .populate({ path: 'course', select: 'title' })
      .sort({ liveDate: 1 })
      .lean()

    const serializedLessons = (liveLessons as any[]).map((l: any) => ({
      id: l._id.toString(),
      title: l.title,
      slug: l.slug,
      courseTitle: l.course?.title || 'Unknown Course',
      livePlatform: l.livePlatform || 'zoom',
      liveUrl: l.liveUrl || '',
      liveDate: l.liveDate ? l.liveDate.toISOString() : null,
      duration: l.duration || 60,
      autoGenerateZoom: l.autoGenerateZoom || false,
    }))

    return NextResponse.json({ success: true, liveLessons: serializedLessons })
  } catch (error: any) {
    console.error('Fetch Live Classes API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch live classes.' }, { status: 500 })
  }
}
