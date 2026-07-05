'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FiVideo, FiRadio, FiEye, FiChevronDown, FiChevronUp, FiX, FiPlay, FiLock, FiHelpCircle, FiFileText } from 'react-icons/fi'

interface LessonItem {
  id: string
  title: string
  slug: string
  order: number
  moduleOrder?: number
  moduleName?: string
  lessonType: 'recorded' | 'live' | 'quiz' | 'assignment'
  duration: number
  isPreviewable: boolean
  livePlatform?: string
  liveDate?: string
  videoUrl?: string
  liveUrl?: string
}

function getEmbedUrl(videoUrl: string): string {
  if (!videoUrl) return ''
  
  // YouTube standard & shorts & sharing formats
  const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
  }
  
  // Vimeo
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
  }
  
  return videoUrl
}

export default function LessonsAccordion({
  lessons,
  isEnrolled = false,
  courseSlug,
  courseModules = [],
}: {
  lessons: LessonItem[]
  isEnrolled?: boolean
  courseSlug?: string
  courseModules?: string[]
}) {
  const [openModuleIndex, setOpenModuleIndex] = useState<number | null>(0)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)

  // Ticking clock so live class links unlock exactly on schedule
  const [nowTs, setNowTs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleAccordion = (index: number) => {
    setOpenModuleIndex(openModuleIndex === index ? null : index)
  }

  // Group lessons by moduleName. Grouping is normalized (trimmed + lowercased)
  // so a module name that differs from course.modules only by case or stray
  // whitespace (e.g. "Module 1" vs "module 1 ") doesn't create a second,
  // visually-identical group — that previously produced two array entries
  // with the same displayed name and the same React `key`, which made one
  // of them (often the one that actually had lessons) fail to render.
  const normalize = (s: string) => s.trim().toLowerCase()

  const grouped: Record<string, LessonItem[]> = {}
  const displayName: Record<string, string> = {}

  // course.modules is the admin's canonical, most recently renamed list —
  // prefer its casing/spacing as the display name whenever a lesson's
  // moduleName normalizes to the same key.
  courseModules.forEach((name) => {
    const key = normalize(name)
    displayName[key] = name
  })

  lessons.forEach((lesson) => {
    const raw = lesson.moduleName || 'General Module'
    const key = normalize(raw)
    if (!grouped[key]) {
      grouped[key] = []
      if (!displayName[key]) displayName[key] = raw
    }
    grouped[key].push(lesson)
  })

  // A module the admin has created but hasn't added any lessons to yet
  // still has an entry in courseModules — give it an (empty) group so it
  // shows up on the public page instead of silently disappearing.
  courseModules.forEach((name) => {
    const key = normalize(name)
    if (!grouped[key]) grouped[key] = []
  })

  const declaredOrder = new Map(courseModules.map((name, idx) => [normalize(name), idx]))

  // Convert to array and sort modules primarily by their declared position
  // in the admin's module list (respects manual up/down reordering); modules
  // not in that list (e.g. legacy lessons predating the modules feature)
  // fall back to sorting by their lessons' minimum order.
  const moduleGroups = Object.keys(grouped).map((key) => {
    // Sort by position within the module when available, falling back to
    // the course-wide serial for older lessons without moduleOrder.
    const moduleLessons = [...grouped[key]].sort(
      (a, b) => (a.moduleOrder ?? a.order) - (b.moduleOrder ?? b.order)
    )
    const minOrder = moduleLessons.length > 0 ? Math.min(...moduleLessons.map((l) => l.order)) : Number.MAX_SAFE_INTEGER
    const totalDuration = moduleLessons.reduce((sum, l) => sum + l.duration, 0)
    const declaredIndex = declaredOrder.has(key) ? declaredOrder.get(key)! : Number.MAX_SAFE_INTEGER
    return {
      key,
      name: displayName[key] || key,
      lessons: moduleLessons,
      minOrder,
      totalDuration,
      declaredIndex,
    }
  })

  moduleGroups.sort((a, b) => {
    if (a.declaredIndex !== b.declaredIndex) return a.declaredIndex - b.declaredIndex
    return a.minOrder - b.minOrder
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#0A163A] mb-1 tracking-tight">Course Curriculum</h2>
        <p className="text-base font-semibold text-zinc-550">
          Explore the lessons and interactive live sessions included in this syllabus
        </p>
      </div>

      <div className="space-y-3 bg-transparent">
        {moduleGroups.map((group, groupIdx) => {
          const isOpen = openModuleIndex === groupIdx
          const lectureCount = group.lessons.length
          const totalMin = group.totalDuration

          return (
            <div 
              key={group.key} 
              className="bg-white rounded-lg overflow-hidden border border-zinc-200/80 hover:border-[#E61C24]/30 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(230,28,36,0.03)] transition-all duration-300 select-text"
            >
              {/* Accordion Header (Module Title) */}
              <button
                type="button"
                onClick={() => toggleAccordion(groupIdx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50/40 transition-colors cursor-pointer select-text bg-[#fcfbfe]"
              >
                <div className="flex flex-col gap-1 min-w-0 pr-4">
                  <h3 className="font-bold text-[#0A163A] text-lg leading-snug truncate">
                    {group.name}
                  </h3>
                  <p className="text-base font-semibold text-zinc-550">
                    {lectureCount === 0
                      ? 'Coming soon — no lectures added yet'
                      : `${lectureCount} ${lectureCount === 1 ? 'lecture' : 'lectures'} • ${totalMin} mins total duration`}
                  </p>
                </div>

                <span className="text-zinc-455 shrink-0">
                  {isOpen ? (
                    <FiChevronUp className="h-5 w-5" />
                  ) : (
                    <FiChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>

              {/* Accordion Body (List of Lessons inside Module) */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#E61C24]/20 divide-y divide-[#E61C24]/10 bg-white">
                      {group.lessons.length === 0 && (
                        <div className="px-6 py-6 text-center">
                          <p className="text-base font-semibold text-zinc-450">
                            No lessons have been added to this module yet. Check back soon!
                          </p>
                        </div>
                      )}
                      {group.lessons.map((lesson) => {
                        const dateObj = lesson.liveDate ? new Date(lesson.liveDate) : null
                        const isLiveLocked = dateObj ? dateObj.getTime() > nowTs : false
                        const formattedDate = dateObj
                          ? dateObj.toLocaleString('en-BD', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Dhaka',
                            })
                          : null

                        return (
                          <div 
                            key={lesson.id} 
                            className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Lesson Icon */}
                              <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                lesson.lessonType === 'live'
                                  ? 'bg-rose-50 text-rose-500 border border-rose-100'
                                  : lesson.lessonType === 'quiz'
                                  ? 'bg-amber-50 text-amber-500 border border-amber-100'
                                  : lesson.lessonType === 'assignment'
                                  ? 'bg-[#E61C24]/10 text-[#E61C24] border border-[#E61C24]/20'
                                  : 'bg-zinc-50 text-zinc-500 border border-zinc-150'
                              }`}>
                                {lesson.lessonType === 'live' ? (
                                  <FiRadio className="h-4.5 w-4.5" />
                                ) : lesson.lessonType === 'quiz' ? (
                                  <FiHelpCircle className="h-4.5 w-4.5" />
                                ) : lesson.lessonType === 'assignment' ? (
                                  <FiFileText className="h-4.5 w-4.5" />
                                ) : (
                                  <FiVideo className="h-4.5 w-4.5" />
                                )}
                              </span>

                              {/* Lesson Title & duration */}
                              <div className="min-w-0">
                                <p className="font-bold text-[#0A163A] text-base leading-snug truncate">
                                  {lesson.moduleOrder ?? lesson.order}. {lesson.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-455 mt-1 uppercase tracking-wide">
                                  <span>{lesson.duration} mins duration</span>
                                  {lesson.lessonType === 'live' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-rose-500 font-bold">Live • {lesson.livePlatform || 'Zoom'}</span>
                                      {formattedDate && <span>(Starts: {formattedDate})</span>}
                                    </>
                                  )}
                                  {lesson.lessonType === 'quiz' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-500 font-bold">Interactive Quiz</span>
                                    </>
                                  )}
                                  {lesson.lessonType === 'assignment' && (
                                    <>
                                      <span>•</span>
                                       <span className="text-[#E61C24] font-bold">Assignment</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lesson Actions */}
                            <div className="flex items-center gap-3 shrink-0 sm:ml-4 self-start sm:self-center">
                              {/* If not enrolled */}
                              {!isEnrolled ? (
                                <>
                                  {lesson.isPreviewable && lesson.lessonType === 'live' && lesson.liveUrl && isLiveLocked ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-lg text-sm font-bold cursor-not-allowed select-none"
                                      title="The join link unlocks when the class starts"
                                    >
                                      <FiLock className="h-3.5 w-3.5 text-[#E61C24]" />
                                      <span>Unlocks at class time</span>
                                    </span>
                                  ) : lesson.isPreviewable && lesson.lessonType === 'live' && lesson.liveUrl ? (
                                    <a
                                      href={lesson.liveUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                                    >
                                      <FiRadio className="h-3.5 w-3.5 animate-pulse" />
                                      <span>Join Live Preview</span>
                                    </a>
                                  ) : lesson.isPreviewable && lesson.videoUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (lesson.videoUrl) setActiveVideoUrl(lesson.videoUrl)
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                                    >
                                      <FiPlay className="h-3.5 w-3.5 fill-emerald-700" />
                                      <span>Free Preview</span>
                                    </button>
                                  ) : (
                                    <span className="text-zinc-350 p-2 border border-dashed border-zinc-200 bg-zinc-50/50 rounded-lg flex items-center justify-center cursor-not-allowed select-none" title="Enroll to unlock">
                                      <FiLock className="h-4 w-4 text-zinc-400" />
                                    </span>
                                  )}
                                </>
                              ) : (
                                /* If enrolled */
                                <>
                                  {lesson.videoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (lesson.videoUrl) setActiveVideoUrl(lesson.videoUrl)
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                                    >
                                      <FiPlay className="h-3.5 w-3.5 text-zinc-700" />
                                      <span>Play</span>
                                    </button>
                                  )}

                                  {courseSlug && (
                                    <Link
                                      href={`/courses/${courseSlug}/watch?lesson=${lesson.id}`}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E61C24] hover:bg-[#c5141b] text-white border border-transparent rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                                    >
                                      <FiVideo className="h-3.5 w-3.5" />
                                      <span>Open Watch Room</span>
                                    </Link>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Video Preview Popup Modal (Glassmorphic Backdrop Blur) */}
      <AnimatePresence>
        {activeVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveVideoUrl(null)}
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-slate-900 border border-white/10 rounded-lg overflow-hidden shadow-2xl w-full max-w-4xl aspect-video relative z-10"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveVideoUrl(null)}
                className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
              >
                <FiX className="h-5 w-5" />
              </button>

              {/* iframe / Video Box */}
              <div className="w-full h-full relative">
                {getEmbedUrl(activeVideoUrl) ? (
                  <iframe
                    src={getEmbedUrl(activeVideoUrl)}
                    title="Course Video Preview"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
                    <p className="text-base font-bold">Unsupported video format or missing URL</p>
                    <p className="text-base text-zinc-400 mt-2 select-text">URL: {activeVideoUrl}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
