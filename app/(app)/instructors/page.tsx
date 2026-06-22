import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Course } from '@/lib/db/models/Course'
import { Category } from '@/lib/db/models/Category'
import { Review } from '@/lib/db/models/Review'
import { Enrollment } from '@/lib/db/models/Enrollment'
import '@/lib/db/models/Media'
import InstructorsPageClient from './InstructorsPageClient'
import type { CourseDoc, CategoryDoc } from '@/components/Courses'
import type { ReviewDoc } from '@/components/Reviews'

export const metadata = {
  title: 'Our Mentors - Canadian Nest School',
  description: 'Meet our industry\'s leading expert mentors.',
}

export default async function InstructorsPage() {
  await connectToDatabase()

  // Fetch all registered instructors, published courses, categories, and approved reviews from database
  const [instructorDocs, coursesDocs, categoriesDocs, reviewsDocs] = await Promise.all([
    User.find({ role: 'instructor' })
      .populate('profilePic')
      .sort({ name: 1 })
      .lean(),
    Course.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('category')
      .populate('thumbnail')
      .populate('instructor')
      .lean(),
    Category.find()
      .limit(50)
      .lean(),
    Review.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate({
        path: 'student',
        populate: { path: 'profilePic' }
      })
      .populate('course')
      .lean(),
  ])

  // Get active enrollment and review ratings map for courses
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

  // Clean serialization for InstructorsPageClient
  const realInstructors = instructorDocs.map((member: any) => ({
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    designation: member.designation || '',
    profilePicUrl: member.profilePic?.url || '',
  }))

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

  const categories = categoriesDocs.map((doc: any) => ({
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
  }))

  const reviews: ReviewDoc[] = reviewsDocs.map((doc: any) => {
    const studentPic = doc.student?.profilePic;
    return {
      id: doc._id.toString(),
      rating: doc.rating as '1' | '2' | '3' | '4' | '5',
      comment: doc.comment,
      status: doc.status as 'pending' | 'approved' | 'rejected',
      course: doc.course ? {
        id: doc.course._id.toString(),
        title: doc.course.title,
      } : null,
      student: doc.student ? {
        id: doc.student._id.toString(),
        name: doc.student.name,
        profilePic: studentPic ? {
          url: studentPic.url || null,
        } : null,
      } : null,
    };
  })

  return (
    <InstructorsPageClient
      realInstructors={realInstructors}
      courses={courses}
      categories={categories}
      reviews={reviews}
    />
  )
}
