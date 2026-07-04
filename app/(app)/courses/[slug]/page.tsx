import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { Review } from '@/lib/db/models/Review'
import { Enrollment } from '@/lib/db/models/Enrollment'
import '@/lib/db/models/Student'
import '@/lib/db/models/Media'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import {
  FiArrowLeft, FiClock, FiBookOpen, FiUsers, FiCheck,
  FiStar, FiZap, FiList, FiAward, FiBook, FiChevronRight,
  FiShield,
} from 'react-icons/fi'
import LessonsAccordion from '@/components/LessonsAccordion'
import EnrollButton from '@/components/EnrollButton'
import GTMTracker from '@/components/GTMTracker'

// ─── Type helpers ─────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>
}

function getLevelLabel(level: string): string {
  const map: Record<string, string> = {
    all: 'All Levels', beginner: 'Beginner',
    intermediate: 'Intermediate', advanced: 'Advanced',
  }
  return map[level] ?? 'All Levels'
}

function formatPrice(price?: number | null) {
  if (!price || price === 0) return 'Free'
  return `৳${price.toLocaleString('en-BD')}`
}

function getImageUrl(thumbnail: any): string {
  if (!thumbnail || typeof thumbnail === 'string') return ''
  return thumbnail.sizes?.card?.url ?? thumbnail.sizes?.hero?.url ?? thumbnail.url ?? ''
}

function getStarCount(reviews: any[]): number {
  if (!reviews.length) return 0
  const sum = reviews.reduce((acc, r) => acc + parseInt(r.rating, 10), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          className={`h-4.5 w-4.5 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400 shrink-0' : 'text-zinc-300 shrink-0'}`}
        />
      ))}
    </div>
  )
}

