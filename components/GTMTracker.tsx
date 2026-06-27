'use client'

import { useEffect, useRef } from 'react'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

interface GTMTrackerProps {
  event: string
  data?: Record<string, any>
}

export default function GTMTracker({ event, data = {} }: GTMTrackerProps) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (!hasFired.current) {
      pushToDataLayer({
        event,
        event_id: generateEventId(),
        ...data,
      })
      hasFired.current = true
    }
  }, [event, data])

  return null
}
