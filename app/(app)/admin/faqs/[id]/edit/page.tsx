import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { FAQ } from '@/lib/db/models/FAQ'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import FAQFormClient from '../../FAQFormClient'

export const metadata = {
  title: 'Edit FAQ - Canadian Nest School Admin',
  description: 'Edit a landing page FAQ answer.',
}

type Props = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditFAQPage({ params }: Props) {
  await connectToDatabase()
  const { id } = await params

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

  // Fetch FAQ document
  const faqDoc = await FAQ.findById(id).lean()
  if (!faqDoc) notFound()

  const serializedFAQ = {
    id: faqDoc._id.toString(),
    question: faqDoc.question,
    answer: faqDoc.answer,
    order: faqDoc.order || 0,
    isActive: faqDoc.isActive ?? true,
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <FAQFormClient initialData={serializedFAQ} />
    </div>
  )
}
