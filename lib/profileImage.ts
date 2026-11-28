/**
 * Validation for user-uploaded profile photos.
 *
 * The file type is decided from the file's actual bytes, never from the
 * client-supplied name or MIME type, so a file that is really HTML or SVG
 * can't be stored (and later served from our domain) as a "photo".
 */

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export type ProfileImageType = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  ext: '.jpg' | '.png' | '.webp'
}

export function detectImageType(buffer: Buffer): ProfileImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: '.jpg' }
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', ext: '.png' }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: '.webp' }
  }
  return null
}

export type ParsedProfileImage =
  | { ok: true; buffer: Buffer; mimeType: ProfileImageType['mimeType']; ext: ProfileImageType['ext'] }
  | { ok: false; error: string }

/** Decodes a base64 / data-URL upload and checks its size and real type. */
export function parseProfileImage(base64Input: unknown): ParsedProfileImage {
  if (typeof base64Input !== 'string' || !base64Input) {
    return { ok: false, error: 'No image data was received.' }
  }

  const base64 = base64Input.includes(';base64,')
    ? base64Input.slice(base64Input.indexOf(';base64,') + 8)
    : base64Input

  // Reject oversized uploads before decoding them (base64 is ~4/3 the size).
  if (base64.length > Math.ceil((PROFILE_IMAGE_MAX_BYTES * 4) / 3) + 4) {
    return { ok: false, error: 'Profile photo must be 5 MB or smaller.' }
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) {
    return { ok: false, error: 'No image data was received.' }
  }
  if (buffer.length > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, error: 'Profile photo must be 5 MB or smaller.' }
  }

  const type = detectImageType(buffer)
  if (!type) {
    return { ok: false, error: 'Profile photo must be a JPG, PNG or WebP image.' }
  }

  return { ok: true, buffer, ...type }
}
