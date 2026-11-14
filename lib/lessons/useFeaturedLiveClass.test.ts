import { expect, it } from 'vitest'
import { selectFeaturedLiveClass } from './useFeaturedLiveClass'

it('advances to the next class as soon as the current class ends', () => {
  const morning = { liveDate: '2026-11-14T10:00:00+06:00', duration: 30 }
  const afternoon = { liveDate: '2026-11-14T14:00:00+06:00', duration: 60 }
  const sessions = [afternoon, morning]

  expect(selectFeaturedLiveClass(sessions, Date.parse('2026-11-14T10:29:59+06:00'))).toBe(morning)
  expect(selectFeaturedLiveClass(sessions, Date.parse('2026-11-14T10:30:00+06:00'))).toBe(afternoon)
  expect(selectFeaturedLiveClass(sessions, Date.parse('2026-11-14T15:00:00+06:00'))).toBeNull()
})
