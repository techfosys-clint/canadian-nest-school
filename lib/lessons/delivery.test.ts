import { describe, expect, it } from 'vitest'
import { isLessonAvailable, listLiveDeliveries, resolveLessonDelivery } from './delivery'

const lesson = {
  title: 'Introduction',
  lessonType: 'recorded' as const,
  videoUrl: 'videos/shared.mp4',
  autoGenerateZoom: false,
  order: 1,
  duration: 30,
  batchSettings: [
    { batch: 'a', lessonType: 'live' as const, liveUrl: 'https://example.com/a', order: 4, duration: 50 },
    { batch: 'b', lessonType: 'recorded' as const, videoUrl: 'videos/b.mp4', order: 7, duration: 25 },
  ],
}

describe('lesson delivery', () => {
  it('uses each batch’s delivery and keeps the shared title', () => {
    expect(resolveLessonDelivery(lesson, 'a')).toMatchObject({
      title: 'Introduction', lessonType: 'live', videoUrl: undefined, order: 4, duration: 50,
    })
    expect(resolveLessonDelivery({ ...lesson, title: 'Updated title' }, 'b')).toMatchObject({
      title: 'Updated title', lessonType: 'recorded', videoUrl: 'videos/b.mp4', liveUrl: undefined,
      order: 7, duration: 25,
    })
    expect(listLiveDeliveries(lesson)).toMatchObject([{ deliveryBatchId: 'a' }])
  })

  it('uses the default only when it exists and no batch override applies', () => {
    expect(resolveLessonDelivery(lesson, 'c')?.videoUrl).toBe('videos/shared.mp4')
    const batchOnly = { ...lesson, hasDefaultDelivery: false }
    expect(resolveLessonDelivery(batchOnly, 'c')).toBeNull()
    expect(resolveLessonDelivery(batchOnly)).toBeNull()
    expect(isLessonAvailable(batchOnly, 'a')).toBe(true)
    expect(isLessonAvailable(batchOnly, 'c')).toBe(false)
  })

  it('preserves a legacy batch lesson’s original visibility', () => {
    const legacy = { ...lesson, batch: 'legacy', batchSettings: undefined }
    expect(resolveLessonDelivery(legacy, 'legacy')?.videoUrl).toBe('videos/shared.mp4')
    expect(resolveLessonDelivery(legacy, 'a')).toBeNull()
    expect(resolveLessonDelivery(legacy)).toBeNull()
  })
})
