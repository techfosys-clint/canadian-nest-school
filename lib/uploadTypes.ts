/**
 * Identifies an uploaded file from its actual bytes ("magic numbers"), so the
 * stored name and MIME type never come from what the uploader claims. This
 * stops HTML, SVG or script files being uploaded under an image/PDF name and
 * then served from our own domain.
 */

export type DetectedFile = {
  kind: 'image' | 'video' | 'pdf' | 'document' | 'archive'
  mimeType: string
  ext: string
}

function ascii(buffer: Buffer, start: number, end: number) {
  return buffer.length >= end ? buffer.subarray(start, end).toString('ascii') : ''
}

export function detectUploadType(buffer: Buffer): DetectedFile | null {
  if (buffer.length < 4) return null

  // Images
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: 'image', mimeType: 'image/jpeg', ext: '.jpg' }
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', mimeType: 'image/png', ext: '.png' }
  }
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') {
    return { kind: 'image', mimeType: 'image/webp', ext: '.webp' }
  }
  if (ascii(buffer, 0, 6) === 'GIF87a' || ascii(buffer, 0, 6) === 'GIF89a') {
    return { kind: 'image', mimeType: 'image/gif', ext: '.gif' }
  }

  // Documents
  if (ascii(buffer, 0, 5) === '%PDF-') {
    return { kind: 'pdf', mimeType: 'application/pdf', ext: '.pdf' }
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return { kind: 'document', mimeType: 'application/msword', ext: '.doc' }
  }
  if (ascii(buffer, 60, 68) === 'BOOKMOBI') {
    return { kind: 'document', mimeType: 'application/x-mobipocket-ebook', ext: '.mobi' }
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05)) {
    // ZIP container: EPUB and DOCX are ZIPs too; tell them apart by contents.
    const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('latin1')
    if (head.includes('mimetypeapplication/epub+zip')) {
      return { kind: 'document', mimeType: 'application/epub+zip', ext: '.epub' }
    }
    if (head.includes('word/') || head.includes('[Content_Types].xml')) {
      return {
        kind: 'document',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: '.docx',
      }
    }
    return { kind: 'archive', mimeType: 'application/zip', ext: '.zip' }
  }

  // Video
  if (ascii(buffer, 4, 8) === 'ftyp') {
    const brand = ascii(buffer, 8, 12)
    if (brand === 'qt  ') return { kind: 'video', mimeType: 'video/quicktime', ext: '.mov' }
    return { kind: 'video', mimeType: 'video/mp4', ext: '.mp4' }
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    const head = buffer.subarray(0, Math.min(buffer.length, 64)).toString('latin1')
    return head.includes('webm')
      ? { kind: 'video', mimeType: 'video/webm', ext: '.webm' }
      : { kind: 'video', mimeType: 'video/x-matroska', ext: '.mkv' }
  }

  return null
}

/** Media library: images, short videos and PDFs (never SVG/HTML). */
export const MEDIA_KINDS: DetectedFile['kind'][] = ['image', 'video', 'pdf']

/** Study materials: PDFs, e-books, Word documents and ZIP bundles. */
export const STUDY_MATERIAL_KINDS: DetectedFile['kind'][] = ['pdf', 'document', 'archive']

/** Lesson videos. */
export const VIDEO_KINDS: DetectedFile['kind'][] = ['video']
