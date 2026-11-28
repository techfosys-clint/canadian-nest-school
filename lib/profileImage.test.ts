import { describe, expect, it } from 'vitest'
import { PROFILE_IMAGE_MAX_BYTES, detectImageType, parseProfileImage } from './profileImage'

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')])

describe('detectImageType', () => {
  it('recognises JPG, PNG and WebP by their bytes', () => {
    expect(detectImageType(jpeg)?.mimeType).toBe('image/jpeg')
    expect(detectImageType(png)?.mimeType).toBe('image/png')
    expect(detectImageType(webp)?.mimeType).toBe('image/webp')
  })

  it('rejects HTML, SVG and GIF content', () => {
    expect(detectImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull()
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull()
  })
})

describe('parseProfileImage', () => {
  it('accepts a data URL and takes the type from the content', () => {
    const result = parseProfileImage(`data:text/html;base64,${png.toString('base64')}`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('image/png')
      expect(result.ext).toBe('.png')
    }
  })

  it('accepts plain base64 without a data-URL prefix', () => {
    expect(parseProfileImage(jpeg.toString('base64')).ok).toBe(true)
  })

  it('rejects a disguised HTML file', () => {
    const html = Buffer.from('<html><body>hi</body></html>').toString('base64')
    const result = parseProfileImage(`data:image/png;base64,${html}`)
    expect(result).toEqual({ ok: false, error: 'Profile photo must be a JPG, PNG or WebP image.' })
  })

  it('rejects files over 5 MB', () => {
    const big = Buffer.concat([jpeg, Buffer.alloc(PROFILE_IMAGE_MAX_BYTES)]).toString('base64')
    expect(parseProfileImage(big)).toEqual({ ok: false, error: 'Profile photo must be 5 MB or smaller.' })
  })

  it('rejects missing or empty data', () => {
    expect(parseProfileImage(undefined).ok).toBe(false)
    expect(parseProfileImage('').ok).toBe(false)
    expect(parseProfileImage('data:image/png;base64,').ok).toBe(false)
  })
})
