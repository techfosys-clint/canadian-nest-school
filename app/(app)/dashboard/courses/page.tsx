'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiBook, FiBookOpen } from 'react-icons/fi';
import CompletedCourseActions from '@/components/CompletedCourseActions';
import { fetchReviewGatesForCourses } from '@/lib/certificates/downloadClient';
import type { CompletionReviewState } from '@/lib/reviews/completionGate';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CourseItem {
  id: string;
  title: string;
  summary: string;
  price: number;
  duration?: string;
  level?: string;
  slug: string;
  totalLessons?: number;
  thumbnail?: {
    url: string;
    alt?: string;
  };
  categories?: {
    name: string;
  }[];
  instructors?: {
    name: string;
  }[];
}

interface EnrollmentItem {
  id: string;
  course: CourseItem;
  paymentStatus: string;
  createdAt: string;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>(
    {},
  );
  const [reviewGates, setReviewGates] = useState<
    Record<string, CompletionReviewState>
  >({});
  const [gatesLoading, setGatesLoading] = useState(false);

  useEffect(() => {
    async function checkSessionAndFetchData() {
      try {
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();

        if (
          !sessionRes.ok ||
          !sessionData.authenticated ||
          (sessionData.user.role !== 'student' &&
            sessionData.user.role !== 'admin')
        ) {
          router.push('/login');
          return;
        }

        setUser(sessionData.user);

        // Fetch student's enrollments
        const enrollmentsRes = await fetch('/api/enrollments?depth=2', {
          cache: 'no-store',
        });
        let fetchedEnrollments: EnrollmentItem[] = [];
        if (enrollmentsRes.ok) {
          const enrollmentsData = await enrollmentsRes.json();
          if (enrollmentsData.docs) {
            fetchedEnrollments = enrollmentsData.docs;
            setEnrollments(fetchedEnrollments);
          }
        }

        // Fetch real progress from DB API
        const progressRes = await fetch('/api/progress');
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const completedLessonsMap: Record<string, string[]> =
            progressData.completedLessons || {};
          const progressMap: Record<string, number> = {};
          fetchedEnrollments.forEach((e) => {
            if (e.course && e.course.id) {
              const completedCount = (completedLessonsMap[e.course.id] || [])
                .length;
              const totalLessons = e.course.totalLessons || 1;
              progressMap[e.course.id] = Math.min(
                Math.round((completedCount / totalLessons) * 100),
                100,
              );
            }
          });
          setCourseProgress(progressMap);

          const completedIds = Object.entries(progressMap)
            .filter(([, pct]) => pct === 100)
            .map(([id]) => id);
          if (completedIds.length > 0) {
            setGatesLoading(true);
            fetchReviewGatesForCourses(completedIds)
              .then(setReviewGates)
              .finally(() => setGatesLoading(false));
          }
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSessionAndFetchData();
  }, [router]);

  const handleResumeLearning = (courseId: string, slug: string) => {
    router.push(`/courses/${slug}/watch`);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-650'>
            Loading courses...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className='container mx-auto px-6 py-8 pb-16'>
      {/* Dynamic Premium Header/Banner */}
      <div className='w-full bg-[#0A163A] rounded-lg p-8 md:p-12 relative overflow-hidden mb-10 border border-zinc-800/20'>
        <div className='absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-[#CC181F]/15 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10 max-w-2xl'>
          <span className='inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-6'>
            My Portfolio
          </span>
          <h1 className='text-3xl md:text-4xl font-bold font-display text-white mb-4 leading-tight'>
            My Enrolled{' '}
            <span className='text-transparent bg-clip-text bg-linear-to-r from-[#FF4D55] to-white font-bold'>
              Courses
            </span>{' '}
            🎓
          </h1>
          <p className='text-zinc-400 text-base md:text-lg font-semibold leading-relaxed'>
            Access your full e-learning catalog, dynamic watch streams, syllabus
            completion progress, and certificates.
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-zinc-800 tracking-tight font-display'>
            Active Subscriptions
          </h2>
          <span className='text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-3.5 py-1.5 rounded-lg'>
            Total {enrollments.length}
          </span>
        </div>

        {enrollments.length === 0 ? (
          <div className='bg-white rounded-lg p-12 text-center flex flex-col items-center justify-center border border-zinc-200'>
            <div className='h-16 w-16 rounded-full bg-[#E61C24]/5 flex items-center justify-center text-[#E61C24] mb-6'>
              <FiBook className='h-8 w-8' />
            </div>
            <h3 className='text-xl font-bold text-zinc-800 mb-2'>
              No active courses
            </h3>
            <p className='text-zinc-500 text-base font-semibold max-w-sm mb-8 leading-relaxed'>
              You haven&apos;t purchased any courses yet. Browse our premium
              list of courses to get started!
            </p>
            <Link
              href='/courses'
              className='px-6 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#E61C24]/95 text-white font-bold text-base transition-all duration-300'
            >
              Browse Premium Courses
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {enrollments.map((enrollment) => {
              const course = enrollment.course;
              if (!course) return null;

              const thumbnailSrc =
                course.thumbnail &&
                typeof course.thumbnail === 'object' &&
                course.thumbnail.url
                  ? course.thumbnail.url
                  : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

              const progress = courseProgress[course.id] ?? 0;

              return (
                <div
                  key={enrollment.id}
                  className='group bg-white border border-zinc-200/80 rounded-lg overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/50 hover:border-[#E61C24]/30 transition-all duration-300 flex flex-col justify-between'
                >
                  <div>
                    {/* Thumbnail with hover zoom */}
                    <div className='h-48 w-full bg-zinc-100 overflow-hidden relative'>
                      <Image
                        src={thumbnailSrc}
                        alt={course.title}
                        className='h-full w-full object-cover group-hover:scale-105 transition-transform duration-500'
                        onError={(e: any) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
                        }}
                        width={480}
                        height={200}
                      />
                      <div className='absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none' />
                      <span className='absolute top-3 left-3 bg-[#E61C24]/10 backdrop-blur-md text-[#E61C24] border border-[#E61C24]/20 px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wider'>
                        {course.categories?.[0] &&
                        typeof course.categories[0] === 'object'
                          ? course.categories[0].name
                          : 'LMS'}
                      </span>
                      {course.level && (
                        <span className='absolute bottom-3 right-3 bg-zinc-900/60 backdrop-blur-sm text-zinc-100 px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize tracking-wide'>
                          {course.level}
                        </span>
                      )}
                    </div>

                    {/* Title & Summary */}
                    <div className='p-6 space-y-3.5'>
                      <h3
                        onClick={() =>
                          handleResumeLearning(course.id, course.slug)
                        }
                        className='text-lg font-bold text-zinc-800 line-clamp-2 leading-snug hover:text-[#E61C24] transition-colors cursor-pointer'
                      >
                        {course.title}
                      </h3>
                      <p className='text-zinc-500 text-base font-semibold line-clamp-2 leading-relaxed'>
                        {course.summary}
                      </p>

                      {/* Instructor detail row */}
                      <div className='flex items-center gap-2.5 pt-2 border-t border-zinc-100'>
                        <div className='h-7 w-7 rounded-full bg-[#E61C24]/10 flex items-center justify-center font-bold text-xs text-[#E61C24] uppercase shrink-0'>
                          {course.instructors?.[0] &&
                          typeof course.instructors[0] === 'object'
                            ? course.instructors[0].name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()
                                .substring(0, 2)
                            : 'EX'}
                        </div>
                        <div className='min-w-0'>
                          <p className='text-xs font-semibold text-zinc-500 uppercase leading-none'>
                            Instructor
                          </p>
                          <p className='text-sm font-bold text-zinc-700 truncate mt-0.5'>
                            {course.instructors?.[0] &&
                            typeof course.instructors[0] === 'object'
                              ? course.instructors[0].name
                              : 'Expert Instructor'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & CTA */}
                  <div className='p-6 pt-0 space-y-5'>
                    <div className='space-y-2 border-t border-zinc-100 pt-4'>
                      <div className='flex justify-between text-base font-semibold text-zinc-500'>
                        <span className='flex items-center gap-1.5'>
                          <FiBookOpen className='text-zinc-400 h-4 w-4 shrink-0' />{' '}
                          Syllabus Progress
                        </span>
                        <span className='font-bold text-[#E61C24]'>
                          {progress}%
                        </span>
                      </div>
                      <div className='w-full bg-zinc-100 h-2 rounded-lg overflow-hidden'>
                        <div
                          className='bg-linear-to-r from-[#E61C24] to-[#FF4D55] h-full rounded-lg transition-all duration-500'
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {progress === 100 ? (
                      <CompletedCourseActions
                        courseId={course.id}
                        courseTitle={course.title}
                        courseSlug={course.slug}
                        gate={reviewGates[course.id]}
                        gateLoading={gatesLoading && !reviewGates[course.id]}
                      />
                    ) : (
                      <div className='space-y-3'>
                        <button
                          type='button'
                          onClick={() =>
                            handleResumeLearning(course.id, course.slug)
                          }
                          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all duration-200 cursor-pointer border-none active:scale-[0.99]'
                        >
                          <span>Resume Learning</span>
                          <FiArrowRight className='h-5 w-5 group-hover:translate-x-0.5 transition-transform' />
                        </button>
                        <Link
                          href={`/dashboard/courses/${course.id}/complete`}
                          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white border border-zinc-200/80 hover:border-[#E61C24]/40 text-zinc-700 hover:text-[#E61C24] font-bold text-base transition-all duration-200'
                        >
                          Leave Reviews
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
