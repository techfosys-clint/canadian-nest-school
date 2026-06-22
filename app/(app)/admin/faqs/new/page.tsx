import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import FAQFormClient from '../FAQFormClient'

export const metadata = {
  title: 'Create FAQ - Canadian Nest School Admin',
  description: 'Create a new landing page FAQ document.',
}

export default async function NewFAQPage() {
  // Session verification
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id) {
    redirect('/login')
  }

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <FAQFormClient />
    </div>
  )
}
