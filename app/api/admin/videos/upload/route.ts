import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { uploadToStorage } from '@/lib/storage'
import { rateLimit } from '@/lib/rateLimit'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'application/x-mkvideo']

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    // 1. Auth check
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'Session authentication token is missing.',
        },
        { status: 401 }
      )
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
          message: 'Session authentication token is invalid.',
        },
        { status: 401 }
      )
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only admins and instructors can upload videos.',
        },
        { status: 403 }
      )
    }

    const { allowed, resetIn } = rateLimit(`video_upload_${user._id}`, 10, 600)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Too many uploads. Please try again in ${resetIn} seconds.`, code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // 2. Parse form data
    let formData
    try {
      formData = await request.formData()
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 3. Validate file
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large (max ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid video format. Use MP4, WebM, MOV, or MKV',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // 4. Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer())
    const baseName = file.name
      .replace(/\.[^.]+$/, '') // remove extension
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .slice(0, 50) // limit name length

    const uniqueId = Date.now() + '-' + Math.random().toString(36).slice(2, 9)
    const ext = file.name.split('.').pop() || 'mp4'
    const filename = `${baseName}-${uniqueId}.${ext}`

    // uploadToStorage returns R2 object key (not full URL) when folder is 'study-materials'
    const objectKey = await uploadToStorage(buffer, filename, 'study-materials', file.type)

    // Extract just the key (e.g., "study-materials/video-123.mp4" → "videos/video-123.mp4")
    const videoKey = objectKey.includes('/api/study-materials/download?file=')
      ? `videos/${filename}`
      : objectKey

    return NextResponse.json(
      {
        success: true,
        data: {
          objectKey: videoKey,
          filename: filename,
          size: file.size,
          type: file.type,
          message: 'Video uploaded successfully. Use this key in your lesson form.',
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Video upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred during upload.',
      },
      { status: 500 }
    )
  }
}
