import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Category } from '@/lib/db/models/Category'
import { Review } from '@/lib/db/models/Review'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Blog } from '@/lib/db/models/Blog'
import { User } from '@/lib/db/models/User'
import Hero from '@/components/Hero'
import Marquee from '@/components/Marquee'
import Categories from '@/components/Categories'
import Features from '@/components/Features'
import Courses from '@/components/Courses'
import Reviews from '@/components/Reviews'
import BlogSection from '@/components/BlogSection'
import CTASection from '@/components/CTASection'
import type { CourseDoc, CategoryDoc } from '@/components/Courses'
import type { ReviewDoc } from '@/components/Reviews'
import type { BlogDoc } from '@/components/BlogSection'

export const dynamic = 'force-dynamic'

export default async function Home() {
  await connectToDatabase()

  const [coursesDocs, categoriesDocs, reviewsDocs, blogsDocs] = await Promise.all([
    Course.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('categories')
      .populate('thumbnail')
      .populate('instructors')
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
    Blog.find()
      .populate({
        path: 'author',
        select: 'name profilePic',
        populate: { path: 'profilePic', select: 'url' }
      })
      .populate({ path: 'coverImage', select: 'url alt' })
      .sort({ publishedDate: -1, createdAt: -1 })
      .limit(3)
      .lean()
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

  // Clean serialization for client components to prevent ObjectID or Date serialization errors
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
      category: doc.categories?.[0] ? {
        id: doc.categories[0]._id.toString(),
        name: doc.categories[0].name,
        slug: doc.categories[0].slug,
      } : null,
      instructor: doc.instructors?.[0] && typeof doc.instructors[0] === 'object' ? {
        id: doc.instructors[0]._id.toString(),
        name: doc.instructors[0].name || doc.instructors[0].email || 'Instructor',
      } : null,
      duration: doc.duration || null,
      level: doc.level || 'all',
      status: doc.status || 'draft',
      enrollmentCount: enrollmentMap[cid] || 0,
      avgRating: ratingMap[cid] ? Math.round(ratingMap[cid].avg * 10) / 10 : 0,
      reviewCount: ratingMap[cid]?.count || 0,
    }
  })

  // CategoryItem and CategoryDoc are the same shape (id, name, slug) - satisfies both components
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

  const blogs: BlogDoc[] = JSON.parse(JSON.stringify(
    (blogsDocs as any[]).map(b => ({
      id: b._id.toString(),
      title: b.title || '',
      content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content || {}),
      authorName: b.author?.name || 'Unknown',
      authorProfilePicUrl: b.author?.profilePic?.url || '',
      coverImageUrl: b.coverImage?.url || '',
      publishedDate: b.publishedDate ? b.publishedDate.toISOString() : '',
      tags: (b.tags || []).map((t: any) => ({
        tag: typeof t === 'string' ? t : (t?.tag || '')
      })),
    }))
  ))



  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0A163A] font-sans relative overflow-hidden flex flex-col">

      {/* Hero Section with Marquee children composition */}
      <Hero>
        <Marquee />
      </Hero>

      {/* 2nd Section: Course Categories Grid - real DB data */}
      <Categories categories={categories} />

      {/* Features Section: Empower Your Learning Journey */}
      <Features />

      {/* 3rd Section: Course Showcase & Filter */}
      <Courses
        initialCourses={courses}
        categories={categories}
      />

      {/* 4th Section: Student Testimonials Carousel */}
      <Reviews reviews={reviews} />

      {/* 5.5th Section: Blog Posts */}
      <BlogSection blogs={blogs} />

      {/* 6th Section: CTA with floating learner avatars */}
      <CTASection />

    </div>
  )
}

