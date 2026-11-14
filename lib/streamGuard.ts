import { resolveLessonDelivery } from '@/lib/lessons/delivery'
import { getLearningSession } from '@/lib/auth/learningSession'
import { getEnrollmentPreview } from '@/lib/auth/enrollmentPreview'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { WatchSession } from '@/lib/db/models/WatchSession'
import { assertCourseContentAccess } from '@/lib/subscriptions/access'
import { isExternalEmbed, isAllowedOrigin, isStreamConfigured } from '@/lib/stream'

const MAX_DEVICES = Number(process.env.STREAM_MAX_DEVICES || 2)
const ACTIVE_WINDOW_MS = 5 * 60 * 1000 // a device counts as active if seen in last 5 min

export type GuardResult =
  | { ok: true; objectKey: string; userId: string }
  | { ok: false; status: number; error: string; code?: string }

/**
 * Central authorization for video streaming. Verifies domain, login, lesson,
 * enrollment and (optionally) the concurrent-device limit. Returns the R2
 * object key to stream when access is granted.
 *
 * Both the lightweight "authorize" endpoint and the byte-proxy endpoint call
 * this so the rules stay in one place.
 */
export async function guardStream(
  request: Request,
  lessonId: string,
  opts: { registerSession?: boolean } = {}
): Promise<GuardResult> {
  // 1. Domain restriction (Origin for fetch, Referer for <video> media GETs)
  if (!isAllowedOrigin(request.headers.get('origin'), request.headers.get('referer'))) {
    return { ok: false, status: 403, error: 'Forbidden origin.' }
  }

  if (!isStreamConfigured) {
    return { ok: false, status: 503, error: 'Video storage is not configured.' }
  }

  await connectToDatabase()

  // 2. Authentication
  const url = new URL(request.url)
  const previewId = url.searchParams.get('preview')
  const preview = previewId ? await getEnrollmentPreview(previewId) : null
  if (previewId && !preview) {
    return { ok: false, status: 403, error: 'Admin preview is unavailable.' }
  }
  const userId = preview ? preview.admin.id : (await getLearningSession())?.account.id
  if (!userId) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }

  // 3. Lesson + video key
  const lesson = (await Lesson.findById(lessonId).lean()) as any
  if (!lesson) {
    return { ok: false, status: 404, error: 'Lesson not found.' }
  }
  let batchId: string | undefined
  if (preview) {
    if (String(preview.enrollment.course) !== String(lesson.course)) {
      return { ok: false, status: 403, error: 'This lesson is outside the preview enrollment.' }
    }
    batchId = preview.enrollment.batch?.toString()
  } else if (!lesson.isPreviewable || lesson.batch || lesson.hasDefaultDelivery === false || lesson.batchSettings?.length) {
    const access = await assertCourseContentAccess(userId, String(lesson.course))
    if (access.allowed) {
      batchId = access.enrollment?.batch?.toString()
    } else if (!lesson.isPreviewable || !resolveLessonDelivery(lesson)) {
      const error = access.reason === 'SUBSCRIPTION_BLOCKED'
        ? 'Renew your subscription to continue watching.'
        : 'A completed enrollment is required to watch this lesson.'
      return { ok: false, status: 403, error }
    }
  }

  const delivery = resolveLessonDelivery(lesson, batchId)
  if (!delivery) {
    return { ok: false, status: 403, error: 'This lesson is unavailable for your batch.' }
  }
  if (delivery.lessonType !== 'recorded' || !delivery.videoUrl) {
    return { ok: false, status: 400, error: 'This lesson has no streamable video.' }
  }
  if (isExternalEmbed(delivery.videoUrl)) {
    return { ok: false, status: 400, error: 'This lesson uses an external player.' }
  }

  // 5. Concurrent-device limit (only when explicitly registering a session,
  //    so frequent Range requests on the proxy don't hammer the DB)
  if (opts.registerSession && !preview) {
    const deviceId = (url.searchParams.get('d') || request.headers.get('x-device-id') || '').trim()
    if (deviceId) {
      const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS)
      const activeSessions = await WatchSession.find({
        user: userId,
        lastSeen: { $gte: cutoff },
      }).lean()

      const activeDeviceIds = new Set(activeSessions.map((s: any) => s.deviceId))
      if (!activeDeviceIds.has(deviceId) && activeDeviceIds.size >= MAX_DEVICES) {
        return {
          ok: false,
          status: 429,
          code: 'DEVICE_LIMIT',
          error: `Device limit reached. You can stream on at most ${MAX_DEVICES} device(s) at a time. Stop playback on another device and try again.`,
        }
      }

      await WatchSession.updateOne(
        { user: userId, deviceId },
        { $set: { lastSeen: new Date(), userAgent: request.headers.get('user-agent') || undefined } },
        { upsert: true }
      )
    }
  }

  return { ok: true, objectKey: delivery.videoUrl, userId }
}
