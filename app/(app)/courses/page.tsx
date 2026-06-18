import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Category } from '@/lib/db/models/Category'
import { Review } from '@/lib/db/models/Review'
import { Enrollment } from '@/lib/db/models/Enrollment'
import type { CourseDoc, CategoryDoc } from '@/components/Courses'
import CoursesPageClient from '@/components/CoursesPageClient'

export const metadata = {
  title: 'All Courses - Canadian Nest',
  description: 'Browse all premium courses on Canadian Nest. Filter by category, level, and price.',
}

export default async function CoursesPage() {
  await connectToDatabase()

  const [coursesDocs, categoriesDocs] = await Promise.all([
    Course.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .populate('category')
      .populate('thumbnail')
      .populate('instructor')
      .lean(),
    Category.find().limit(50).lean(),
  ])

  const courseIds = coursesDocs.map((c: any) => c._id)

  const [enrollmentAgg, reviewAgg] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, paymentStatus: 'completed' } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { course: { $in: courseIds }, status: 'approved' } },
      { $group: { _id: '$course', avgRating: { $avg: { $toDouble: '$rating' } }, count: { $sum: 1 } } },
    ]),
  ])

  const enrollmentMap: Record<string, number> = {}
  for (const e of enrollmentAgg) enrollmentMap[e._id.toString()] = e.count

  const ratingMap: Record<string, { avg: number; count: number }> = {}
  for (const r of reviewAgg) ratingMap[r._id.toString()] = { avg: r.avgRating, count: r.count }

  const courses: CourseDoc[] = coursesDocs.map((doc: any) => {
    const cid = doc._id.toString()
    return {
      id: cid,
      title: doc.title,
      slug: doc.slug,
      summary: doc.summary,
      price: Number(doc.price || 0),
      thumbnail: doc.thumbnail ? {
        id: doc.thumbnail._id.toString(),
        url: doc.thumbnail.url || null,
        alt: doc.thumbnail.alt || null,
        sizes: doc.thumbnail.sizes || null,
      } : null,
      category: doc.category ? {
        id: doc.category._id.toString(),
        name: doc.category.name,
        slug: doc.category.slug,
      } : null,
      instructor: doc.instructor && typeof doc.instructor === 'object' ? {
        id: doc.instructor._id.toString(),
        name: doc.instructor.name || doc.instructor.email || 'Instructor',
      } : null,
      duration: doc.duration || null,
      level: doc.level || 'all',
      status: doc.status || 'draft',
      enrollmentCount: enrollmentMap[cid] || 0,
      avgRating: ratingMap[cid] ? Math.round(ratingMap[cid].avg * 10) / 10 : 0,
      reviewCount: ratingMap[cid]?.count || 0,
    }
  })

  const categories: CategoryDoc[] = categoriesDocs.map((doc: any) => ({
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
  }))

  return <CoursesPageClient courses={courses} categories={categories} />
}
