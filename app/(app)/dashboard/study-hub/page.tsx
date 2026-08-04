 
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiBookOpen,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiLink,
  FiRadio,
} from 'react-icons/fi';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function StudyHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(5);
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

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

        // Fetch upcoming live webinars count (for quick-link badge)
        const webinarsRes = await fetch('/api/live-webinars');
        if (webinarsRes.ok) {
          const webinarsData = await webinarsRes.json();
          if (webinarsData.liveLessons) {
            setWebinars(webinarsData.liveLessons);
          }
        }

        // Fetch real login streak from DB API
        const progressRes = await fetch('/api/progress');
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const loginDatesFromAPI: string[] = progressData.loginDates || [];
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

        // Fetch student's enrollments containing course study materials
        const enrollmentsRes = await fetch('/api/enrollments?depth=2', {
          cache: 'no-store',
        });
        if (enrollmentsRes.ok) {
          const enrollmentsData = await enrollmentsRes.json();
          if (enrollmentsData.docs) {
            setEnrollments(enrollmentsData.docs);
          }
        }
      } catch (error) {
        console.error('Error fetching study hub data:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSessionAndFetchData();
  }, [router]);

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
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-650'>
            Loading Study Hub...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Flatten study materials from all enrolled courses
  const allMaterials = enrollments.reduce((acc: any[], enrollment: any) => {
    const course = enrollment.course;
    if (course && course.studyMaterials && course.studyMaterials.length > 0) {
      course.studyMaterials.forEach((material: any) => {
        acc.push({
          ...material,
          courseTitle: course.title,
          courseId: course.id,
        });
      });
    }
    return acc;
  }, []);

  return (
    <div className='container mx-auto px-6 py-8 pb-16'>
      {/* Dynamic Premium Header/Banner */}
      <div className='w-full bg-[#0A163A] rounded-lg p-8 md:p-12 relative overflow-hidden mb-10 border border-zinc-800/20'>
        <div className='absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-[#CC181F]/15 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10 max-w-2xl'>
          <span className='inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-6'>
            LMS Platform
          </span>
          <h1 className='text-3xl md:text-4xl font-bold font-display text-white mb-4 leading-tight'>
            Canadian Nest School{' '}
            <span className='text-transparent bg-clip-text bg-linear-to-r from-[#FF4D55] to-white font-bold'>
              Study Hub
            </span>{' '}
            ⚡
          </h1>
          <p className='text-zinc-400 text-base md:text-lg font-semibold leading-relaxed'>
            Monitor your daily study streaks, participate in live webinar
            streams, and manage interactive lessons.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
        {/* Study Streak */}
        <div className='lg:col-span-5'>
          <div className='bg-white p-6 border border-zinc-200/80 rounded-lg space-y-6'>
            <div>
              <h3 className='text-xl font-bold text-zinc-800 flex items-center gap-2'>
                <span className='text-orange-500'>🔥</span> Study Streak
                Calendar
              </h3>
              <p className='text-base font-semibold text-zinc-450 mt-1 leading-relaxed'>
                Log in and watch course lessons daily to build consistency. You
                have kept this streak active!
              </p>
            </div>

            <div className='flex flex-col items-center justify-center py-6 bg-zinc-50/50 rounded-lg border border-zinc-100'>
              <span className='text-sm font-bold text-zinc-400 uppercase tracking-widest'>
                Active Streak
              </span>
              <span className='text-5xl font-bold text-orange-500 mt-2 font-display'>
                {streakCount} Days
              </span>
            </div>

            <div className='flex justify-between items-center bg-zinc-50 p-4 rounded-lg border border-zinc-100'>
              {getWeekDays().map((day, idx) => {
                const isActive = loginDates.includes(day.dateStr);
                return (
                  <div key={idx} className='flex flex-col items-center gap-2'>
                    <span className='text-xs font-bold text-zinc-450 uppercase'>
                      {day.label}
                    </span>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-orange-500 text-white' : 'bg-zinc-200 text-zinc-400'}`}
                    >
                      {isActive ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Classes Quick-Link Card */}
        <div className='lg:col-span-7'>
          <Link
            href='/dashboard/live-classes'
            className='block bg-white p-6 border border-zinc-200/80 rounded-lg space-y-5 shadow-sm hover:border-[#E61C24]/40 hover:shadow-md transition-all duration-300 group'
          >
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xl font-bold text-zinc-800 flex items-center gap-2 group-hover:text-[#E61C24] transition-colors'>
                  <FiRadio className='text-[#E61C24]' /> Live Webinar Broadcasts
                </h3>
                <p className='text-base font-semibold text-zinc-450 mt-1 leading-relaxed'>
                  Join active webinar classrooms to ask live questions, share
                  comments, and review assignments.
                </p>
              </div>
              {webinars.filter(
                (w) =>
                  w.liveDate &&
                  new Date(w.liveDate).getTime() > new Date().getTime(),
              ).length > 0 && (
                <span className='shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-white font-bold text-sm animate-pulse'>
                  {
                    webinars.filter(
                      (w) =>
                        w.liveDate &&
                        new Date(w.liveDate).getTime() > new Date().getTime(),
                    ).length
                  }
                </span>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-[#E61C24]/5 border border-[#E61C24]/15 rounded-lg p-4 text-center'>
                <p className='text-3xl font-bold text-[#E61C24]'>
                  {
                    webinars.filter(
                      (w) =>
                        w.liveDate &&
                        new Date(w.liveDate).getTime() > new Date().getTime(),
                    ).length
                  }
                </p>
                <p className='text-sm font-bold text-zinc-500 mt-1'>
                  Upcoming Classes
                </p>
              </div>
              <div className='bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-center'>
                <p className='text-3xl font-bold text-zinc-700'>
                  {webinars.length}
                </p>
                <p className='text-sm font-bold text-zinc-500 mt-1'>
                  Total Sessions
                </p>
              </div>
            </div>

            <div className='flex items-center justify-end'>
              <span className='inline-flex items-center gap-2 text-base font-bold text-[#E61C24] group-hover:gap-3 transition-all'>
                View All Live Classes <FiExternalLink className='h-4 w-4' />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Study Materials Hub Section */}
      <div className='mt-12'>
        <div className='bg-white p-6 border border-zinc-200/80 rounded-lg space-y-6'>
          <div>
            <h3 className='text-xl font-bold text-zinc-800 flex items-center gap-2'>
              <span className='text-[#E61C24]'>📚</span> Study Materials &
              eBooks Hub
            </h3>
            <p className='text-base font-semibold text-zinc-450 mt-1 leading-relaxed'>
              Access exclusive ebooks, guides, cheat sheets, and reference
              materials provided by your course mentors.
            </p>
          </div>

          {allMaterials.length === 0 ? (
            <div className='text-center py-12 bg-zinc-50/50 rounded-lg border border-zinc-100 p-6'>
              <p className='text-base font-semibold text-zinc-450'>
                No study materials have been published for your enrolled courses
                yet.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {allMaterials.map((material: any, idx: number) => {
                let icon = <FiFileText className='h-6 w-6 text-red-500' />;
                let typeLabel = 'PDF Document';
                let badgeColor = 'bg-red-50 text-red-600 border-red-105';

                if (material.materialType === 'epub') {
                  icon = <FiBookOpen className='h-6 w-6 text-purple-500' />;
                  typeLabel = 'eBook (ePub)';
                  badgeColor = 'bg-purple-50 text-purple-600 border-purple-105';
                } else if (material.materialType === 'link') {
                  icon = <FiLink className='h-6 w-6 text-blue-500' />;
                  typeLabel = 'Web Link';
                  badgeColor = 'bg-blue-50 text-blue-600 border-blue-105';
                } else if (material.materialType === 'other') {
                  icon = <FiFileText className='h-6 w-6 text-zinc-550' />;
                  typeLabel = 'Resource';
                  badgeColor = 'bg-zinc-50 text-zinc-650 border-zinc-150';
                }

                return (
                  <div
                    key={idx}
                    className='bg-zinc-50/50 hover:bg-white border border-zinc-150/80 hover:border-[#E61C24]/35 rounded-lg transition-all duration-300 flex flex-col group overflow-hidden'
                  >
                    {/* Cover image / placeholder */}
                    <div className='relative w-full aspect-4/3 bg-zinc-100 overflow-hidden shrink-0'>
                      {material.coverImage ? (
                        <Image
                          src={material.coverImage}
                          alt={material.title}
                          className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                          width={100}
                          height={100}
                        />
                      ) : (
                        <div className='w-full h-full flex flex-col items-center justify-center gap-3'>
                          <div className='p-4 bg-white rounded-lg border border-zinc-150 shadow-sm'>
                            {icon}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${badgeColor}`}
                          >
                            {typeLabel}
                          </span>
                        </div>
                      )}
                      {/* Badge overlay when cover image exists */}
                      {material.coverImage && (
                        <span
                          className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-sm ${badgeColor}`}
                        >
                          {typeLabel}
                        </span>
                      )}
                    </div>

                    {/* Card body */}
                    <div className='p-4 flex flex-col flex-1 gap-3'>
                      <div>
                        <h4 className='text-base font-bold text-zinc-850 line-clamp-2 leading-snug group-hover:text-[#E61C24] transition-colors'>
                          {material.title}
                        </h4>
                        <p className='text-sm font-semibold text-zinc-450 mt-1.5 line-clamp-1'>
                          Course:{' '}
                          <span className='font-bold text-zinc-600'>
                            {material.courseTitle}
                          </span>
                        </p>
                      </div>

                      <div className='mt-auto pt-3 border-t border-zinc-150/60'>
                        <a
                          href={material.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-[#E61C24] text-zinc-700 hover:text-white border border-zinc-250 hover:border-[#E61C24] font-bold text-base transition-all duration-200 shadow-sm cursor-pointer'
                        >
                          <span>Access Material</span>
                          <FiDownload className='h-4.5 w-4.5 shrink-0' />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
