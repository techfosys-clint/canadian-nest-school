import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Media } from '@/lib/db/models/Media'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import MediaLibraryClient from './MediaLibraryClient'

export const metadata = {
  title: 'Media Library - Canadian Nest School Admin',
  description: 'Browse and manage all uploaded media assets.',
}

export const dynamic = 'force-dynamic'

export default async function MediaPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff', 'instructor'].includes(sessionUser.role)) redirect('/login')

  const mediaDocs = await Media.find().sort({ createdAt: -1 }).lean()
  const mediaItems = (mediaDocs as any[]).map(m => ({
    id: m._id.toString(),
    filename: m.filename,
    url: m.url || '',
    alt: m.alt,
    mimeType: m.mimeType,
    filesize: m.filesize || 0,
    width: m.width || null,
    height: m.height || null,
    thumbnailUrl: m.sizes?.thumbnail?.url || m.sizes?.card?.url || m.url || '',
    createdAt: m.createdAt ? m.createdAt.toISOString() : '',
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <MediaLibraryClient initialMedia={mediaItems} />
    </div>
  )
}
