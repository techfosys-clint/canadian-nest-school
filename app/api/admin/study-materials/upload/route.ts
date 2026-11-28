import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { rateLimit } from '@/lib/rateLimit'
import path from 'path'
import { detectUploadType, STUDY_MATERIAL_KINDS } from '@/lib/uploadTypes'

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff', 'instructor'])
    if (!user) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    const { allowed, resetIn } = rateLimit(`study_material_upload_${user._id}`, 30, 600)
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many uploads. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    // 3. Process file info and paths
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Type comes from the file's real bytes; the uploaded name/MIME is ignored.
    const detected = detectUploadType(buffer)
    if (!detected || !STUDY_MATERIAL_KINDS.includes(detected.kind)) {
      return NextResponse.json(
        { error: 'Unsupported file. Upload a PDF, EPUB, MOBI, Word (DOC/DOCX) or ZIP file.' },
        { status: 400 }
      )
    }

    const originalName = file.name
    const baseName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9]/g, '-') // replace non-alphanumeric with hyphen
      .toLowerCase()
      .slice(0, 80) || 'material'

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const filename = `${baseName}-${uniqueId}${detected.ext}`

    const { uploadToStorage } = await import('@/lib/storage')
    const fileUrl = await uploadToStorage(buffer, filename, 'study-materials', detected.mimeType)

    return NextResponse.json({
      success: true,
      message: 'Study material uploaded and secured successfully.',
      filename,
      url: fileUrl,
    })

  } catch (error: any) {
    console.error('Study Material Upload API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upload study material.' }, { status: 500 })
  }
}
