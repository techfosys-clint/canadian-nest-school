import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createZoomMeeting } from '@/lib/zoom'
import { saveDeliveryFields } from './saveDelivery'

vi.mock('@/lib/zoom', () => ({ createZoomMeeting: vi.fn() }))
vi.mock('@/lib/db/models/Batch', () => ({ Batch: { exists: async () => true } }))

const batch = '507f1f77bcf86cd799439011'
const previous = {
  lessonType: 'live' as const,
  livePlatform: 'zoom' as const,
  autoGenerateZoom: true,
  liveDate: new Date('2026-11-20T08:00:00Z'),
  liveUrl: 'https://zoom.us/j/123',
  duration: 45,
  order: 4,
}

describe('saving batch Zoom delivery', () => {
  beforeEach(() => vi.mocked(createZoomMeeting).mockReset())

  it('keeps the existing link on an unchanged schedule even if the form submits a blank URL', async () => {
    const delivery = await saveDeliveryFields('course', batch, 'Lesson', { liveUrl: '' }, previous)
    expect(delivery.liveUrl).toBe(previous.liveUrl)
    expect(createZoomMeeting).not.toHaveBeenCalled()
  })

  it('stores the participant link after generating a meeting for a changed schedule', async () => {
    vi.mocked(createZoomMeeting).mockResolvedValue({
      joinUrl: 'https://zoom.us/j/456', startUrl: 'https://zoom.us/s/456', meetingId: '456',
    })
    const delivery = await saveDeliveryFields('course', batch, 'Lesson', {
      liveDate: '2026-11-21T14:00',
    }, previous)
    expect(createZoomMeeting).toHaveBeenCalledWith('Lesson', '2026-11-21T08:00:00.000Z', 45)
    expect(delivery.liveUrl).toBe('https://zoom.us/j/456')
  })

  it('requires a schedule before requesting a meeting', async () => {
    await expect(saveDeliveryFields('course', batch, 'Lesson', { liveDate: '' }, previous))
      .rejects.toThrow('Schedule the live session')
    expect(createZoomMeeting).not.toHaveBeenCalled()
  })

  it('fails the save when Zoom cannot create the meeting', async () => {
    vi.mocked(createZoomMeeting).mockResolvedValue(null)
    await expect(saveDeliveryFields('course', batch, 'Lesson', { duration: 60 }, previous))
      .rejects.toThrow('Could not generate the Zoom meeting')
  })
})
