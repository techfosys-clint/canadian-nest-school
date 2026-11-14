import type { ILesson } from '@/lib/db/models/Lesson'

type DeliveryFields = Pick<ILesson,
  'batch' | 'batchSettings' | 'hasDefaultDelivery' | 'lessonType' | 'videoUrl' |
  'livePlatform' | 'liveUrl' | 'liveDate' | 'autoGenerateZoom' | 'reminderSent' |
  'duration' | 'order'
>

export const liveLessonQuery = {
  $or: [{ lessonType: 'live' }, { 'batchSettings.lessonType': 'live' }],
}

export function isLessonAvailable(
  lesson: Pick<DeliveryFields, 'batch' | 'batchSettings' | 'hasDefaultDelivery'>,
  batchId?: string | null,
) {
  return Boolean(batchId && lesson.batchSettings?.some((item) => String(item.batch) === batchId)) ||
    (lesson.hasDefaultDelivery !== false && (!lesson.batch || String(lesson.batch) === batchId))
}

export function resolveLessonDelivery<T extends DeliveryFields>(lesson: T, batchId?: string | null) {
  const settings = batchId && lesson.batchSettings?.find((item) => String(item.batch) === batchId)
  if (settings) {
    return {
      ...lesson,
      batch: undefined,
      lessonType: settings.lessonType,
      videoUrl: settings.videoUrl,
      livePlatform: settings.livePlatform,
      liveUrl: settings.liveUrl,
      liveDate: settings.liveDate,
      autoGenerateZoom: settings.autoGenerateZoom,
      reminderSent: settings.reminderSent,
      duration: settings.duration,
      order: settings.order,
      deliveryBatchId: batchId,
    }
  }
  if (!isLessonAvailable(lesson, batchId)) return null
  return { ...lesson, deliveryBatchId: lesson.batch ? String(lesson.batch) : undefined }
}

export function listLiveDeliveries<T extends DeliveryFields>(lesson: T) {
  const batches = new Set([
    lesson.batch ? String(lesson.batch) : null,
    ...(lesson.batchSettings ?? []).map((item) => String(item.batch)),
  ])
  return [...batches].flatMap((batchId) => {
    const delivery = resolveLessonDelivery(lesson, batchId)
    return delivery?.lessonType === 'live' ? [delivery] : []
  })
}
