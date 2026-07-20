'use client';

import { generateEventId, pushToDataLayer } from '@/lib/gtm';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiAward,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePic?: any; // Populated media object or ID
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

interface LiveWebinar {
  id: string;
  title: string;
  slug: string;
  courseTitle: string;
  livePlatform: string;
  liveUrl: string;
  liveDate: string | null;
  duration: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Live Data State
  const [webinars, setWebinars] = useState<LiveWebinar[]>([]);
  const [streakCount, setStreakCount] = useState(5);
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>(
    {},
  );

  // Academic submissions and grading stats
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [marksEarned, setMarksEarned] = useState(0);
  const [marksPossible, setMarksPossible] = useState(0);

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

        // Fetch student's enrollments with depth=2 to populate course and media details
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

        // Fire the GTM purchase event after returning from the EPS payment
        // gateway callback, since that's the only confirmation point for
        // paid enrollments (the checkout page can't fire it — the browser
        // is redirected away to EPS and back). Free enrollments already
        // fire purchase synchronously from the checkout page itself.
        const params = new URLSearchParams(window.location.search);
        if (params.get('enrollment') === 'success') {
          const enrollmentId = params.get('enrollmentId');
          const purchasedEnrollment = enrollmentId
            ? fetchedEnrollments.find((e: any) => e.id === enrollmentId)
            : fetchedEnrollments[0];

          if (purchasedEnrollment) {
            const e = purchasedEnrollment as any;
            pushToDataLayer({
              event: 'purchase',
              event_id: generateEventId(),
              ecommerce: {
                transaction_id: e.paymentReference || e.id,
                currency: 'BDT',
                value: e.pricePaid,
                coupon: e.couponCode || '',
                items: [
                  {
                    item_id: e.course?.id || '',
                    item_name: e.course?.title || '',
                    item_category: e.course?.category?.name || '',
                    price: e.course?.price,
                    quantity: 1,
                  },
                ],
              },
              user_data: {
                user_id: sessionData.user.id,
                email: sessionData.user.email,
                phone_number: sessionData.user.phone || '',
                first_name: sessionData.user.name
                  ? sessionData.user.name.split(' ')[0]
                  : '',
                last_name:
                  sessionData.user.name && sessionData.user.name.includes(' ')
                    ? sessionData.user.name.split(' ').slice(1).join(' ')
                    : '',
                city: '',
                country: 'BD',
              },
            });
          }

          // Strip the query params so a page refresh doesn't re-fire purchase
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }

        // Fetch upcoming live webinars for enrolled courses
        const webinarsRes = await fetch('/api/live-webinars');
        if (webinarsRes.ok) {
          const webinarsData = await webinarsRes.json();
          if (webinarsData.liveLessons) {
            setWebinars(webinarsData.liveLessons);
          }
        }

        // Fetch real progress data from API (DB-backed, cross-device)
        const progressRes = await fetch('/api/progress');
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const completedLessonsMap: Record<string, string[]> =
            progressData.completedLessons || {};
          const loginDatesFromAPI: string[] = progressData.loginDates || [];

          // Build progress percentage map from DB data
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

