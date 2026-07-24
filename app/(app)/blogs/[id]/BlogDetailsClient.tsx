'use client';

import ShareButton from '@/components/ShareButton';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiCalendar, FiClock, FiTag } from 'react-icons/fi';
import { formatBdDate } from '@/lib/bdTime';

interface BlogDoc {
  id: string;
  title: string;
  content: string;
  publishedDate: string;
  createdAt: string;
  tags: { tag: string }[];
  coverImageUrl: string;
  authorName: string;
  authorRole: string;
  authorProfilePicUrl: string;
}

interface RecommendedBlog {
  id: string;
  title: string;
  content: string;
  authorName: string;
  coverImageUrl: string;
  publishedDate: string;
}

interface BlogDetailsClientProps {
  blog: BlogDoc;
  recommendedBlogs: RecommendedBlog[];
}

// Format date helper: "24 Jul 2026" (Asia/Dhaka)
function formatDate(dateStr?: Date | string): string {
  return formatBdDate(dateStr);
}

// Calculate reading time
function calculateReadingTime(htmlContent: string): number {
  if (!htmlContent) return 1;
  const words = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export default function BlogDetailsClient({
  blog,
  recommendedBlogs,
}: BlogDetailsClientProps) {
  const formattedDate = formatDate(blog.publishedDate || blog.createdAt);
  const readingTime = calculateReadingTime(blog.content);

  // Framer Motion Animation Variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const bannerAnim = {
    hidden: { opacity: 0, scale: 0.97, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.16, 1, 0.3, 1] as const,
        delay: 0.25,
      },
    },
  };

  const contentAnim = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1] as const,
        delay: 0.35,
      },
    },
  };

  const cardStagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  const cardAnim = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <div className='min-h-screen bg-[#ffffff] text-[#0A163A] font-sans relative overflow-hidden'>
      {/* ── SECTION 1: HERO HEADER AREA (LIGHT GRAY BG WITH STAGGER ANIMATIONS) ── */}
      <section className='w-full bg-[#f8fafc] border-b border-zinc-200/80 pt-28 pb-16 relative overflow-hidden'>
        {/* Dynamic atmospheric ambient glows */}
        <div className='absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#E61C24]/5 rounded-full blur-[140px] pointer-events-none' />
        <div className='absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[130px] pointer-events-none' />

        <motion.div
          variants={staggerContainer}
          initial='hidden'
          animate='visible'
          className='container mx-auto px-6 relative z-10'
        >
          {/* Back Link */}
          <motion.div variants={fadeInUp} className='mb-10'>
            <Link
              href='/blogs'
              className='inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-[#E61C24] transition-colors group'
            >
              <FiArrowLeft className='h-4.5 w-4.5 group-hover:-translate-x-1 transition-transform' />
              <span>Back to Knowledge Hub</span>
            </Link>
          </motion.div>

          {/* Header Details */}
          <div className='max-w-4xl space-y-6'>
            {/* Article Category / Tags */}
            {blog.tags && blog.tags.length > 0 ? (
              <motion.div variants={fadeInUp} className='flex flex-wrap gap-2'>
                {blog.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className='px-3 py-1 bg-[#E61C24]/10 text-[#E61C24] font-bold text-xs rounded-lg uppercase tracking-wider hover:bg-[#E61C24]/20 transition-colors'
                  >
                    #{t.tag}
                  </span>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={fadeInUp}>
                <span className='inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-555 font-bold text-xs rounded-lg uppercase tracking-wider'>
                  <FiTag className='h-3.5 w-3.5' />
                  Article
                </span>
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              variants={fadeInUp}
              className='text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.15]'
            >
              {blog.title}
            </motion.h1>

            {/* Author Meta Details */}
            <motion.div
              variants={fadeInUp}
              className='flex flex-wrap items-center gap-6 pt-2'
            >
              <div className='flex items-center gap-3'>
                {blog.authorProfilePicUrl ? (
                  <Image
                    src={blog.authorProfilePicUrl}
                    alt={blog.authorName}
                    className='h-9 w-9 rounded-full object-cover shrink-0 border border-zinc-200'
                    width={100}
                    height={100}
                  />
                ) : (
                  <div className='h-9 w-9 rounded-full bg-[#E61C24]/10 flex items-center justify-center text-[#E61C24] font-bold uppercase text-sm shrink-0'>
                    {blog.authorName?.[0] || 'T'}
                  </div>
                )}
                <div className='text-sm'>
                  <p className='text-zinc-900 font-bold leading-none'>
                    {blog.authorName}
                  </p>
                  <p className='text-zinc-400 font-semibold text-xs mt-0.5 uppercase tracking-wide'>
                    {blog.authorRole}
                  </p>
                </div>
              </div>

              <span className='h-4 w-px bg-zinc-200 hidden sm:block' />

              <div className='flex items-center gap-4 text-sm font-semibold text-zinc-500'>
                <span className='flex items-center gap-1.5'>
                  <FiCalendar className='h-4 w-4 text-zinc-400' />
                  {formattedDate}
                </span>
                <span className='flex items-center gap-1.5'>
                  <FiClock className='h-4 w-4 text-zinc-400' />
                  {readingTime} min read
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── SECTION 2: ARTICLE BODY & CONTENT AREA (WHITE BG) ── */}
      <section className='w-full bg-[#ffffff] py-16'>
        <div className='container mx-auto px-6 relative z-10'>
          {/* Widescreen Banner (Fade and elegant entry) */}
          <motion.div
            variants={bannerAnim}
            initial='hidden'
            animate='visible'
            className='aspect-21/9 w-full overflow-hidden bg-zinc-50 rounded-lg mb-16 shadow-md border border-zinc-200/80'
          >
            {blog.coverImageUrl ? (
              <Image
                src={blog.coverImageUrl}
                alt={blog.title}
                className='w-full h-full object-cover hover:scale-[1.015] transition-transform duration-700'
                width={100}
                height={100}
              />
            ) : (
              <div className='w-full h-full flex flex-col items-center justify-center text-zinc-300 bg-linear-to-br from-[#f8fafc] to-[#e2e8f0]'>
                <svg
                  className='w-20 h-20'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1}
                    d='M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3'
                  />
                </svg>
              </div>
            )}
          </motion.div>

          {/* Main content grid layout */}
          <motion.div
            variants={contentAnim}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 lg:grid-cols-12 gap-12'
          >
            {/* Main content body (Left column) */}
            <main className='lg:col-span-8 space-y-8'>
              <div
                className='prose max-w-none text-base font-medium text-zinc-700 leading-relaxed space-y-6 blog-details-html pb-12 border-b border-zinc-100'
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />

              {/* Sharing Bar */}
              <div className='flex flex-wrap items-center justify-between gap-4 pt-4'>
                <span className='text-base font-bold text-zinc-900'>
                  Enjoyed the article? Share it with others!
                </span>
                <div className='flex gap-2'>
                  <ShareButton />
                </div>
              </div>
            </main>

            {/* Sidebar Area (Right column) */}
            <aside className='lg:col-span-4 space-y-10'>
              {/* Author Profile card with premium spring hover */}
              <motion.div
                whileHover={{
                  y: -4,
                  transition: { duration: 0.25, ease: 'easeOut' },
                }}
                className='bg-[#f8fafc] border border-zinc-200/80 rounded-lg p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300'
              >
                <h3 className='text-base font-bold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200/80'>
                  About The Author
                </h3>
                <div className='flex items-center gap-3'>
                  {blog.authorProfilePicUrl ? (
                    <Image
                      src={blog.authorProfilePicUrl}
                      alt={blog.authorName}
                      className='h-12 w-12 rounded-full object-cover border border-zinc-200 shrink-0'
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className='h-12 w-12 rounded-full bg-[#E61C24]/10 flex items-center justify-center text-[#E61C24] font-bold uppercase shrink-0'>
                      {blog.authorName?.[0] || 'T'}
                    </div>
                  )}
                  <div>
                    <h4 className='font-bold text-zinc-900 leading-tight'>
                      {blog.authorName}
                    </h4>
                    <p className='text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-0.5'>
                      {blog.authorRole}
                    </p>
                  </div>
                </div>
                <p className='text-base font-medium text-zinc-550 leading-relaxed'>
                  Canadian Nest School educator dedicated to delivering top-tier
                  English language learning resources, interactive lessons, and
                  educational strategies to help students and teachers succeed.
                </p>
                <Link
                  href='/courses'
                  className='block text-center w-full py-2.5 bg-[#E61C24]/10 hover:bg-[#E61C24] text-[#E61C24] hover:text-white font-bold text-sm rounded-lg transition-colors cursor-pointer'
                >
                  Browse My Courses
                </Link>
              </motion.div>

              {/* Recommended Blogs Sidebar Widget */}
              {recommendedBlogs && recommendedBlogs.length > 0 && (
                <motion.div
                  whileHover={{
                    y: -4,
                    transition: { duration: 0.25, ease: 'easeOut' },
                  }}
                  className='bg-[#f8fafc] border border-zinc-200/80 rounded-lg p-6 space-y-5 shadow-sm hover:shadow-md transition-all duration-300'
                >
                  <h3 className='text-base font-bold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200/80'>
                    More Articles
                  </h3>
                  <div className='space-y-4'>
                    {recommendedBlogs.slice(0, 3).map((rec) => (
                      <Link
                        key={rec.id}
                        href={`/blogs/${rec.id}`}
                        className='flex items-center gap-3.5 group cursor-pointer'
                      >
                        {rec.coverImageUrl ? (
                          <div className='w-20 h-16 rounded-lg bg-zinc-100 border border-zinc-200/80 overflow-hidden shrink-0 relative'>
                            <Image
                              src={rec.coverImageUrl}
                              alt={rec.title}
                              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                              width={100}
                              height={100}
                            />
                          </div>
                        ) : (
                          <div className='w-20 h-16 rounded-lg bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-350 shrink-0'>
                            <svg
                              className='w-6 h-6'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={1.5}
                                d='M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3'
                              />
                            </svg>
                          </div>
                        )}
                        <div className='flex-1 min-w-0 space-y-1'>
                          <h4 className='text-base font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#E61C24] transition-colors'>
                            {rec.title}
                          </h4>
                          <div className='flex items-center gap-2 text-xs font-semibold text-zinc-400'>
                            <span>{formatDate(rec.publishedDate)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </aside>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: RECOMMENDED READS (LIGHT GRAY BG WITH CARD STAGGERED FADE-IN-UP) ── */}
      {recommendedBlogs.length > 0 && (
        <section className='w-full bg-[#f8fafc] border-t border-zinc-200/80 py-16 relative overflow-hidden'>
          {/* Soft atmospheric ambient glows */}
          <div className='absolute top-0 right-1/4 w-[300px] h-[300px] bg-[#E61C24]/5 rounded-full blur-[100px] pointer-events-none' />

          <div className='container mx-auto px-6 relative z-10'>
            <div className='flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4'>
              <div>
                <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E61C24]/10 text-[#E61C24] text-xs font-bold uppercase tracking-wider mb-3'>
                  More Insights
                </span>
                <h3 className='text-2xl md:text-3xl font-bold text-zinc-900'>
                  Recommended Reads
                </h3>
              </div>
              <Link
                href='/blogs'
                className='inline-flex items-center gap-2 text-base font-bold text-[#E61C24] hover:text-[#c3131a] transition-colors group'
              >
                <span>View all articles</span>
                <FiArrowLeft className='h-4.5 w-4.5 rotate-180 group-hover:translate-x-1 transition-transform' />
              </Link>
            </div>

            <motion.div
              variants={cardStagger}
              initial='hidden'
              whileInView='visible'
              viewport={{ once: true, margin: '-100px' }}
              className='grid grid-cols-1 md:grid-cols-3 gap-8'
            >
              {recommendedBlogs.map((rec) => {
                const recReadingTime = calculateReadingTime(rec.content);
                return (
                  <motion.div
                    variants={cardAnim}
                    whileHover={{ y: -6, transition: { duration: 0.25 } }}
                    key={rec.id}
                    className='flex'
                  >
                    <Link
                      href={`/blogs/${rec.id}`}
                      className='bg-white border border-zinc-200 hover:border-[#E61C24]/30 rounded-lg hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group w-full'
                    >
                      {/* Cover Image */}
                      <div className='aspect-16/10 overflow-hidden bg-zinc-55 border-b border-zinc-200/80 relative'>
                        {rec.coverImageUrl ? (
                          <Image
                            src={rec.coverImageUrl}
                            alt={rec.title}
                            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
                            width={100}
                            height={100}
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-zinc-300 bg-zinc-100'>
                            <svg
                              className='w-10 h-10'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={1.5}
                                d='M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2 3V10m0 0l-3-3m3 3h-3'
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className='p-5 flex-1 flex flex-col gap-3'>
                        <div className='text-xs font-semibold text-zinc-400 flex items-center gap-3'>
                          <span>{formatDate(rec.publishedDate)}</span>
                          <span className='h-2 w-2 bg-zinc-200 rounded-full' />
                          <span>{recReadingTime} min read</span>
                        </div>

                        <h4 className='font-bold text-zinc-900 text-lg leading-snug line-clamp-2 group-hover:text-[#E61C24] transition-colors'>
                          {rec.title}
                        </h4>

                        <div className='text-zinc-555 text-sm font-semibold mt-auto pt-3 border-t border-zinc-100 flex items-center justify-between'>
                          <span className='text-zinc-700'>
                            {rec.authorName}
                          </span>
                          <span className='inline-flex items-center gap-1 text-[#E61C24] group-hover:translate-x-1 transition-transform'>
                            Read{' '}
                            <FiArrowLeft className='h-3.5 w-3.5 rotate-180' />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}
