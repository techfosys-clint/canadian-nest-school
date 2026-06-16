import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import LiveClassesPageClient from './LiveClassesPageClient'

export const metadata = {
  title: 'Scheduled Live Classes - Tutor Space Admin',
  description: 'Manage and coordinate all active interactive live lectures.',
}

export default async function LiveClassesPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'instructor'].includes(sessionUser.role)) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <LiveClassesPageClient />
    </div>
  )
}
