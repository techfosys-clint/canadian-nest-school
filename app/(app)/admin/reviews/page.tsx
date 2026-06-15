import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Review } from '@/lib/db/models/Review'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import ReviewsModerationClient from './ReviewsModerationClient'

export const metadata = {
  title: 'Reviews Moderation - Tutor Space Admin',
  description: 'Approve or reject student reviews.',
}

export default async function ReviewsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const reviewsDocs = await Review.find()
    .populate({ path: 'course', select: 'title slug' })
    .populate({ path: 'student', select: 'name email' })
    .sort({ createdAt: -1 })
    .lean()

  const reviews = JSON.parse(JSON.stringify(reviewsDocs))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <ReviewsModerationClient initialReviews={reviews} />
    </div>
  )
}
