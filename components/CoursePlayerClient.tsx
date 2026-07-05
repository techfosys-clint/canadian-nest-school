'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiHelpCircle,
  FiLock,
  FiMaximize,
  FiMonitor,
  FiRadio,
  FiVideo,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import SecureVideoPlayer from './SecureVideoPlayer';

// Client-safe check: external embeds (YouTube/Vimeo) start with http(s);
// anything else is treated as a private R2 object key streamed securely.
function isExternalEmbed(videoUrl?: string): boolean {
  if (!videoUrl) return false;
  return /^https?:\/\//i.test(videoUrl.trim());
}

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

interface LessonItem {
  id: string;
  title: string;
  slug: string;
  order: number;
  moduleOrder?: number;
  moduleName?: string;
  lessonType: 'recorded' | 'live' | 'quiz' | 'assignment';
  duration: number;
  isPreviewable: boolean;
  livePlatform?: string;
  liveDate?: string;
  videoUrl?: string;
  liveUrl?: string;
  quizQuestions?: QuizQuestion[];
  totalMarks?: number;
  content?: any;
}

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  category?: {
    name: string;
  };
  instructor?: {
    name: string;
  };
}

interface CoursePlayerClientProps {
  course: CourseItem;
  lessons: LessonItem[];
  student?: {
    name: string;
    email: string;
  };
}

function getEmbedUrl(videoUrl: string): string {
  if (!videoUrl) return '';

  // YouTube standard & shorts & sharing formats
  const ytMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = videoUrl.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/,
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return videoUrl;
}

