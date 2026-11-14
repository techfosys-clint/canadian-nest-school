import { isValidObjectId } from 'mongoose'
import { Batch } from '@/lib/db/models/Batch'
import { Counter } from '@/lib/db/models/Counter'
import { Lesson, type ILesson, type ILessonBatchSettings } from '@/lib/db/models/Lesson'
import { parseBdDate } from '@/lib/bdTime'
import { createZoomMeeting } from '@/lib/zoom'

export class LessonDeliveryError extends Error {}

export async function allocateLessonOrder(course: string, batch?: string) {
  const lessons = await Lesson.find({ course }).select('order batch hasDefaultDelivery batchSettings.order batchSettings.batch').lean()
  const max = lessons.reduce((highest: number, lesson: ILesson) => {
    const order = batch
      ? lesson.batchSettings?.find((item) => String(item.batch) === batch)?.order ??
        (lesson.hasDefaultDelivery !== false && (!lesson.batch || String(lesson.batch) === batch)
          ? lesson.order
          : 0)
      : Math.max(lesson.order, ...(lesson.batchSettings ?? []).map((item) => item.order))
    return Math.max(highest, order)
  }, 0)
  const key = `lesson_order_${course}_${batch || 'default'}`
  await Counter.updateOne({ _id: key }, { $max: { seq: max } }, { upsert: true }).catch(async (error: unknown) => {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 11000) throw error
    await Counter.updateOne({ _id: key }, { $max: { seq: max } })
  })
  const counter = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true })
  if (!counter) throw new Error('Could not allocate lecture order.')
  return counter.seq
}

type DeliveryInput = {
  lessonType?: ILesson['lessonType']
  duration?: number
  videoUrl?: string
  livePlatform?: ILesson['livePlatform']
  liveDate?: string
  liveUrl?: string
  autoGenerateZoom?: boolean
}

export async function saveDeliveryFields(
  course: string,
  batch: string | null,
  title: string,
  body: DeliveryInput,
  previous?: Omit<ILessonBatchSettings, 'batch'>,
) {
  if (batch && (!isValidObjectId(batch) || !(await Batch.exists({ _id: batch, course })))) {
    throw new LessonDeliveryError('Select a batch belonging to this course.')
  }
  const lessonType = body.lessonType ?? previous?.lessonType ?? 'recorded'
  const duration = Number(body.duration ?? previous?.duration)
  if (!['recorded', 'live', 'quiz', 'assignment'].includes(lessonType) ||
      !Number.isInteger(duration) || duration < 1) {
    throw new LessonDeliveryError('Select a lesson format and enter a positive duration in minutes.')
  }
  const livePlatform = lessonType === 'live' ? body.livePlatform ?? previous?.livePlatform ?? 'zoom' : undefined
  if (livePlatform && !['zoom', 'meet', 'teams', 'other'].includes(livePlatform)) {
    throw new LessonDeliveryError('Select a supported live platform.')
  }
  const liveDate = lessonType === 'live'
    ? body.liveDate === undefined ? previous?.liveDate : body.liveDate ? parseBdDate(body.liveDate) : undefined
    : undefined
  if (liveDate && !Number.isFinite(liveDate.getTime())) {
    throw new LessonDeliveryError('Enter a valid live session date.')
  }
  let liveUrl = lessonType === 'live' ? body.liveUrl ?? previous?.liveUrl : undefined
  const autoGenerateZoom = livePlatform === 'zoom' && (body.autoGenerateZoom ?? previous?.autoGenerateZoom ?? false)
  if (autoGenerateZoom) {
    if (!liveDate) throw new LessonDeliveryError('Schedule the live session before generating a Zoom meeting.')
    if (previous?.autoGenerateZoom && previous.liveUrl &&
        liveDate.getTime() === previous.liveDate?.getTime() && duration === previous.duration) {
      liveUrl = previous.liveUrl
    } else {
      const meeting = await createZoomMeeting(title, liveDate.toISOString(), duration)
      if (!meeting) throw new Error('Could not generate the Zoom meeting. Verify your Zoom credentials.')
      liveUrl = meeting.joinUrl
    }
  }
  return {
    lessonType,
    duration,
    videoUrl: lessonType === 'recorded' ? body.videoUrl ?? previous?.videoUrl : undefined,
    livePlatform,
    liveDate,
    liveUrl,
    autoGenerateZoom,
    reminderSent: Boolean(previous?.reminderSent && previous.liveUrl === liveUrl &&
      previous.liveDate?.getTime() === liveDate?.getTime()),
    order: previous?.order ?? await allocateLessonOrder(course, batch ?? undefined),
  }
}
