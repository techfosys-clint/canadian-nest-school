import { useEffect, useState } from 'react'

type LiveSession = { liveDate?: string | null; duration?: number }

export function selectFeaturedLiveClass<T extends LiveSession>(sessions: T[], now: number) {
  const remaining = sessions
    .flatMap((session) => {
      if (!session.liveDate) return []
      const start = Date.parse(session.liveDate)
      const duration = session.duration && session.duration > 0 ? session.duration : 60
      return start + duration * 60_000 > now ? [{ session, start }] : []
    })
    .sort((a, b) => a.start - b.start)
  return remaining[0]?.session ?? null
}

export function useFeaturedLiveClass<T extends LiveSession>(sessions: T[]) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return { featuredLiveClass: selectFeaturedLiveClass(sessions, now), now }
}
