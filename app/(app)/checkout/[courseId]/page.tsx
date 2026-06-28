import React from 'react'
import { notFound } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import '@/lib/db/models/Category'
import '@/lib/db/models/Media'
import '@/lib/db/models/User'
import CheckoutFormClient from './CheckoutFormClient'

type Props = {
  params: Promise<{ courseId: string }>
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({ params }: Props) {
  const { courseId } = await params
  await connectToDatabase()

  const course = await Course.findById(courseId)
    .populate('category')
    .populate('instructor')
    .populate('thumbnail')
    .lean() as any

  if (!course) notFound()

  // Format course for the client component
  const serializedCourse = {
    id: course._id.toString(),
    slug: course.slug || '',
    title: course.title || '',
    summary: course.summary || '',
    price: course.price || 0,
    imageUrl: course.thumbnail?.sizes?.card?.url ?? course.thumbnail?.sizes?.hero?.url ?? course.thumbnail?.url ?? '',
    instructorName: course.instructor?.name || 'Expert Instructor',
    categoryName: course.category?.name || '',
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <CheckoutFormClient course={serializedCourse} />
    </div>
  )
}
