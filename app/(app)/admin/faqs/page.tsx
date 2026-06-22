import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { FAQ } from '@/lib/db/models/FAQ'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import FAQsPageClient from './FAQsPageClient'

export const metadata = {
  title: 'FAQs Management - Canadian Nest School Admin',
}

export default async function FAQsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const faqsDocs = await FAQ.find().sort({ order: 1, createdAt: 1 }).lean()
  const faqs = faqsDocs.map((f: any) => ({
    id: f._id.toString(), question: f.question, answer: f.answer, order: f.order, isActive: f.isActive,
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <FAQsPageClient initialFaqs={faqs} />
    </div>
  )
}
