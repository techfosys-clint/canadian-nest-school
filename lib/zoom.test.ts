import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createZoomMeeting } from './zoom'

const fetchMock = vi.fn<typeof fetch>()
const start = '2026-11-20T14:00:00+06:00'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('ZOOM_ACCOUNT_ID', 'test-account')
  vi.stubEnv('ZOOM_CLIENT_ID', 'test-client')
  vi.stubEnv('ZOOM_CLIENT_SECRET', 'test-secret')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('automatic Zoom meetings', () => {
  it('authenticates and creates a scheduled meeting with the correct time and duration', async () => {
    const joinUrl = 'https://zoom.us/j/123'
    fetchMock
      .mockResolvedValueOnce(Response.json({ access_token: 'test-token' }))
      .mockResolvedValueOnce(Response.json({ id: 123, join_url: joinUrl, start_url: 'https://zoom.us/s/123' }))

    expect(await createZoomMeeting('Batch class', start, 45)).toMatchObject({ joinUrl, meetingId: '123' })
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://zoom.us/oauth/token', expect.objectContaining({
      method: 'POST',
      body: 'grant_type=account_credentials&account_id=test-account',
    }))
    const [url, options] = fetchMock.mock.calls[1]
    expect(url).toBe('https://api.zoom.us/v2/users/me/meetings')
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-token')
    expect(JSON.parse(String(options?.body))).toMatchObject({
      topic: 'Batch class', type: 2, start_time: '2026-11-20T08:00:00Z', duration: 45,
    })
  })

  it('skips meeting creation when OAuth fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
    expect(await createZoomMeeting('Batch class', start, 45)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([403, 201])('fails when Zoom returns status %s without a join URL', async (status) => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ access_token: 'test-token' }))
      .mockResolvedValueOnce(Response.json({ id: 123 }, { status }))
    expect(await createZoomMeeting('Batch class', start, 45)).toBeNull()
  })
})
