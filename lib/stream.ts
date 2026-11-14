import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Secure DIY video streaming helpers (Cloudflare R2 / S3-compatible).
 *
 * Strategy:
 *  - Recorded lessons whose `videoUrl` is an external embed (YouTube/Vimeo, i.e.
 *    starts with http) keep using the iframe player.
 *  - Recorded lessons whose `videoUrl` is a plain R2 object key (e.g.
 *    "videos/lesson-1.mp4") are streamed through `/api/stream/[lessonId]`,
 *    which only hands out a short-lived signed URL to authenticated, enrolled
 *    students. This blocks link sharing, hotlinking and direct download.
 */

export const isStreamConfigured = !!(
  process.env.S3_ENDPOINT &&
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
)

let streamClient: S3Client | null = null
if (isStreamConfigured) {
  streamClient = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * Returns true when the given videoUrl is an external embed (YouTube/Vimeo/etc.)
 * rather than an R2 object key. External embeds keep the iframe player.
 */
export function isExternalEmbed(videoUrl?: string): boolean {
  if (!videoUrl) return false
  return /^https?:\/\//i.test(videoUrl.trim())
}

/**
 * Normalises a stored videoUrl into an R2 object key. We allow the admin to
 * paste either "videos/lesson-1.mp4" or a leading-slash variant.
 */
export function toObjectKey(videoUrl: string): string {
  return videoUrl.trim().replace(/^\/+/, '')
}

/**
 * Generate a short-lived presigned GET URL for a private R2 object.
 * Default expiry is intentionally small so a leaked URL dies quickly.
 */
export async function getSignedVideoUrl(
  objectKey: string,
  expiresInSeconds = 120
): Promise<string | null> {
  if (!isStreamConfigured || !streamClient) return null
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: toObjectKey(objectKey),
    })
    return await getSignedUrl(streamClient, command, { expiresIn: expiresInSeconds })
  } catch (e) {
    console.error('Failed to generate signed video URL:', e)
    return null
  }
}

/**
 * Fetch a private R2 object server-side (optionally a byte range) so the bytes
 * can be proxied to the browser without ever exposing the R2 URL. Used by the
 * streaming proxy to support seeking via HTTP Range requests.
 */
export async function getVideoObject(objectKey: string, range?: string) {
  if (!isStreamConfigured || !streamClient) return null
  const key = toObjectKey(objectKey)
  const input = { Bucket: process.env.S3_BUCKET!, Key: key, Range: range }
  try {
    return await streamClient.send(new GetObjectCommand(input))
  } catch (error) {
    // Older uploads saved a videos/ key while writing to study-materials/.
    if (!(error instanceof Error) || error.name !== 'NoSuchKey' || !key.startsWith('videos/')) {
      throw error
    }
    return streamClient.send(new GetObjectCommand({
      ...input,
      Key: `study-materials/${key.slice('videos/'.length)}`,
    }))
  }
}

/**
 * Domain restriction: only allow playback requests that originate from our own
 * site. Browsers send Origin (for fetch/XHR) and Referer (for media). We accept
 * the request if either matches one of the allowed hosts.
 */
export function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  // Comma-separated list, e.g. "https://tutorspace.com,https://www.tutorspace.com"
  const configured = (process.env.ALLOWED_STREAM_ORIGINS || process.env.NEXT_PUBLIC_SITE_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // If nothing configured (e.g. local dev), don't block.
  if (configured.length === 0) return true

  const allowedHosts = configured
    .map((u) => {
      try {
        return new URL(u).host
      } catch {
        return ''
      }
    })
    .filter(Boolean)

  const matches = (value: string | null) => {
    if (!value) return false
    try {
      return allowedHosts.includes(new URL(value).host)
    } catch {
      return false
    }
  }

  return matches(origin) || matches(referer)
}
