'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiCalendar, FiClock, FiRadio, FiExternalLink, FiVideo } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface UserSession {
  id: string
  name: string
  email: string
  role: string
}

interface LiveWebinar {
  id: string
  title: string
  slug: string
  courseTitle: string
  livePlatform: string
  liveUrl: string
  liveDate: string | null
  duration: number
}

export default function LiveClassesPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [webinars, setWebinars] = useState<LiveWebinar[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ended'>('all')

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()

        if (!sessionRes.ok || !sessionData.authenticated || (sessionData.user.role !== 'student' && sessionData.user.role !== 'admin')) {
          router.push('/login')
          return
        }
        setUser(sessionData.user)

        const webinarsRes = await fetch('/api/live-webinars')
        if (webinarsRes.ok) {
          const data = await webinarsRes.json()
          if (data.liveLessons) setWebinars(data.liveLessons)
        }
      } catch (err) {
        console.error('Failed to load live classes:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleRegisterSeat = (webinarTitle: string) => {
    Swal.fire({
      icon: 'success',
      title: 'Seat Reserved!',
      text: `You have successfully registered for: ${webinarTitle}. Join links are active below!`,
      confirmButtonColor: '#615fff',
      background: '#121829',
      color: '#ffffff',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#615fff] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-600">Loading Live Classes...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const now = Date.now()
  const filtered = webinars.filter(w => {
    if (filter === 'all') return true
    const ts = w.liveDate ? new Date(w.liveDate).getTime() : 0
    return filter === 'upcoming' ? ts > now : ts <= now
  })

  const upcomingCount = webinars.filter(w => w.liveDate && new Date(w.liveDate).getTime() > now).length

  return (
    <div className="container mx-auto px-6 py-8 pb-16 space-y-8">

      {/* Hero Banner */}
      <div className="w-full bg-[#0A163A] rounded-lg p-8 md:p-12 relative overflow-hidden border border-zinc-800/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#615fff]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#543cdf]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#615fff]/20 border border-[#615fff]/30 text-base font-bold text-[#615fff] uppercase tracking-wider mb-4">
              <FiRadio className="h-4 w-4 animate-pulse" /> Live Sessions
            </span>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-3 leading-tight">
              Live Class <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8a88ff] to-white font-bold">Broadcasts</span>
            </h1>
            <p className="text-zinc-400 text-base font-semibold leading-relaxed">
              Join real-time webinar classrooms to ask live questions, interact with instructors, and submit assignments.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-lg px-5 py-4 text-center min-w-[90px]">
              <p className="text-3xl font-bold text-white">{upcomingCount}</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Upcoming</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg px-5 py-4 text-center min-w-[90px]">
              <p className="text-3xl font-bold text-white">{webinars.length}</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1.5 w-fit shadow-sm">
        {(['all', 'upcoming', 'ended'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-5 py-2 rounded text-base font-bold capitalize transition-all cursor-pointer border-none ${
              filter === tab
                ? 'bg-[#615fff] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab === 'all' ? 'All Classes' : tab === 'upcoming' ? 'Upcoming' : 'Ended'}
          </button>
        ))}
      </div>

      {/* Classes Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center shadow-sm">
          <FiRadio className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-base font-semibold text-zinc-400">
            {filter === 'upcoming'
              ? 'No upcoming live classes scheduled for your enrolled courses.'
              : filter === 'ended'
              ? 'No ended classes found.'
              : 'No live classes are scheduled yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(webinar => {
            const dateObj = webinar.liveDate ? new Date(webinar.liveDate) : null
            const isUpcoming = dateObj ? dateObj.getTime() > now : false

            const formattedDate = dateObj
              ? dateObj.toLocaleString('en-BD', {
                  weekday: 'long',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'Date TBD'

            const platformColors: Record<string, string> = {
              zoom: 'bg-blue-50 text-blue-600 border-blue-200',
              meet: 'bg-emerald-50 text-emerald-600 border-emerald-200',
              teams: 'bg-violet-50 text-violet-600 border-violet-200',
              other: 'bg-zinc-100 text-zinc-600 border-zinc-200',
            }
            const platformColor = platformColors[webinar.livePlatform] || platformColors.other

            return (
              <div
                key={webinar.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md flex flex-col ${
                  isUpcoming ? 'border-[#615fff]/30 hover:border-[#615fff]/60' : 'border-zinc-200'
                }`}
              >
                {/* Card Top Accent */}
                <div className={`h-1.5 w-full ${isUpcoming ? 'bg-gradient-to-r from-[#615fff] to-[#8a88ff]' : 'bg-zinc-200'}`} />

                <div className="p-5 flex flex-col flex-1 gap-4">
                  {/* Status & Platform badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                      isUpcoming ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isUpcoming ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                      {isUpcoming ? 'Upcoming' : 'Ended'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${platformColor}`}>
                      {webinar.livePlatform.toUpperCase()}
                    </span>
                  </div>

                  {/* Title & Course */}
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-zinc-800 leading-snug line-clamp-2">
                      {webinar.title}
                    </h3>
                    <p className="text-sm font-semibold text-zinc-400 mt-1.5 truncate">
                      {webinar.courseTitle}
                    </p>
                  </div>

                  {/* Date & Duration */}
                  <div className="space-y-1.5 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                      <FiCalendar className="h-4 w-4 text-[#615fff] shrink-0" />
                      <span>{formattedDate}</span>
                    </div>
                    {webinar.duration > 0 && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                        <FiClock className="h-4 w-4 text-[#615fff] shrink-0" />
                        <span>{webinar.duration} minutes</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {isUpcoming && (
                      <button
                        onClick={() => handleRegisterSeat(webinar.title)}
                        className="flex-1 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white text-base font-bold transition-all cursor-pointer border-none shadow-md shadow-[#615fff]/20 flex items-center justify-center gap-1.5"
                      >
                        <FiRadio className="h-4 w-4" /> RSVP Seat
                      </button>
                    )}
                    {webinar.liveUrl && (
                      <a
                        href={webinar.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-base font-bold transition-all border ${
                          isUpcoming
                            ? 'flex-none px-4 bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                            : 'flex-1 bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        <FiVideo className="h-4 w-4" />
                        {isUpcoming ? 'Join' : 'Recording'}
                        <FiExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!webinar.liveUrl && !isUpcoming && (
                      <div className="flex-1 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-400 text-base font-bold text-center">
                        Link Unavailable
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