          // Set login streak from DB
          setLoginDates(loginDatesFromAPI);
          let streak = 0;
          const checkDate = new Date();
          while (true) {
            const checkStr = checkDate.toISOString().split('T')[0];
            if (loginDatesFromAPI.includes(checkStr)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          setStreakCount(streak || 1);
        }

        // Fetch student's submissions and evaluate marks
        try {
          const subsRes = await fetch('/api/submissions');
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            if (subsData.success && subsData.submissions) {
              setSubmissions(subsData.submissions);
              let earned = 0;
              let possible = 0;
              subsData.submissions.forEach((s: any) => {
                if (s.status === 'graded') {
                  earned += s.marksObtained || 0;
                  possible += s.totalMarks || 0;
                }
              });
              setMarksEarned(earned);
              setMarksPossible(possible);
            }
          }
        } catch (err) {
          console.error('Failed to load academic submissions', err);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSessionAndFetchData();
  }, [router]);

  const handleResumeLearning = (courseId: string, slug: string) => {
    router.push(`/courses/${slug}/watch`);
  };

  const handleRegisterSeat = (webinarTitle: string) => {
    Swal.fire({
      icon: 'success',
      title: 'Seat Reserved!',
      text: `You have successfully registered for: ${webinarTitle}. Join links are active below!`,
      confirmButtonColor: '#E61C24',
    });
  };

  // Calculate dynamic stats based on actual course progress from DB
  const totalCompletedLessons = enrollments.reduce((sum, e) => {
    if (!e.course || !e.course.id) return sum;
    const progress = courseProgress[e.course.id] ?? 0;
    const totalLessons = e.course.totalLessons || 0;
    return sum + Math.round((progress / 100) * totalLessons);
  }, 0);

  const totalLearningHours = enrollments.reduce((sum, e) => {
    if (!e.course || !e.course.id) return sum;
    const progress = courseProgress[e.course.id] ?? 0;
    const totalLessons = e.course.totalLessons || 0;
    const completedCount = Math.round((progress / 100) * totalLessons);
    return sum + Number((completedCount * 1.25).toFixed(1));
  }, 0);

  const getWeekDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = days[d.getDay()];
      result.push({ dateStr, label });
    }
    return result;
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f8f9fc]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-650'>
            Loading Student Space...
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
            Dashboard
          </span>
          <h1 className='text-3xl md:text-4xl font-bold font-display text-white mb-4 leading-tight'>
            Welcome back,{' '}
            <span className='text-transparent bg-clip-text bg-linear-to-r from-[#FF4D55] to-white font-bold'>
              {user.name}
            </span>
            ! 👋
          </h1>
          <p className='text-zinc-400 text-base md:text-lg font-semibold leading-relaxed'>
            Ready to unlock more skills? Resume your courses or explore new
            learning avenues today!
          </p>
        </div>
      </div>

      {/* Quick Stats Grid - Completely borderless and shadowless */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-10'>
        {/* Enrolled Courses Stat */}
        <div className='bg-white p-6 border border-zinc-200 rounded-lg flex items-center gap-5'>
          <div className='h-12 w-12 rounded-lg bg-[#E61C24]/10 flex items-center justify-center text-[#E61C24]'>
            <FiBookOpen className='h-6 w-6' />
          </div>
          <div>
            <p className='text-base font-semibold text-zinc-500'>
              Enrolled Courses
            </p>
            <h2 className='text-2xl font-bold text-zinc-800 mt-1'>
              {enrollments.length}
            </h2>
          </div>
        </div>

        {/* Completed Lessons Stat */}
        <div className='bg-white p-6 border border-zinc-200 rounded-lg flex items-center gap-5'>
          <div className='h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600'>
            <FiCheckCircle className='h-6 w-6' />
          </div>
          <div>
            <p className='text-base font-semibold text-zinc-500'>
              Completed Lessons
            </p>
            <h2 className='text-2xl font-bold text-zinc-800 mt-1'>
              {totalCompletedLessons}
            </h2>
          </div>
        </div>

        {/* Study Time Stat */}
        <div className='bg-white p-6 border border-zinc-200 rounded-lg flex items-center gap-5'>
          <div className='h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600'>
            <FiClock className='h-6 w-6' />
          </div>
          <div>
            <p className='text-base font-semibold text-zinc-500'>
              Learning Hours
            </p>
            <h2 className='text-2xl font-bold text-zinc-800 mt-1'>
              {totalLearningHours} hrs
            </h2>
          </div>
        </div>

        {/* Evaluation Marks Stat */}
        <div className='bg-white p-6 border border-zinc-200 rounded-lg flex items-center gap-5'>
          <div className='h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600'>
            <FiAward className='h-6 w-6' />
          </div>
          <div>
            <p className='text-base font-semibold text-zinc-500'>
              Academic Score
            </p>
            <h2 className='text-2xl font-bold text-zinc-800 mt-1'>
              {marksPossible > 0
                ? `${marksEarned} / ${marksPossible}`
                : '0 / 0'}
            </h2>
          </div>
        </div>
      </div>

      {/* Dashboard Sections Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left Column: Enrolled Courses (takes 2 cols on desktop) */}
        <div className='lg:col-span-2 space-y-6'>
          <div className='flex items-center justify-between'>
            <h2
              id='courses'
              className='text-2xl font-bold text-zinc-800 tracking-tight font-display scroll-mt-24'
            >
              My Courses
            </h2>
            {enrollments.length > 0 && (
              <Link
                href='/'
                className='text-[#E61C24] hover:text-[#CC181F] font-bold text-base flex items-center gap-1.5 transition-colors'
              >
                Explore More
                <FiExternalLink className='h-4.5 w-4.5' />
              </Link>
            )}
          </div>

          {enrollments.length === 0 ? (
            /* Beautiful Premium Empty State */
            <div className='bg-white rounded-lg p-12 text-center flex flex-col items-center justify-center border border-zinc-200'>
              <div className='h-16 w-16 rounded-full bg-[#E61C24]/5 flex items-center justify-center text-[#E61C24] mb-6'>
                <FiBook className='h-8 w-8' />
              </div>
              <h3 className='text-xl font-bold text-zinc-800 mb-2'>
                No enrolled courses yet
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
            /* Enrolled Courses Grid list - Completely borderless cards */
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
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

                // Course evaluation marks calculations
                const courseSubmissions = submissions.filter((s: any) => {
                  const cId = s.course?._id || s.course;
                  return cId && cId.toString() === course.id;
                });

                let courseEarned = 0;
                let coursePossible = 0;
                courseSubmissions.forEach((s: any) => {
                  if (s.status === 'graded') {
                    courseEarned += s.marksObtained || 0;
                    coursePossible += s.totalMarks || 0;
                  }
                });

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
                          onError={(e) => {
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
                        <p className='text-zinc-555 text-base font-semibold line-clamp-2 leading-relaxed'>
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
                      {coursePossible > 0 && (
                        <div className='flex justify-between text-base font-semibold text-zinc-550 border-t border-zinc-100 pt-4'>
                          <span className='flex items-center gap-1.5'>
                            <FiAward className='text-zinc-400 h-4 w-4 shrink-0' />{' '}
                            Academic Score
                          </span>
                          <span className='font-bold text-emerald-600'>
                            {courseEarned} / {coursePossible} Marks
                          </span>
                        </div>
                      )}

                      <div className='space-y-2 border-t border-zinc-100 pt-4'>
                        <div className='flex justify-between text-base font-semibold text-zinc-550'>
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

                      <button
                        onClick={() =>
                          handleResumeLearning(course.id, course.slug)
                        }
                        className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all duration-200 cursor-pointer border-none active:scale-[0.99]'
                      >
                        <span>Resume Learning</span>
                        <FiArrowRight className='h-5 w-5 group-hover:translate-x-0.5 transition-transform' />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Learning Sidebar Panel */}
        <div className='space-y-6'>
          <h2
            id='study-hub'
            className='text-2xl font-bold text-zinc-800 tracking-tight font-display scroll-mt-24'
          >
            Study Hub
          </h2>

          {/* Study Streak Card - Completely borderless and shadowless */}
          <div className='bg-white p-6 border border-zinc-200 rounded-lg space-y-4'>
            <h3 className='text-lg font-bold text-zinc-800 flex items-center gap-2'>
              <span className='text-orange-500'>🔥</span> Study Streak
            </h3>
            <p className='text-base font-semibold text-zinc-500 leading-relaxed'>
              You have logged in {streakCount}{' '}
              {streakCount === 1 ? 'day' : 'days'} in a row! Keep up the
              momentum to build consistency.
            </p>
            <div className='flex justify-between items-center bg-zinc-50 p-4 rounded-lg'>
              {getWeekDays().map((day, idx) => {
                const isActive = loginDates.includes(day.dateStr);
                return (
                  <div key={idx} className='flex flex-col items-center gap-1.5'>
                    <span className='text-sm font-bold text-zinc-500'>
                      {day.label}
                    </span>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-orange-500 text-white font-bold' : 'bg-zinc-200 text-zinc-400 font-bold'}`}
                    >
                      {isActive ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Live Classes - Completely dynamic and shadowless */}
          <div className='bg-white p-6 border border-zinc-200 rounded-lg space-y-4'>
            <h3 className='text-lg font-bold text-zinc-800 flex items-center gap-2'>
              <FiCalendar className='text-[#E61C24]' /> Live Webinars
            </h3>

            <div className='space-y-4'>
              {webinars.length === 0 ? (
                <div className='text-center py-6'>
                  <p className='text-base font-semibold text-zinc-400'>
                    No upcoming live classes scheduled for your courses.
                  </p>
                </div>
              ) : (
                webinars.map((webinar) => {
                  const dateObj = webinar.liveDate
                    ? new Date(webinar.liveDate)
                    : null;
                  const formattedDate = dateObj
                    ? dateObj.toLocaleString('en-BD', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Dhaka',
                      })
                    : 'Not Scheduled';

                  const isUpcoming = dateObj
                    ? dateObj.getTime() > new Date().getTime()
                    : false;

                  return (
                    <div
                      key={webinar.id}
                      className='p-4 rounded-lg bg-zinc-50/50 space-y-2'
                    >
                      <div className='flex justify-between items-start gap-3'>
                        <h4 className='text-base font-bold text-zinc-800 leading-snug line-clamp-2'>
                          {webinar.title}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
                            isUpcoming
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-zinc-200 text-zinc-500'
                          }`}
                        >
                          {isUpcoming ? 'Upcoming' : 'Ended'}
                        </span>
                      </div>
                      <p className='text-sm font-semibold text-zinc-500 truncate'>
                        {webinar.courseTitle}
                      </p>
                      <p className='text-sm font-bold text-[#E61C24]'>
                        {formattedDate} ({webinar.livePlatform.toUpperCase()})
                      </p>

                      {isUpcoming && webinar.liveUrl && (
                        <div className='flex items-center gap-3 pt-2'>
                          <button
                            onClick={() => handleRegisterSeat(webinar.title)}
                            className='px-3.5 py-2 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white text-sm font-bold transition-colors cursor-pointer border-none'
                          >
                            RSVP Seat
                          </button>
                          {/* Join link stays locked until the class actually starts */}
                          <span
                            className='px-3.5 py-2 rounded-lg bg-zinc-100 text-zinc-500 text-sm font-bold cursor-not-allowed select-none'
                            title='The join link unlocks when the class starts'
                          >
                            Unlocks at class time
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
