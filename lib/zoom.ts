export interface ZoomMeetingDetails {
  joinUrl: string
  startUrl: string
  meetingId: string
  password?: string
}

export async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    console.error('Zoom Server-to-Server OAuth credentials missing in environment variables.')
    return null
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const params = new URLSearchParams()
    params.append('grant_type', 'account_credentials')
    params.append('account_id', accountId)

    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Failed to get Zoom access token:', errText)
      return null
    }

    const data = await res.json()
    return data.access_token || null
  } catch (error) {
    console.error('Zoom OAuth access token error:', error)
    return null
  }
}

export async function createZoomMeeting(
  topic: string,
  startTime: string,
  durationMinutes: number
): Promise<ZoomMeetingDetails | null> {
  try {
    const accessToken = await getZoomAccessToken()
    if (!accessToken) {
      return null
    }

    // Convert start time to ISO date string format expected by Zoom
    const formattedStartTime = new Date(startTime).toISOString().replace('.000', '')

    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic,
        type: 2, // Scheduled meeting
        start_time: formattedStartTime,
        duration: durationMinutes || 60,
        timezone: 'Asia/Dhaka',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          approval_type: 2, // No approval required
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Zoom Meeting creation API error:', errText)
      return null
    }

    const data = await res.json()
    if (typeof data.join_url !== 'string' || !data.join_url.startsWith('https://') || !data.id) {
      console.error('Zoom returned a meeting without a valid join URL or meeting ID.')
      return null
    }
    return {
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: String(data.id),
      password: data.password || '',
    }
  } catch (error) {
    console.error('Failed to create Zoom meeting:', error)
    return null
  }
}
