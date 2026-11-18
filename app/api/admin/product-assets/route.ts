import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { uploadToStorage } from '@/lib/storage'

export async function POST(request: Request) {
  await connectToDatabase()
  const user = await getAuthorizedUser(['admin', 'staff', 'instructor'])
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    const data = await request.formData()
    const file = data.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose a file.' }, { status: 400 })
    }
    if (data.get('kind') === 'ebook') {
      if (!await getAuthorizedUser(['admin', 'staff'], 'products')) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
      if (file.size > 8 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        return NextResponse.json({ error: 'Use a PNG, JPEG, or WebP up to 8 MB per page.' }, { status: 400 })
      }
      const page = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 })
        .rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
      const url = await uploadToStorage(page, randomUUID() + '.webp', 'ebooks', 'image/webp')
      return NextResponse.json({ url })
    }
    if (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Use an MP4 or WebM up to 25 MB.' }, { status: 400 })
    }
    const ext = file.type === 'video/mp4' ? 'mp4' : 'webm'
    const bytes = Buffer.from(await file.arrayBuffer())
    const valid = ext === 'mp4' ? bytes.toString('ascii', 4, 8) === 'ftyp' : bytes.subarray(0, 4).toString('hex') === '1a45dfa3'
    if (!valid) return NextResponse.json({ error: 'Invalid video file.' }, { status: 400 })
    const url = await uploadToStorage(bytes, `intro-${randomUUID()}.${ext}`, 'media', file.type)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Could not process the upload.' }, { status: 400 })
  }
}