// ─── Generate page metadata ──────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()
  const course = await Course.findOne({ slug, status: 'published' }).lean()
  if (!course) return { title: 'Course Not Found' }
  return {
    title: `${course.title} - Canadian Nest School`,
    description: course.summary,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()

  // Fetch course
  const course = await Course.findOne({ slug, status: 'published' })
    .populate('category')
    .populate('categories')
    .populate({
      path: 'instructor',
      populate: { path: 'profilePic' }
    })
    .populate('instructors')
    .populate('thumbnail')
    .lean() as any

  if (!course) notFound()

  // ─── Session and Enrollment Check ───
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const payloadToken = cookieStore.get('payload-token')?.value

  let userId: string | null = null
  if (studentToken) {
    const decoded = verifyToken(studentToken)
    if (decoded && decoded.id) userId = decoded.id
  }
  if (!userId && payloadToken) {
    const decoded = verifyToken(payloadToken)
    if (decoded && decoded.id) userId = decoded.id
  }

  let isAlreadyEnrolled = false
  if (userId) {
    const existingEnrollment = await Enrollment.findOne({
      student: userId,
      course: course._id,
      paymentStatus: 'completed'
    }).lean()
    if (existingEnrollment) {
      isAlreadyEnrolled = true
    }
  }

  // Parallel: lessons + approved reviews
  const [lessonsDocs, reviewsDocs] = await Promise.all([
    Lesson.find({ course: course._id }).lean(),
    Review.find({ course: course._id, status: 'approved' })
      .populate('student')
      .lean()
      .catch(() => []),
  ])

  const lessonCount = lessonsDocs.length
  const reviews = reviewsDocs as any[]
  const avgRating = getStarCount(reviews)
  const resolvedInstructor = (course.instructor && typeof course.instructor === 'object' ? course.instructor : null)
    ?? (course.instructors?.[0] && typeof course.instructors[0] === 'object' ? course.instructors[0] : null)
  const categoryName = (course.category && typeof course.category === 'object' ? course.category.name : null)
    ?? (course.categories?.[0] && typeof course.categories[0] === 'object' ? course.categories[0].name : '')
  const instructorName = resolvedInstructor
    ? (resolvedInstructor.name ?? resolvedInstructor.email)
    : 'Expert Instructor'
  const imageUrl = getImageUrl(course.thumbnail)
  const instructorPicUrl = resolvedInstructor?.profilePic ? getImageUrl(resolvedInstructor.profilePic) : ''

  const serializedLessons = (lessonsDocs as any[]).map((l: any) => ({
    id: l._id.toString(),
    title: l.title,
    slug: l.slug,
    order: l.order || 1,
    moduleOrder: l.moduleOrder || undefined,
    moduleName: l.moduleName || 'General Module',
    lessonType: l.lessonType || 'recorded',
    duration: l.duration || 10,
    isPreviewable: l.isPreviewable || false,
    livePlatform: l.livePlatform || '',
    liveDate: l.liveDate ? l.liveDate.toISOString() : undefined,
    videoUrl: l.videoUrl || '',
    liveUrl: l.liveUrl || '',
  }))

  const initials = instructorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffffff] via-[#fbfcff] to-[#f5f8ff] font-sans text-zinc-900 pb-20 pt-22 relative">
      <GTMTracker 
        event="view_item" 
        data={{
          ecommerce: {
            currency: 'BDT',
            value: course.price,
            items: [{
              item_id: course._id.toString(),
              item_name: course.title,
              item_category: categoryName,
              price: course.price
            }]
          }
        }} 
      />
      
      {/* Background glow accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[25%] right-[-10%] w-[500px] h-[500px] bg-[#E61C24]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-[25%] left-[-10%] w-[500px] h-[500px] bg-[#FDBF2D]/3 rounded-full blur-[120px]" />
      </div>

      {/* ── Breadcrumb bar (Premium Glassmorphism Style) ── */}
      <div className="relative border-b border-zinc-200/80 bg-gradient-to-r from-[#FAF9FF] to-[#F5F3FF] select-text z-10">
        <div className="container mx-auto px-6 py-4 flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-500">
          <Link href="/" className="hover:text-[#E61C24] transition-colors flex items-center gap-1">Home</Link>
          <FiChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
          <Link href="/courses" className="hover:text-[#E61C24] transition-colors">Courses</Link>
          <FiChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
          <span className="text-zinc-800 font-bold line-clamp-1">{course.title}</span>
        </div>
      </div>

      {/* ── Breathtaking Hero Section (Premium Dark Sapphire Glow) ── */}
      <div className="relative bg-black text-white border-b border-zinc-800 overflow-hidden select-text z-10">
        {/* Soft decorative glows inside banner */}
        <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Premium Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.55] pointer-events-none"
          style={{ 
            backgroundImage: 'radial-gradient(#E61C24 1.2px, transparent 1.2px)', 
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }}
        />

        <div className="container mx-auto px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

          {/* Left Side: Course Metadata & Main Info */}
          <div className="lg:col-span-8 space-y-6">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-base font-bold text-zinc-400 hover:text-white transition-colors group"
            >
              <FiArrowLeft className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Courses</span>
            </Link>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              {categoryName && (
                <span className="px-3.5 py-1.5 bg-[#E61C24]/15 border border-[#E61C24]/25 text-[#ff8e91] rounded-lg font-bold text-base uppercase tracking-wide">
                  {categoryName}
                </span>
              )}
              <span className="px-3.5 py-1.5 bg-white/8 border border-white/12 text-zinc-300 rounded-lg font-bold text-base uppercase tracking-wide">
                {getLevelLabel(course.level)}
              </span>
            </div>

            {/* Course Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display leading-[1.2] tracking-tight text-white">
              {course.title}
            </h1>

            {/* Course Summary */}
            <p className="text-lg sm:text-xl font-semibold text-zinc-300 leading-relaxed max-w-3xl">
              {course.summary}
            </p>

            {/* Course Meta Stats Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-base font-bold text-zinc-300 border-t border-white/5">
              {course.duration && (
                <span className="flex items-center gap-2">
                  <FiClock className="h-5 w-5 text-[#E61C24] shrink-0" />
                  <span>{course.duration}</span>
                </span>
              )}
              {lessonCount > 0 && (
                <span className="flex items-center gap-2">
                  <FiList className="h-5 w-5 text-[#E61C24] shrink-0" />
                  <span>{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
                </span>
              )}
              <span className="flex items-center gap-2">
                <FiAward className="h-5 w-5 text-[#E61C24] shrink-0" />
                <span>{getLevelLabel(course.level)}</span>
              </span>
              {reviews.length > 0 && (
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                  <FiStar className="h-4.5 w-4.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="text-white font-bold">{avgRating}</span>
                  <span className="text-zinc-400">({reviews.length} reviews)</span>
                </span>
              )}
            </div>

            {/* Instructor Details Bar */}
            <div className="flex items-center gap-3 pt-3">
              {instructorPicUrl ? (
                <img
                  src={instructorPicUrl}
                  alt={instructorName}
                  className="h-11 w-11 rounded-lg object-cover border border-[#E61C24]/30"
                />
              ) : (
                <div className="h-11 w-11 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 flex items-center justify-center font-bold text-white text-base">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-base font-bold text-zinc-400">Instructed by</p>
                <p className="text-base font-bold text-white">{instructorName}</p>
              </div>
            </div>
          </div>

          {/* Right Side Spacer for Sticky Card on Desktop */}
          <div className="lg:col-span-4 hidden lg:block" />

        </div>
      </div>

      {/* ── Main Responsive Content Grid ── */}
      <div className="container mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">

        {/* Left Area: Detailed Content (8 cols) */}
        <div className="lg:col-span-8 space-y-12 order-2 lg:order-1">

          {/* Section: What You'll Learn (Beautiful Lavender Accent Card) */}
          {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#0A163A] tracking-tight">
                What you&apos;ll learn in this course
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-zinc-200/80 rounded-lg p-6 shadow-[0_4px_20px_rgba(230,28,36,0.02)]">
                {course.whatYouWillLearn.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-lg bg-[#E61C24]/8 border border-[#E61C24]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <FiCheck className="h-4 w-4 text-[#E61C24]" />
                    </div>
                    <span className="text-base font-semibold text-zinc-700 leading-relaxed">
                      {item.outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Detailed Description */}
          {course.description && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#0A163A] tracking-tight">
                Course Description
              </h2>
              <div className="bg-white border border-zinc-200/80 rounded-lg p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div 
                  className="course-description-content font-sans select-text"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </div>
              <style dangerouslySetInnerHTML={{ __html: `
                .course-description-content {
                  color: #3f3f46;
                  font-size: 1rem;
                  line-height: 1.7;
                }
                .course-description-content h1 { font-size: 1.8rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: #0A163A; }
                .course-description-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.6rem; color: #0A163A; }
                .course-description-content h3 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #0A163A; }
                .course-description-content p { margin-bottom: 0.75rem; }
                .course-description-content strong { font-weight: 700; color: #0A163A; }
                .course-description-content em { font-style: italic; color: #4b5563; }
                .course-description-content u { text-decoration: underline; }
                .course-description-content code {
                  background: #f1f5f9; color: #0f172a;
                  padding: 0.1rem 0.35rem; border-radius: 4px;
                  font-family: monospace; font-size: 0.9em;
                }
                .course-description-content pre {
                  background: #0f172a; border: 1px solid #e2e8f0;
                  border-radius: 8px; padding: 1rem 1.25rem; margin: 0.75rem 0;
                  overflow-x: auto; color: #f8fafc;
                }
                .course-description-content pre code { background: none; color: inherit; padding: 0; }
                .course-description-content blockquote {
                  border-left: 4px solid #E61C24; padding-left: 1rem;
                  margin: 1rem 0; color: #4b5563; font-style: italic;
                  background: #f8fafc; padding-top: 0.5rem; padding-bottom: 0.5rem;
                  border-top-right-radius: 4px; border-bottom-right-radius: 4px;
                }
                .course-description-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                .course-description-content ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                .course-description-content li { margin-bottom: 0.25rem; }
                .course-description-content hr {
                  border: none; border-top: 1px solid #e2e8f0;
                  margin: 1.5rem 0;
                }
                .course-description-content a { color: #E61C24; text-decoration: underline; font-weight: 600; }
                .course-description-content img {
                  max-width: 100%; border-radius: 8px; margin: 1rem 0;
                }
                .course-description-content iframe {
                  width: 100%; border-radius: 8px; margin: 1rem 0;
                  aspect-ratio: 16/9; border: none;
                }
                .course-description-content table {
                  border-collapse: collapse; width: 100%;
                  margin: 1rem 0; border-radius: 8px; overflow: hidden;
                  border: 1px solid #e2e8f0;
                }
                .course-description-content th {
                  background: #f8fafc; color: #0A163A; font-weight: 700;
                  padding: 0.75rem 1rem; border: 1px solid #e2e8f0;
                  text-align: left; font-size: 0.95rem;
                }
                .course-description-content td {
                  padding: 0.75rem 1rem; border: 1px solid #e2e8f0;
                  color: #3f3f46; vertical-align: top;
                }
                .course-description-content tr:nth-child(even) td { background: #fcfcfd; }
              `}} />
            </div>
          )}

          {/* Section: Course Curriculum Accordion */}
          {serializedLessons.length > 0 && (
            <div className="pt-2">
              <LessonsAccordion lessons={serializedLessons} isEnrolled={isAlreadyEnrolled} courseSlug={course.slug} />
            </div>
          )}

          {/* Section: Course Requirements */}
          {course.requirements && course.requirements.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#0A163A] tracking-tight">
                Requirements for this course
              </h2>
              <div className="bg-white border border-zinc-200/80 rounded-lg p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                {course.requirements.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5 text-zinc-500 text-base font-bold">
                      {i + 1}
                    </div>
                    <span className="text-base font-semibold text-zinc-600 leading-relaxed">
                      {item.requirement}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Student Reviews Feed */}
          {reviews.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-150">
                <h2 className="text-2xl font-bold text-[#0A163A] tracking-tight">
                  Student Reviews
                </h2>
                <div className="flex items-center gap-3">
                  <StarDisplay rating={avgRating} />
                  <span className="text-base font-bold text-zinc-700">{avgRating} out of 5 stars</span>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.map((review: any) => {
                  const studentName = review.student && typeof review.student === 'object'
                    ? review.student.name : 'Anonymous Student'
                  const picRaw = review.student?.profilePic
                  const picUrl = picRaw
                    ? (typeof picRaw === 'object' ? picRaw.url ?? null : null)
                    : null
                  const sInitials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)

                  return (
                    <div key={review._id.toString()} className="bg-white border border-zinc-200/80 rounded-lg p-6 space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {picUrl ? (
                            <img src={picUrl} alt={studentName} className="h-11 w-11 rounded-lg object-cover border border-zinc-200" />
                          ) : (
                            <div className="h-11 w-11 rounded-lg bg-[#E61C24]/8 border border-[#E61C24]/15 flex items-center justify-center font-bold text-base text-[#E61C24]">
                              {sInitials}
                            </div>
                          )}
                          <div>
                            <p className="text-base font-bold text-[#0A163A]">{studentName}</p>
                            <p className="text-base font-semibold text-zinc-400">Verified Buyer</p>
                          </div>
                        </div>
                        <StarDisplay rating={parseInt(review.rating, 10)} />
                      </div>
                      <p className="text-base font-semibold text-zinc-650 leading-relaxed italic">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Area: Premium Sticky Pricing Card (4 cols) */}
        <div className="lg:col-span-4 relative z-20 lg:-mt-[591px] w-full order-1 lg:order-2">
          <div className="sticky top-28 bg-white border border-zinc-200 rounded-lg shadow-[0_12px_45px_rgba(0,0,0,0.06)] overflow-hidden">
            
            {/* Aspect image header on widget */}
            {imageUrl ? (
              <div className="aspect-[16/10] overflow-hidden bg-zinc-50 border-b border-zinc-100 relative group hidden lg:block">
                <img
                  src={imageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            ) : null}

            <div className="p-6 space-y-6">
              
              {/* Dynamic Price Area */}
              <div className="space-y-1">
                <p className="text-base font-bold text-zinc-400 uppercase tracking-wide">Investment</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${course.price === 0 ? 'text-emerald-600' : 'text-[#E61C24]'}`}>
                    {formatPrice(course.price)}
                  </span>
                </div>
              </div>

              {/* Action Button: Register / Enroll */}
              <EnrollButton
                courseId={course._id.toString()}
                courseTitle={course.title}
                courseSlug={course.slug}
                coursePrice={course.price}
                courseCategory={categoryName}
                isLoggedIn={!!userId}
                isAlreadyEnrolled={isAlreadyEnrolled}
              />

              {/* Comprehensive Includes check-list */}
              <div className="space-y-3.5 border-t border-zinc-100 pt-5">
                <p className="text-base font-bold text-[#0A163A]">This course includes:</p>
                
                {course.duration && (
                  <div className="flex items-center gap-3 text-base font-semibold text-zinc-600">
                    <FiClock className="h-5 w-5 text-[#E61C24] shrink-0" />
                    <span>{course.duration} on-demand video</span>
                  </div>
                )}
                
                {lessonCount > 0 && (
                  <div className="flex items-center gap-3 text-base font-semibold text-zinc-600">
                    <FiList className="h-5 w-5 text-[#E61C24] shrink-0" />
                    <span>{lessonCount} {lessonCount === 1 ? 'recorded lesson' : 'recorded lessons'}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-base font-semibold text-zinc-600">
                  <FiAward className="h-5 w-5 text-[#E61C24] shrink-0" />
                  <span>{getLevelLabel(course.level)} material</span>
                </div>
                
                <div className="flex items-center gap-3 text-base font-semibold text-zinc-600">
                  <FiUsers className="h-5 w-5 text-[#E61C24] shrink-0" />
                  <span>Full lifetime access</span>
                </div>
                
                <div className="flex items-center gap-3 text-base font-semibold text-zinc-600">
                  <FiBook className="h-5 w-5 text-[#E61C24] shrink-0" />
                  <span>Certificate of completion</span>
                </div>
              </div>

              {/* Verified Instructor footer within widget */}
              <div className="border-t border-zinc-100 pt-4 flex items-center gap-3">
                {instructorPicUrl ? (
                  <img
                    src={instructorPicUrl}
                    alt={instructorName}
                    className="h-9 w-9 rounded-lg object-cover border border-zinc-200/80"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-500 text-base">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-zinc-400 uppercase tracking-wide">Instructor</p>
                  <p className="text-base font-bold text-zinc-800 truncate max-w-[200px]">{instructorName}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
