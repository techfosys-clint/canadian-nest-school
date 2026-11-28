import { describe, expect, it } from 'vitest'
import { detectUploadType } from './uploadTypes'

const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc(80)])

describe('detectUploadType', () => {
  it('detects images', () => {
    expect(detectUploadType(pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))?.ext).toBe('.jpg')
    expect(detectUploadType(pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))?.ext).toBe('.png')
    expect(detectUploadType(pad(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')))?.ext).toBe('.webp')
    expect(detectUploadType(pad(Buffer.from('GIF89a')))?.ext).toBe('.gif')
  })

  it('detects PDFs, Word, EPUB and ZIP', () => {
    expect(detectUploadType(pad(Buffer.from('%PDF-1.7')))?.ext).toBe('.pdf')
    expect(detectUploadType(pad(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])))?.ext).toBe('.doc')
    expect(detectUploadType(pad(Buffer.from('PK\x03\x04....mimetypeapplication/epub+zip', 'latin1')))?.ext).toBe('.epub')
    expect(detectUploadType(pad(Buffer.from('PK\x03\x04....[Content_Types].xml word/document.xml', 'latin1')))?.ext).toBe('.docx')
    expect(detectUploadType(pad(Buffer.from('PK\x03\x04....notes.txt', 'latin1')))?.ext).toBe('.zip')
  })

  it('detects videos', () => {
    expect(detectUploadType(pad(Buffer.from('\0\0\0\x18ftypisom', 'latin1')))?.ext).toBe('.mp4')
    expect(detectUploadType(pad(Buffer.from('\0\0\0\x14ftypqt  ', 'latin1')))?.ext).toBe('.mov')
    expect(detectUploadType(pad(Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('....webm')])))?.ext).toBe('.webm')
  })

  it('rejects HTML, SVG, scripts and plain text', () => {
    expect(detectUploadType(Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>'))).toBeNull()
    expect(detectUploadType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull()
    expect(detectUploadType(Buffer.from('alert(document.cookie)'))).toBeNull()
    expect(detectUploadType(Buffer.from('ab'))).toBeNull()
  })
})