export default function CoursePlayerClient({
  course,
  lessons,
  student,
}: CoursePlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for active lesson
  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null);

  // State for completed lessons (IDs list)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  // State for Screen modes (Theater, Fullscreen)
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Floating Watermark position state for anti-piracy
  const [watermarkPos, setWatermarkPos] = useState({ top: '80%', left: '3%' });

  // Active blackout state to shield video when user switches tabs or takes screenshots
  const [isBlackout, setIsBlackout] = useState(false);

  // Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [retakeQuiz, setRetakeQuiz] = useState(false);

  // Certificate states
  const [certRequest, setCertRequest] = useState<{
    status: string;
    certificateUrl: string | null;
  } | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);

  // Student Evaluation Submissions
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any>>({});
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [submittingDrive, setSubmittingDrive] = useState(false);

  // Ticking clock for the live class countdown / link gating
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Combined fetch for course data (progress, submissions, certificates)
  // Eliminates 3 separate API calls and consolidates into 1
  const loadCourseData = async () => {
    try {
      const res = await fetch(`/api/course-data?courseId=${course.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          // Set progress
          const ids: string[] = data.data.progress?.completedLessons || [];
          setCompletedLessonIds(ids);

          // Set submissions
          setSubmissionsMap(data.data.submissions || {});

          // Set certificate status
          setCertRequest(data.data.certificates);
        }
      } else {
        console.error('Failed to load course data:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to load course data from combined API', err);
    }
  };

  const handleRequestCertificate = async () => {
    setLoadingCert(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (res.ok) {
        loadCourseData();
      } else {
        throw new Error(
          data.error || 'Unable to request certificate. Please try again.',
        );
      }
    } catch (err: any) {
      console.error('Auto-request certificate failed:', err);
    } finally {
      setLoadingCert(false);
    }
  };

  // Load all course data on component mount
  useEffect(() => {
    loadCourseData();
  }, [course.id]);

  // Reset quiz states when active lesson changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    setRetakeQuiz(false);
  }, [activeLesson?.id]);

  // Group lessons by moduleName
  const grouped: Record<string, typeof lessons> = {};
  lessons.forEach((lesson) => {
    const mod = lesson.moduleName || 'General Module';
    if (!grouped[mod]) {
      grouped[mod] = [];
    }
    grouped[mod].push(lesson);
  });

  // Convert to array and sort modules by the minimum order of their lessons
  const moduleGroups = Object.keys(grouped).map((name) => {
    // Sort by position within the module when available, falling back to
    // the course-wide serial for older lessons without moduleOrder.
    const moduleLessons = [...grouped[name]].sort(
      (a, b) => (a.moduleOrder ?? a.order) - (b.moduleOrder ?? b.order),
    );
    const minOrder = Math.min(...moduleLessons.map((l) => l.order));
    return {
      name,
      lessons: moduleLessons,
      minOrder,
    };
  });

  moduleGroups.sort((a, b) => a.minOrder - b.minOrder);

  // Now create the true sortedLessons by flattening moduleGroups
  // This prevents the bug where clicking "Next" jumps to another module if orders are interleaved.
  const sortedLessons = moduleGroups.flatMap((mg) => mg.lessons);

  // Sidebar expanded modules state
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  // Expand the module of the current active lesson automatically
  useEffect(() => {
    const activeL = activeLesson || sortedLessons[0];
    if (activeL) {
      const activeModule = activeL.moduleName || 'General Module';
      setExpandedModules((prev) => ({
        ...prev,
        [activeModule]: true,
      }));
    }
  }, [activeLesson?.id, sortedLessons.length]);

  // Initialize active lesson from query search params or default to first lesson
  useEffect(() => {
    if (sortedLessons.length > 0) {
      const lessonIdFromUrl = searchParams.get('lesson');
      if (lessonIdFromUrl) {
        const found = sortedLessons.find((l) => l.id === lessonIdFromUrl);
        if (found) {
          setActiveLesson(found);
          return;
        }
      }
      setActiveLesson(sortedLessons[0]);
    }
  }, [searchParams, lessons]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Keyboard shortcut listener (T and F keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack keyboard shortcuts if typing in inputs/textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // 't' key (Theater Mode)
      if (key === 't') {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
        Swal.fire({
          icon: 'info',
          title: !isTheaterMode
            ? 'Theater Mode Enabled'
            : 'Standard Mode Enabled',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          background: '#1a1a1a',
          color: '#ffffff',
        });
      }

      // 'f' key (Fullscreen Mode)
      if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheaterMode]);

  // Watermark repositioning timer for anti-screen capture security
  useEffect(() => {
    if (!student) return;
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 85) + 5; // 5% to 90%
      const randomLeft = Math.floor(Math.random() * 60) + 5; // 5% to 65%
      setWatermarkPos({ top: `${randomTop}%`, left: `${randomLeft}%` });
    }, 5000);

    return () => clearInterval(interval);
  }, [student]);

  // DevTools, screenshots, copy and contextmenu blockade listeners
  useEffect(() => {
    // 1. Right Click Prevention
    const handleContextMenu = (e: MouseEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. DevTools & Ctrl+U Block
    const handleDevTools = (e: KeyboardEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      const key = e.key.toLowerCase();
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (key === 'i' || key === 'c' || key === 'j')) ||
        ((e.ctrlKey || e.metaKey) && key === 'u')
      ) {
        e.preventDefault();
        Swal.fire({
          icon: 'warning',
          title: 'Security Alert',
          text: 'Developer tools are disabled on this page to protect content copyright.',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#ffffff',
        });
      }
    };
    window.addEventListener('keydown', handleDevTools);

    // 3. Prevent Copying
    const handleCopy = (e: ClipboardEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      e.clipboardData?.setData(
        'text/plain',
        'Copying content is disabled on this player.',
      );
      e.preventDefault();
    };
    document.addEventListener('copy', handleCopy);

    // 4. PrintScreen & active screenshot keys detection (keydown triggers blackout instantly)
    const handleScreenshotKeyDown = (e: KeyboardEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      const key = e.key.toLowerCase();
      if (
        e.key === 'PrintScreen' ||
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          (key === 's' || key === '3' || key === '4' || key === '5')) ||
        ((e.ctrlKey || e.metaKey) && key === 'p')
      ) {
        setIsBlackout(true);
        if (key === 'p') {
          e.preventDefault();
        }
        setTimeout(() => {
          setIsBlackout(false);
        }, 3000);
      }
    };
    window.addEventListener('keydown', handleScreenshotKeyDown);

    // 5. PrintScreen KeyUp clipboard overwrite
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      if (e.key === 'PrintScreen') {
        setIsBlackout(true);
        navigator.clipboard
          .writeText(
            'Protected Content - Canadian Nest School Screen Captures Restricted.',
          )
          .catch(() => {});
        Swal.fire({
          icon: 'warning',
          title: 'Screenshot Restricted',
          text: 'Taking screenshots is disabled on this player to protect copyright.',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#ffffff',
        });
        setTimeout(() => {
          setIsBlackout(false);
        }, 3000);
      }
    };
    window.addEventListener('keyup', handleKeyUp);

    // 6. Focus & blur window detection (Removed as per user request to allow background playing)
    // Removed handleBlur, handleFocus, handleVisibilityChange

    // 7. DevTools open detection via window inner/outer size gap (blackout while open)
    const checkDevTools = () => {
      if (!window.location.pathname.includes('/watch')) return;
      const threshold = 170;
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      if (widthGap > threshold || heightGap > threshold) {
        setIsBlackout(true);
      }
    };
    const devToolsInterval = setInterval(checkDevTools, 1000);

    // 8. Mobile / touch protection: block long-press save menu and drag-out
    const handleTouchStart = (e: TouchEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      // Block multi-touch gestures and long-press context menus over the player
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => {
      if (!window.location.pathname.includes('/watch')) return;
      e.preventDefault();
    };
    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleDevTools);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('keydown', handleScreenshotKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(devToolsInterval);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Navigate to the next lesson in order (if any)
  const goToNextLesson = (fromLessonId: string) => {
    const nextIdx = sortedLessons.findIndex((l) => l.id === fromLessonId) + 1;
    if (nextIdx > 0 && nextIdx < sortedLessons.length) {
      const nextL = sortedLessons[nextIdx];
      setActiveLesson(nextL);
      router.replace(`/courses/${course.slug}/watch?lesson=${nextL.id}`);
    }
  };

  // Handle Mark as Completed — persists to DB
  const handleToggleComplete = async (
    lessonId: string,
    advance: boolean = false,
  ) => {
    const willBeCompleted = !completedLessonIds.includes(lessonId);
    const updatedCompleted = willBeCompleted
      ? [...completedLessonIds, lessonId]
      : completedLessonIds.filter((id) => id !== lessonId);

    // Optimistically update UI
    setCompletedLessonIds(updatedCompleted);

    // Persist to DB
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          lessonId,
          completed: willBeCompleted,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress to API', err);
      // Revert optimistic update on error
      setCompletedLessonIds(completedLessonIds);
    }

    if (willBeCompleted) {
      const isLast =
        sortedLessons.findIndex((l) => l.id === lessonId) ===
        sortedLessons.length - 1;
      Swal.fire({
        icon: 'success',
        title: 'Outstanding Work!',
        text:
          advance && !isLast
            ? 'Lesson completed. Moving to the next lesson…'
            : 'Lesson marked as completed. Keep up the streak!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        background: '#1a1a1a',
        color: '#ffffff',
      });
      // Auto-advance to the next lesson when requested
      if (advance) {
        goToNextLesson(lessonId);
      }
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Status Updated',
        text: 'Lesson marked as incomplete.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        background: '#1a1a1a',
        color: '#ffffff',
      });
    }
  };

  if (sortedLessons.length === 0) {
    return (
      <div className='container mx-auto px-6 py-12 text-center max-w-xl bg-white border border-zinc-200 rounded-lg shadow-sm'>
        <FiLock className='h-12 w-12 text-zinc-300 mx-auto mb-4' />
        <h2 className='text-xl font-bold text-zinc-800 mb-2'>
          No Syllabus Published
        </h2>
        <p className='text-base font-semibold text-zinc-500 mb-6 leading-relaxed'>
          The instructor is currently constructing the curriculum for this
          course. Please check back shortly!
        </p>
        <Link
          href='/dashboard'
          className='inline-flex items-center gap-2 py-2.5 px-4.5 rounded-lg bg-[#E61C24] text-white font-bold text-base shadow-md whitespace-nowrap'
        >
          <FiArrowLeft className='h-4.5 w-4.5' />
          <span>Back to Study Hub</span>
        </Link>
      </div>
    );
  }

  const currentLesson = activeLesson || sortedLessons[0];
  const completedCount = completedLessonIds.length;
  const progressPercentage = Math.round(
    (completedCount / sortedLessons.length) * 100,
  );

  // Auto-request certificate when 100% progress is reached and there is no request logged yet
  useEffect(() => {
    if (
      progressPercentage === 100 &&
      !certRequest &&
      !loadingCert &&
      sortedLessons.length > 0
    ) {
      handleRequestCertificate();
    }
  }, [progressPercentage, certRequest, loadingCert, sortedLessons.length]);

  // Date parsing for live classes
  const liveDateObj = currentLesson.liveDate
    ? new Date(currentLesson.liveDate)
    : null;
  const formattedLiveDate = liveDateObj
    ? liveDateObj.toLocaleString('en-BD', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Dhaka',
      })
    : null;

  const isLiveUpcoming = liveDateObj ? liveDateObj.getTime() > nowTs : false;

  // Human countdown until the class link unlocks (e.g. "1d 4h 20m 05s")
  const countdownLabel = (() => {
    if (!liveDateObj || !isLiveUpcoming) return '';
    let diff = Math.max(0, Math.floor((liveDateObj.getTime() - nowTs) / 1000));
    const days = Math.floor(diff / 86400);
    diff %= 86400;
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return days > 0
      ? `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
      : `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  })();

  // ─── Render Sub-Components for clean split layouts ───
  const renderLiveJoinButton = (isMobile: boolean = false) => {
    if (currentLesson.lessonType !== 'live') return null;
    return (
      <div
        className={`flex-col sm:flex-row items-start sm:items-center gap-6 ${isMobile ? 'flex sm:hidden bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-sm' : 'hidden sm:flex pt-6 border-t border-white/5 relative z-10'}`}
      >
        <div className='space-y-1 w-full sm:w-auto'>
          <p
            className={`text-xs font-bold uppercase tracking-widest ${isMobile ? 'text-zinc-500' : 'text-slate-400'}`}
          >
            Broadcast Time
          </p>
          <p
            className={`text-base font-bold flex items-center gap-1.5 mt-0.5 ${isMobile ? 'text-indigo-500' : 'text-[#b2b0ff]'}`}
          >
            <FiCalendar className='h-4.5 w-4.5' />
            <span>{formattedLiveDate || 'TBD (Not Scheduled)'}</span>
          </p>
        </div>

        {(currentLesson.liveUrl || currentLesson.videoUrl) && isLiveUpcoming ? (
          <div className='flex flex-col gap-2 w-full sm:w-auto'>
            <span
              className={`py-2.5 px-4.5 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-base whitespace-nowrap inline-flex items-center gap-2 border border-zinc-700 select-none cursor-not-allowed ${isMobile ? 'justify-center w-full' : ''}`}
            >
              <FiLock className='h-4.5 w-4.5 text-[#FF4D55]' />
              <span>Class Locked</span>
            </span>
            <span
              className={`text-base font-bold text-[#FF4D55] tabular-nums whitespace-nowrap flex items-center gap-1.5 ${isMobile ? 'justify-center w-full' : ''}`}
            >
              <FiClock className='h-4.5 w-4.5' />
              <span>Unlocks in {countdownLabel}</span>
            </span>
          </div>
        ) : currentLesson.liveUrl || currentLesson.videoUrl ? (
          <a
            href={currentLesson.liveUrl || currentLesson.videoUrl}
            target='_blank'
            rel='noopener noreferrer'
            className={`py-2.5 px-4.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base whitespace-nowrap transition-all transform hover:-translate-y-0.5 shadow-lg shadow-[#E61C24]/15 cursor-pointer inline-flex items-center gap-2 ${isMobile ? 'justify-center w-full' : ''}`}
          >
            <FiRadio className='h-5 w-5 animate-pulse' />
            <span>Join Live Broadcast</span>
          </a>
        ) : (
          <span
            className={`py-2.5 px-4.5 rounded-lg bg-zinc-800 text-zinc-400 font-bold text-base whitespace-nowrap cursor-not-allowed inline-flex items-center gap-2 border border-zinc-700 select-none ${isMobile ? 'justify-center w-full' : ''}`}
          >
            <FiLock className='h-4.5 w-4.5 text-zinc-500' />
            <span>Link Not Available</span>
          </span>
        )}
      </div>
    );
  };

  // ─── Standalone Quiz Experience ───
  // Quizzes render as a full page-flow section (NOT inside the video frame
  // box) with a light theme that reads well on mobile.
  const renderQuiz = () => {
    const questions = currentLesson.quizQuestions || [];
    const submission = submissionsMap[currentLesson.id];
    const showPreSubmitted = submission && !retakeQuiz && !quizCompleted;

    const handleSubmitQuiz = async () => {
      let correctCount = 0;
      questions.forEach((q, qIdx) => {
        if (selectedAnswers[qIdx] === q.correctAnswerIndex) {
          correctCount++;
        }
      });
      setQuizScore(correctCount);
      setQuizCompleted(true);

      if (!completedLessonIds.includes(currentLesson.id)) {
        handleToggleComplete(currentLesson.id);
      }

      const answersArray = Array.from({ length: questions.length }, (_, idx) =>
        selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1,
      );

      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            lessonId: currentLesson.id,
            type: 'quiz',
            quizCorrectAnswers: correctCount,
            quizTotalQuestions: questions.length,
            selectedAnswers: answersArray,
          }),
        });
        loadCourseData();
      } catch (err) {
        console.error('Failed to save quiz score to DB', err);
      }

      Swal.fire({
        icon: 'success',
        title: 'Quiz Finished!',
        text: `You have successfully completed this quiz lesson! Correct answers: ${correctCount} of ${questions.length}.`,
        confirmButtonColor: '#E61C24',
      });
    };

    // Shared review list used by both the pre-submitted and fresh-result views
    const renderReview = (
      getUserAns: (qIdx: number) => number | null | undefined,
    ) => (
      <div className='space-y-4'>
        {questions.map((q: any, qIdx: number) => {
          const userAnsIndex = getUserAns(qIdx);
          const answered =
            userAnsIndex !== null &&
            userAnsIndex !== undefined &&
            userAnsIndex !== -1;
          const isCorrect = answered && userAnsIndex === q.correctAnswerIndex;

          return (
            <div
              key={qIdx}
              className='bg-zinc-50/60 p-4 sm:p-5 border border-zinc-200 rounded-lg space-y-3'
            >
              <div className='flex flex-col sm:flex-row sm:items-start gap-2 sm:justify-between'>
                <h5 className='text-base font-bold text-zinc-800 select-text leading-snug'>
                  {qIdx + 1}. {q.questionText}
                </h5>
                {answered ? (
                  isCorrect ? (
                    <span className='self-start px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-base font-semibold rounded-lg shrink-0'>
                      Correct
                    </span>
                  ) : (
                    <span className='self-start px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-base font-semibold rounded-lg shrink-0'>
                      Incorrect
                    </span>
                  )
                ) : (
                  <span className='self-start px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-500 text-base font-semibold rounded-lg shrink-0'>
                    Not Answered
                  </span>
                )}
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                {q.options.map((option: string, optIdx: number) => {
                  const isCorrectOpt = optIdx === q.correctAnswerIndex;
                  const isUserSelectedOpt = userAnsIndex === optIdx;

                  let optClass = 'bg-white border-zinc-200 text-zinc-600';
                  if (isCorrectOpt) {
                    optClass =
                      'bg-emerald-50 border-emerald-300 text-emerald-700';
                  } else if (isUserSelectedOpt && !isCorrect) {
                    optClass = 'bg-rose-50 border-rose-300 text-rose-700';
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-lg border text-base font-medium flex items-center justify-between gap-2 select-text ${optClass}`}
                    >
                      <span className='leading-tight'>{option}</span>
                      <div className='flex items-center gap-1.5 shrink-0'>
                        {isCorrectOpt && (
                          <span className='text-emerald-600 text-sm font-bold flex items-center gap-1 uppercase tracking-wide'>
                            <FiCheck className='h-4 w-4' /> Correct
                          </span>
                        )}
                        {isUserSelectedOpt && !isCorrectOpt && (
                          <span className='text-rose-600 text-sm font-bold flex items-center gap-1 uppercase tracking-wide'>
                            <FiX className='h-4 w-4' /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );

    const nextLessonButton = sortedLessons.findIndex(
      (l) => l.id === currentLesson.id,
    ) <
      sortedLessons.length - 1 && (
      <button
        type='button'
        onClick={() => {
          const nextIdx =
            sortedLessons.findIndex((l) => l.id === currentLesson.id) + 1;
          if (nextIdx < sortedLessons.length) {
            const nextL = sortedLessons[nextIdx];
            setActiveLesson(nextL);
            router.replace(`/courses/${course.slug}/watch?lesson=${nextL.id}`);
          }
        }}
        className='w-full sm:w-auto px-6 py-2.5 bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base rounded-lg cursor-pointer transition-all shadow-md shadow-[#E61C24]/15 border-none'
      >
        Next Lesson
      </button>
    );

    return (
      <div className='bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden'>
        {/* Quiz Header */}
        <div className='px-5 sm:px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <span className='inline-flex self-start items-center gap-2 px-3.5 py-1.5 bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] text-base font-bold rounded-lg uppercase tracking-wide'>
            <FiAward className='h-4.5 w-4.5' />
            Interactive Quiz
          </span>
          <span className='text-base font-bold text-zinc-500'>
            {showPreSubmitted
              ? 'Completed'
              : !quizCompleted
                ? `Question ${currentQuestionIndex + 1} of ${questions.length}`
                : 'Quiz Finished'}
          </span>
        </div>

        <div className='p-5 sm:p-8'>
          {showPreSubmitted ? (
            /* Previously submitted — show grade summary + full review */
            <div className='space-y-6 animate-fadeIn'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 p-5 border border-emerald-200 rounded-lg'>
                <div className='flex items-center gap-4'>
                  <div className='h-12 w-12 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center shrink-0'>
                    <FiCheckCircle className='h-6 w-6' />
                  </div>
                  <div>
                    <h3 className='text-xl font-bold text-zinc-800 leading-tight'>
                      Quiz Already Completed
                    </h3>
                    <p className='text-base text-zinc-500 mt-0.5'>
                      Below are your logged grade details and question review.
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-6'>
                  <div className='text-center sm:text-right'>
                    <p className='text-sm font-bold text-zinc-500 uppercase tracking-wide'>
                      Accuracy
                    </p>
                    <p className='text-lg font-bold text-zinc-800'>
                      {submission.quizCorrectAnswers} /{' '}
                      {submission.quizTotalQuestions} Correct
                    </p>
                  </div>
                  <div className='h-8 w-px bg-emerald-200 hidden sm:block' />
                  <div className='text-center sm:text-right'>
                    <p className='text-sm font-bold text-zinc-500 uppercase tracking-wide'>
                      Marks
                    </p>
                    <p className='text-lg font-bold text-emerald-600'>
                      {submission.marksObtained} / {submission.totalMarks} Marks
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <h4 className='text-lg font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2.5'>
                  <FiBookOpen className='h-5 w-5 text-[#E61C24]' />
                  Question & Answer Review
                </h4>
                {renderReview((qIdx) =>
                  submission.selectedAnswers
                    ? submission.selectedAnswers[qIdx]
                    : null,
                )}
              </div>

              <div className='flex items-center justify-end gap-3 pt-2'>
                {nextLessonButton}
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className='flex flex-col items-center justify-center text-center py-12'>
              <FiBookOpen className='h-12 w-12 text-zinc-300 mb-3' />
              <p className='text-base font-bold text-zinc-500'>
                No questions defined for this quiz yet.
              </p>
            </div>
          ) : !quizCompleted ? (
            /* Active quiz question */
            <div className='space-y-6'>
              {/* Progress bar */}
              <div className='w-full bg-zinc-100 h-2 rounded-lg overflow-hidden'>
                <div
                  className='bg-[#E61C24] h-full rounded-lg transition-all duration-300'
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question */}
              <h3 className='text-xl sm:text-2xl font-bold leading-snug text-zinc-900 select-text animate-fadeIn'>
                {questions[currentQuestionIndex].questionText}
              </h3>

              {questions[currentQuestionIndex].imageUrl && (
                <div className='w-full max-w-lg mx-auto rounded-lg overflow-hidden border border-zinc-200 shadow-sm'>
                  <Image
                    src={questions[currentQuestionIndex].imageUrl}
                    alt='Quiz Question'
                    width={600}
                    height={300}
                    className='w-full h-auto object-contain max-h-[300px]'
                  />
                </div>
              )}

              {/* Options */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                {questions[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected =
                    selectedAnswers[currentQuestionIndex] === idx;
                  return (
                    <button
                      key={idx}
                      type='button'
                      onClick={() =>
                        setSelectedAnswers({
                          ...selectedAnswers,
                          [currentQuestionIndex]: idx,
                        })
                      }
                      className={`w-full p-4 rounded-lg border text-left font-bold text-base transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E61C24]/5 border-[#E61C24] text-zinc-900 shadow-md shadow-[#E61C24]/5'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#E61C24] bg-[#E61C24]'
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <FiCheck className='h-3 w-3 text-white' />
                          )}
                        </div>
                        <span className='select-text leading-tight'>
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Back / Next actions */}
              <div className='flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 pt-4 border-t border-zinc-100'>
                <button
                  type='button'
                  disabled={currentQuestionIndex === 0}
                  onClick={() =>
                    setCurrentQuestionIndex(currentQuestionIndex - 1)
                  }
                  className={`px-4 py-2.5 rounded-lg border text-base font-bold transition-all ${
                    currentQuestionIndex === 0
                      ? 'border-zinc-100 text-zinc-300 cursor-not-allowed select-none'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 cursor-pointer'
                  }`}
                >
                  Back
                </button>

                {selectedAnswers[currentQuestionIndex] !== undefined ? (
                  currentQuestionIndex < questions.length - 1 ? (
                    <button
                      type='button'
                      onClick={() =>
                        setCurrentQuestionIndex(currentQuestionIndex + 1)
                      }
                      className='px-5 py-2.5 bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base rounded-lg cursor-pointer transition-all shadow-md shadow-[#E61C24]/15 border-none'
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={handleSubmitQuiz}
                      className='px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-lg cursor-pointer transition-all shadow-md shadow-emerald-600/15 border-none'
                    >
                      Submit Quiz
                    </button>
                  )
                ) : (
                  <div className='text-base font-bold text-zinc-400 text-center bg-zinc-50 px-3 py-2.5 rounded-lg border border-zinc-100 select-none'>
                    Select an answer to proceed
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Fresh submission — congrats + review */
            <div className='space-y-6 animate-fadeIn'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 p-5 border border-emerald-200 rounded-lg'>
                <div className='flex items-center gap-4'>
                  <div className='h-12 w-12 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center shrink-0'>
                    <FiAward className='h-6 w-6' />
                  </div>
                  <div>
                    <h3 className='text-xl font-bold text-zinc-800 leading-tight'>
                      Quiz Results Summary
                    </h3>
                    <p className='text-base text-zinc-500 mt-0.5'>
                      Awesome job! Below is your live performance review.
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-6'>
                  <div className='text-center sm:text-right'>
                    <p className='text-sm font-bold text-zinc-500 uppercase tracking-wide'>
                      Accuracy
                    </p>
                    <p className='text-lg font-bold text-zinc-800'>
                      {Math.round((quizScore / questions.length) * 100)}%
                      Correct
                    </p>
                  </div>
                  <div className='h-8 w-px bg-emerald-200 hidden sm:block' />
                  <div className='text-center sm:text-right'>
                    <p className='text-sm font-bold text-zinc-500 uppercase tracking-wide'>
                      Marks
                    </p>
                    <p className='text-lg font-bold text-emerald-600'>
                      {Math.round(
                        (quizScore / questions.length) *
                          (currentLesson.totalMarks || 100),
                      )}{' '}
                      / {currentLesson.totalMarks || 100}
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <h4 className='text-lg font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2.5'>
                  <FiBookOpen className='h-5 w-5 text-[#E61C24]' />
                  Question & Answer Review
                </h4>
                {renderReview((qIdx) => selectedAnswers[qIdx])}
              </div>

              <div className='flex items-center justify-end gap-3 pt-2'>
                {nextLessonButton}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPlayer = () => (
    <div
      ref={videoContainerRef}
      className={`${
        currentLesson.lessonType === 'quiz'
          ? 'bg-[#080d1a] sm:bg-slate-900 sm:border sm:border-slate-950 sm:rounded-lg sm:overflow-hidden sm:shadow-xl relative flex flex-col min-h-[90vh] sm:min-h-0 sm:aspect-video -mx-6 sm:mx-0 -mt-8 sm:mt-0 pb-6 sm:pb-0'
          : `bg-slate-900 border border-slate-950 rounded-lg overflow-hidden shadow-xl relative flex flex-col ${
              currentLesson.lessonType === 'recorded'
                ? 'aspect-video'
                : 'aspect-square sm:aspect-video'
            }`
      }`}
      style={
        {
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        } as React.CSSProperties
      }
    >
      {/* Full Black Screen overlay on focus loss or screenshot keys */}
      {isBlackout && (
        <div className='absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in'>
          <div className='bg-zinc-950/90 border border-zinc-800/80 rounded-lg p-6 max-w-sm shadow-2xl backdrop-blur-md'>
            <FiLock className='h-10 w-10 text-[#E61C24] mx-auto mb-3 animate-pulse' />
            <h3 className='text-lg font-bold text-white mb-2'>
              Screen Shield Active
            </h3>
            <p className='text-sm font-semibold text-zinc-400 leading-relaxed'>
              Screen capturing premium course video is restricted. Return your
              mouse/focus to this tab to resume playing.
            </p>
          </div>
        </div>
      )}

      {currentLesson.lessonType === 'recorded' && currentLesson.videoUrl ? (
        // Private R2-hosted video → secure signed-URL streaming player
        !isExternalEmbed(currentLesson.videoUrl) ? (
          <SecureVideoPlayer
            lessonId={currentLesson.id}
            title={currentLesson.title}
          />
        ) : getEmbedUrl(currentLesson.videoUrl) ? (
          <iframe
            src={getEmbedUrl(currentLesson.videoUrl)}
            title={currentLesson.title}
            frameBorder='0'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            allowFullScreen
            className='w-full h-full animate-fade-in'
          />
        ) : (
          <div className='w-full h-full flex flex-col items-center justify-center text-white bg-slate-950 p-6 text-center select-text'>
            <FiVideo className='h-10 w-10 text-slate-600 mb-3' />
            <p className='text-base font-bold'>Watch Video Stream</p>
            <p className='text-base text-zinc-500 mt-2'>
              Please use the link below to watch the premium content:
            </p>
            <a
              href={currentLesson.videoUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base whitespace-nowrap transition-colors'
            >
              <span>Watch on External Host</span>
              <FiExternalLink className='h-4.5 w-4.5' />
            </a>
          </div>
        )
      ) : currentLesson.lessonType === 'live' ? (
        // Premium Live Session Dashboard Card inside Video Box
        <div className='w-full h-full bg-linear-to-br from-[#0F1B40] via-[#08102B] to-[#0A163A] text-white p-6 sm:p-12 flex flex-col justify-between gap-6 sm:gap-0 select-none relative overflow-y-auto overflow-x-hidden'>
          {/* Decorative glowing grid background */}
          <div
            className='absolute inset-0 opacity-[0.06] pointer-events-none'
            style={{
              backgroundImage:
                'radial-gradient(#E61C24 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className='absolute -top-16 -right-16 w-48 h-48 bg-[#E61C24]/20 rounded-full blur-2xl' />

          {/* Top platform bar */}
          <div className='flex justify-between items-center relative z-10'>
            <span className='px-3.5 py-1.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-bold rounded-lg flex items-center gap-2 uppercase tracking-wide'>
              <span className='h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse' />
              Live Stream
            </span>
            <span className='text-base font-bold text-slate-400 uppercase tracking-widest'>
              {currentLesson.livePlatform || 'Zoom Broadcast'}
            </span>
          </div>

          {/* Middle class details block */}
          <div className='space-y-4 max-w-xl relative z-10'>
            <h3 className='text-2xl sm:text-3xl font-bold font-display leading-tight text-white'>
              {currentLesson.moduleOrder ?? currentLesson.order}.{' '}
              {currentLesson.title}
            </h3>
            <p className='text-base font-semibold text-slate-350 leading-relaxed font-sans'>
              Join our live class and interact directly with your instructor in
              real time! Ask questions, work through code challenges, and
              participate in Q&A sessions.
            </p>
          </div>

          {/* Bottom dynamic RSVP/Join button */}
          {renderLiveJoinButton(false)}
        </div>
      ) : currentLesson.lessonType === 'assignment' ? (
        // Render Assignment submission portal
        (() => {
          const submission = submissionsMap[currentLesson.id];
          const isGraded = submission?.status === 'graded';

          const handleDriveSubmission = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!driveLinkInput.trim() || !driveLinkInput.startsWith('http')) {
              Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please input a valid URL link (e.g. Google Drive sharing URL).',
                background: '#1a1a1a',
                color: '#ffffff',
              });
              return;
            }

            setSubmittingDrive(true);
            try {
              const res = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  courseId: course.id,
                  lessonId: currentLesson.id,
                  type: 'assignment',
                  googleDriveLink: driveLinkInput,
                }),
              });

              const data = await res.json();
              if (!res.ok)
                throw new Error(data.error || 'Failed to submit assignment.');

              Swal.fire({
                icon: 'success',
                title: 'Assignment Submitted!',
                text: 'Your assignment Google Drive link has been logged successfully for instructor grading.',
                background: '#1a1a1a',
                color: '#ffffff',
                confirmButtonColor: '#E61C24',
              });

              // Mark lesson completed in client lists
              if (!completedLessonIds.includes(currentLesson.id)) {
                setCompletedLessonIds([
                  ...completedLessonIds,
                  currentLesson.id,
                ]);
              }

              setDriveLinkInput('');
              loadCourseData();
            } catch (err: any) {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text:
                  err.message ||
                  'Error occurred while saving assignment submission.',
                background: '#1a1a1a',
                color: '#ffffff',
              });
            } finally {
              setSubmittingDrive(false);
            }
          };

          return (
            <div className='w-full h-full bg-[#080d1a] text-white p-6 sm:p-8 flex flex-col justify-between select-none relative overflow-y-auto overflow-x-hidden font-sans'>
              {/* Decorative glows */}
              <div
                className='absolute inset-0 opacity-[0.03] pointer-events-none'
                style={{
                  backgroundImage:
                    'radial-gradient(#E61C24 1.5px, transparent 1.5px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className='absolute -top-16 -right-16 w-48 h-48 bg-[#E61C24]/10 rounded-full blur-2xl pointer-events-none' />

              {/* Header */}
              <div className='flex justify-between items-center border-b border-white/5 pb-4 shrink-0'>
                <span className='px-3.5 py-1 bg-[#E61C24]/20 border border-[#E61C24]/30 text-[#FF4D55] text-sm font-bold rounded-lg flex items-center gap-2 uppercase tracking-wide'>
                  <FiFileText className='h-4 w-4' />
                  Assignment Portal
                </span>
                <span className='text-sm font-bold text-slate-400'>
                  Evaluation Marks: {currentLesson.totalMarks || 100}
                </span>
              </div>

              {/* Portal content body */}
              <div className='flex-1 py-6 space-y-5 flex flex-col justify-center max-w-xl mx-auto w-full min-h-0'>
                <div className='space-y-1.5 text-center sm:text-left'>
                  <h3 className='text-2xl font-bold font-display text-white'>
                    {currentLesson.moduleOrder ?? currentLesson.order}.{' '}
                    {currentLesson.title} Submission
                  </h3>
                  <p className='text-base font-medium text-zinc-400 leading-relaxed'>
                    Upload your project task deliverables inside your personal
                    Google Drive, set sharing rights to **"Anyone with the link
                    can view"**, and submit the URL below for grading.
                  </p>
                </div>

                {/* Submissions Status Alerts */}
                {submission && (
                  <div
                    className={`p-4 rounded-lg border text-left ${
                      isGraded
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <div className='flex items-center gap-2 font-bold text-base'>
                      {isGraded ? <FiCheckCircle /> : <FiClock />}
                      <span>
                        {isGraded
                          ? 'Assignment Graded & Complete'
                          : 'Submission Received - Evaluation Pending'}
                      </span>
                    </div>

                    {isGraded && (
                      <div className='mt-3 bg-slate-950/50 p-3.5 border border-emerald-500/20 rounded-lg space-y-2'>
                        <div className='flex justify-between text-base'>
                          <span className='font-bold text-zinc-450'>
                            Marks Obtained:
                          </span>
                          <span className='font-bold text-white'>
                            {submission.marksObtained} / {submission.totalMarks}{' '}
                            Marks
                          </span>
                        </div>
                        {submission.feedback && (
                          <div className='text-base border-t border-emerald-500/10 pt-2 text-zinc-350'>
                            <span className='font-bold text-zinc-400 block mb-0.5'>
                              Instructor Feedback:
                            </span>
                            <span className='italic leading-relaxed'>
                              "{submission.feedback}"
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className='mt-2 text-base flex items-center gap-2'>
                      <span className='text-zinc-500 font-semibold'>
                        Your Submitted URL:
                      </span>
                      <a
                        href={submission.googleDriveLink}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-[#FF4D55] font-bold hover:underline truncate inline-block max-w-[280px]'
                      >
                        {submission.googleDriveLink}
                      </a>
                    </div>
                  </div>
                )}

                {/* Submit Drive link form */}
                {!submission && (
                  <form onSubmit={handleDriveSubmission} className='space-y-4'>
                    <div className='flex flex-col gap-2'>
                      <label className='text-base font-bold text-zinc-300'>
                        Google Drive Attachment Link *
                      </label>
                      <input
                        type='url'
                        required
                        value={driveLinkInput}
                        onChange={(e) => setDriveLinkInput(e.target.value)}
                        placeholder='https://drive.google.com/file/d/...'
                        className='bg-slate-950 border border-zinc-800 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-white rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono'
                      />
                    </div>

                    <button
                      type='submit'
                      disabled={submittingDrive}
                      className='w-full py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all cursor-pointer border-none flex items-center justify-center gap-2'
                    >
                      {submittingDrive ? (
                        <>
                          <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                          <span>Logging submission...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck className='h-5 w-5' />
                          <span>
                            {submission
                              ? 'Update Submission Link'
                              : 'Submit Assignment'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <div className='w-full h-full flex items-center justify-center text-zinc-400 bg-slate-950'>
          <p className='text-base font-bold'>
            Unsupported lesson style or format
          </p>
        </div>
      )}

      {/* Immersive Floating Moving Anti-Piracy Watermark Overlay (Declared at bottom and z-30 to render on top of iframes) */}
      {student && (
        <div
          className='absolute pointer-events-none select-none z-30 transition-all duration-1000 ease-in-out'
          style={{
            top: watermarkPos.top,
            left: watermarkPos.left,
            color: 'rgba(97, 95, 255, 0.65)',
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.4)',
          }}
        >
          {student.email}
        </div>
      )}
    </div>
  );

  const renderDetails = () => (
    <div className='bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100'>
        <div className='space-y-1.5'>
          <h2 className='text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight'>
            {currentLesson.moduleOrder ?? currentLesson.order}.{' '}
            {currentLesson.title}
          </h2>
          <div className='flex flex-wrap items-center gap-3 text-base font-semibold text-zinc-500'>
            <span className='flex items-center gap-1.5 text-zinc-650'>
              <FiClock className='h-4 w-4 shrink-0' />
              <span>{currentLesson.duration} minutes duration</span>
            </span>
            <span>•</span>
            <span className='capitalize'>
              {currentLesson.lessonType} lesson
            </span>
          </div>
        </div>

        {/* Complete lesson button */}
        <button
          type='button'
          onClick={() => handleToggleComplete(currentLesson.id, true)}
          className={`inline-flex items-center gap-2 px-4.5 py-2 rounded-lg border font-bold text-base whitespace-nowrap transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
            completedLessonIds.includes(currentLesson.id)
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
              : 'bg-[#E61C24] border-transparent text-white hover:bg-[#CC181F]'
          }`}
        >
          <FiCheck className='h-5 w-5' />
          <span>
            {completedLessonIds.includes(currentLesson.id)
              ? 'Completed (Click to undo)'
              : 'Mark as Completed'}
          </span>
        </button>
      </div>

      {/* Lesson Overview Description */}
      <div className='space-y-4'>
        <h3 className='text-base font-bold text-zinc-700 uppercase tracking-widest'>
          Lesson Overview
        </h3>
        {currentLesson.content ? (
          <div
            className='course-description-content font-sans select-text text-base font-semibold text-zinc-600 leading-relaxed'
            dangerouslySetInnerHTML={{ __html: currentLesson.content }}
          />
        ) : (
          <p className='text-base font-semibold text-zinc-600 leading-relaxed font-sans select-text'>
            {currentLesson.lessonType === 'live'
              ? 'Join this dynamic live webinar class. Be sure to log in a few minutes before the schedule, ensure your internet connection is robust, and have your code editor prepared. This live stream incorporates instructor coding demonstrations, conceptual deep dives, and student code review. Recordings are automatically catalogued here once the broadcast concludes.'
              : 'This high-definition recorded syllabus session includes detailed explanations and step-by-step instructions. We strongly advise pausing the video to implement matching exercises, reviewing linked reference materials, and working through the assignments at your own comfortable pace.'}
          </p>
        )}
      </div>

      {/* Verified Instructor footer within widget */}
      <div className='border-t border-slate-100 pt-5 flex items-center gap-3'>
        <div className='h-10 w-10 rounded-lg bg-[#E61C24]/8 border border-[#E61C24]/15 flex items-center justify-center font-bold text-base text-[#E61C24] uppercase shrink-0'>
          {course.instructor?.name
            ? course.instructor.name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
            : 'EX'}
        </div>
        <div>
          <p className='text-xs font-bold text-zinc-450 uppercase tracking-wider'>
            Assigned Instructor
          </p>
          <p className='text-base font-bold text-zinc-800 leading-tight'>
            {course.instructor?.name || 'Expert Instructor'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className='bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col max-h-[750px]'>
      <div className='px-6 py-5 border-b border-slate-100 select-none'>
        <h2 className='text-lg font-bold text-zinc-900'>Syllabus Curriculum</h2>
        <p className='text-sm font-semibold text-zinc-450 mt-0.5'>
          Explore dynamic course lessons
        </p>
      </div>

      {/* Dynamic Certificate widget */}
      {progressPercentage === 100 && (
        <div className='mx-4 mt-4 p-4 bg-slate-50 border border-zinc-200 rounded-lg flex flex-col gap-3 shadow-sm select-none animate-fadeIn'>
          <div className='flex items-center gap-2'>
            <FiAward className='h-6 w-6 text-[#E61C24]' />
            <h3 className='text-base font-bold text-zinc-900 leading-tight'>
              Course Completed! 🎓
            </h3>
          </div>

          {!certRequest ? (
            <div className='space-y-3'>
              <p className='text-sm font-semibold text-zinc-500 leading-relaxed animate-pulse'>
                Congratulations on completing the course! Creating your
                completion certificate request...
              </p>
              <div className='w-full h-1.5 bg-slate-200 rounded-lg overflow-hidden'>
                <div
                  className='h-full bg-[#E61C24] rounded-lg animate-pulse'
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          ) : certRequest.status === 'pending' ? (
            <div className='space-y-2'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider'>
                <FiClock className='h-3.5 w-3.5 animate-pulse' />
                Pending Admin Review
              </div>
              <p className='text-sm font-semibold text-zinc-500 leading-relaxed mt-1'>
                Your certificate request is received. The admin will verify your
                lecture progress and publish the PDF shortly.
              </p>
            </div>
          ) : certRequest.status === 'approved' &&
            certRequest.certificateUrl ? (
            <div className='space-y-3'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-wider'>
                <FiCheckCircle className='h-3.5 w-3.5' />
                Released
              </div>
              <p className='text-sm font-semibold text-zinc-500 leading-relaxed'>
                Your official verified student completion certificate is
                available for download below!
              </p>
              <a
                href={certRequest.certificateUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/15 hover:scale-[1.01] transition-all cursor-pointer border-none text-center flex items-center justify-center gap-1.5'
              >
                <span>Download Certificate (PDF)</span>
                <FiExternalLink className='h-4 w-4' />
              </a>
            </div>
          ) : (
            <div className='space-y-2'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wider'>
                <FiXCircle className='h-3.5 w-3.5' />
                Rejected
              </div>
              <p className='text-sm font-semibold text-zinc-500 leading-relaxed mt-1'>
                Your certificate request was rejected. Please review admin
                annotations or contact support.
              </p>
            </div>
          )}
        </div>
      )}

      <div className='flex-grow flex-shrink flex-1 overflow-y-auto p-4 space-y-4 max-h-[650px] pr-2 bg-slate-50/50'>
        {moduleGroups.map((group) => {
          const isModuleExpanded = !!expandedModules[group.name];
          const lectureCount = group.lessons.length;

          return (
            <div
              key={group.name}
              className='border border-[#E61C24]/25 rounded-lg bg-white overflow-hidden shadow-sm'
            >
              {/* Module Header (Clickable toggle) */}
              <button
                type='button'
                onClick={() => {
                  setExpandedModules((prev) => ({
                    ...prev,
                    [group.name]: !prev[group.name],
                  }));
                }}
                className='w-full px-4 py-3 flex items-center justify-between text-left bg-[#fcfbfe] border-b border-[#E61C24]/20 hover:bg-zinc-50/40 transition-colors select-none cursor-pointer'
              >
                <div className='min-w-0 pr-2'>
                  <h4 className='font-bold text-zinc-850 text-sm leading-tight truncate'>
                    {group.name}
                  </h4>
                  <p className='text-[11px] font-bold text-zinc-450 uppercase tracking-wide mt-0.5'>
                    {lectureCount} {lectureCount === 1 ? 'lesson' : 'lessons'}
                  </p>
                </div>
                <span className='text-zinc-400 shrink-0'>
                  <FiChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isModuleExpanded ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {/* Module Lessons list */}
              {isModuleExpanded && (
                <div className='divide-y divide-[#E61C24]/15'>
                  {group.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLesson.id;
                    const isCompleted = completedLessonIds.includes(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setActiveLesson(lesson);
                          router.replace(
                            `/courses/${course.slug}/watch?lesson=${lesson.id}`,
                          );
                        }}
                        className={`w-full flex items-start gap-3 p-3 text-left transition-all duration-150 cursor-pointer ${
                          isActive
                            ? 'bg-[#E61C24]/8 text-zinc-900 font-bold'
                            : 'hover:bg-slate-50 text-zinc-750 hover:text-zinc-900'
                        }`}
                      >
                        {/* Checkmark or Type Icon */}
                        <div className='shrink-0 mt-0.5'>
                          {isCompleted ? (
                            <FiCheckCircle className='h-4.5 w-4.5 text-emerald-600 fill-emerald-50 shrink-0' />
                          ) : lesson.lessonType === 'live' ? (
                            <FiRadio
                              className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-rose-500' : 'text-rose-455'}`}
                            />
                          ) : lesson.lessonType === 'quiz' ? (
                            <FiHelpCircle
                              className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-amber-500' : 'text-amber-455'}`}
                            />
                          ) : lesson.lessonType === 'assignment' ? (
                            <FiFileText
                              className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[#E61C24]' : 'text-zinc-455'}`}
                            />
                          ) : (
                            <FiVideo
                              className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[#E61C24]' : 'text-zinc-400'}`}
                            />
                          )}
                        </div>

                        {/* Title and Duration */}
                        <div className='min-w-0 flex-1 space-y-0.5 select-none'>
                          <p
                            className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-650'}`}
                          >
                            {lesson.moduleOrder ?? lesson.order}. {lesson.title}
                          </p>
                          <div className='flex items-center gap-1.5 text-[11px] font-bold text-zinc-450 uppercase tracking-wide'>
                            <span>{lesson.duration} mins</span>
                            <span>•</span>
                            <span
                              className={
                                lesson.lessonType === 'live'
                                  ? 'text-rose-500'
                                  : lesson.lessonType === 'quiz'
                                    ? 'text-amber-500'
                                    : lesson.lessonType === 'assignment'
                                      ? 'text-[#E61C24]'
                                      : ''
                              }
                            >
                              {lesson.lessonType === 'live'
                                ? 'Live'
                                : lesson.lessonType === 'quiz'
                                  ? 'Quiz'
                                  : lesson.lessonType === 'assignment'
                                    ? 'Task'
                                    : 'Video'}
                            </span>
                          </div>
                        </div>

                        <div className='shrink-0 flex items-center justify-center text-zinc-350 self-center'>
                          <FiChevronRight className='h-4 w-4' />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className='min-h-screen bg-slate-50 font-sans text-zinc-800 pb-16 relative'>
      {/* ─── Top Course Navigation Bar (Premium Glassmorphism) ─── */}
      <div className='sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200'>
        <div className='container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none'>
          {/* Back button and title */}
          <div className='flex items-center gap-4 min-w-0'>
            <Link
              href={`/courses/${course.slug}`}
              className='h-10 w-10 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-center text-zinc-650 hover:text-zinc-800 bg-white hover:bg-slate-50 transition-colors shrink-0 shadow-sm'
              title='Back to Landing Page'
            >
              <FiArrowLeft className='h-5 w-5' />
            </Link>
            <div className='min-w-0'>
              <span className='text-xs font-bold text-[#E61C24] uppercase tracking-wider bg-[#E61C24]/8 border border-[#E61C24]/12 px-2.5 py-0.5 rounded-lg'>
                {course.category?.name || 'Course Player'}
              </span>
              <h1 className='text-lg font-bold text-zinc-900 truncate mt-1 leading-tight max-w-lg'>
                {course.title}
              </h1>
            </div>
          </div>

          {/* Controls Toggles and Progress Indicator */}
          <div className='flex items-center gap-6 shrink-0'>
            {/* Screen Toggles Action Group (Moved to the Top Navigation Bar) */}
            <div className='flex items-center gap-2 border-r border-slate-200 pr-4 shrink-0'>
              <button
                type='button'
                onClick={() => setIsTheaterMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border font-bold text-base whitespace-nowrap transition-all cursor-pointer shadow-sm ${
                  isTheaterMode
                    ? 'bg-[#E61C24] text-white border-transparent'
                    : 'bg-white border-slate-200 text-zinc-650 hover:bg-slate-50'
                }`}
                title='Toggle Theater Mode (T)'
              >
                <FiMonitor className='h-4 w-4' />
                <span className='hidden sm:inline'>Theater</span>
              </button>
              <button
                type='button'
                onClick={toggleFullscreen}
                className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-650 font-bold text-base whitespace-nowrap transition-all cursor-pointer shadow-sm'
                title='Toggle Fullscreen (F)'
              >
                <FiMaximize className='h-4 w-4' />
                <span className='hidden sm:inline'>Fullscreen</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className='flex items-center gap-4'>
              <div className='text-right hidden md:block'>
                <p className='text-xs font-bold text-zinc-700 uppercase tracking-wide'>
                  Progress
                </p>
                <p className='text-xs font-semibold text-zinc-450 mt-0.5'>
                  {completedCount}/{sortedLessons.length} ({progressPercentage}
                  %)
                </p>
              </div>
              <div className='w-20 sm:w-28 bg-zinc-200 h-2 rounded-lg overflow-hidden shrink-0'>
                <div
                  className='bg-[#E61C24] h-full rounded-lg transition-all duration-500'
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Viewport Grid ─── */}
      <div className='container mx-auto px-6 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
          {isTheaterMode ? (
            <>
              {/* Theater Mode: Full-width top player column (12 cols) */}
              <div className='lg:col-span-12'>
                {currentLesson.lessonType === 'quiz'
                  ? renderQuiz()
                  : renderPlayer()}
                <div className='mt-6 sm:mt-0'>{renderLiveJoinButton(true)}</div>
              </div>

              {/* Theater Mode details split columns at bottom */}
              <div className='lg:col-span-8'>{renderDetails()}</div>

              <div className='lg:col-span-4'>{renderSidebar()}</div>
            </>
          ) : (
            <>
              {/* Classic split screen side-by-side layout */}
              <div className='lg:col-span-8 space-y-6'>
                {currentLesson.lessonType === 'quiz'
                  ? renderQuiz()
                  : renderPlayer()}
                {renderLiveJoinButton(true)}
                {renderDetails()}
              </div>

              <div className='lg:col-span-4'>{renderSidebar()}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
