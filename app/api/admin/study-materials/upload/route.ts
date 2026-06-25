import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { rateLimit } from '@/lib/rateLimit'
import path from 'path'

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
    
    const originalName = file.name
    const fileExt = path.extname(originalName)
    const baseName = path.basename(originalName, fileExt)
      .replace(/[^a-zA-Z0-9]/g, '-') // replace non-alphanumeric with hyphen
      .toLowerCase()
    
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const filename = `${baseName}-${uniqueId}${fileExt}`

    const { uploadToStorage } = await import('@/lib/storage')
    const fileUrl = await uploadToStorage(buffer, filename, 'study-materials', file.type || 'application/octet-stream')

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
