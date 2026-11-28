import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/db/models/ContactMessage'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { formatBdDateTime } from '@/lib/bdTime'
import { getContactInboxEmail } from '@/lib/email'
import MessagesPageClient from './MessagesPageClient'

export const metadata = {
  title: 'Contact Messages - Canadian Nest School Admin',
}

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')
  if (
    sessionUser.role === 'staff' &&
    !((sessionUser as any).permissions || []).includes('messages')
  ) {
    redirect('/admin')
  }

  const docs = await ContactMessage.find().sort({ createdAt: -1 }).limit(500).lean()
  const messages = docs.map((m: any) => ({
    id: m._id.toString(),
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    locale: m.locale === 'en' ? 'en' : 'bn',
    emailSent: !!m.emailSent,
    handled: !!m.handled,
    receivedAt: formatBdDateTime(m.createdAt, { month: 'short' }),
  })) as Array<{
    id: string
    name: string
    email: string
    subject: string
    message: string
    locale: 'bn' | 'en'
    emailSent: boolean
    handled: boolean
    receivedAt: string
  }>

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <MessagesPageClient initialMessages={messages} inboxEmail={getContactInboxEmail()} />
    </div>
  )
}
