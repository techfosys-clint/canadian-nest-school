import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import MediaUploadClient from './MediaUploadClient'

export const metadata = {
  title: 'Upload Media - Canadian Nest School Admin',
  description: 'Upload images, videos, and files to the media library.',
}

export const dynamic = 'force-dynamic'

export default async function MediaUploadPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff', 'instructor'].includes(sessionUser.role)) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <MediaUploadClient />
    </div>
  )
}
