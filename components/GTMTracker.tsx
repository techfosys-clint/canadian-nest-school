'use client'

import { useEffect, useRef } from 'react'
import { sendGTMEvent } from '@next/third-parties/google'

interface GTMTrackerProps {
  event: string
  data?: Record<string, any>
}

export default function GTMTracker({ event, data = {} }: GTMTrackerProps) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (!hasFired.current) {
      sendGTMEvent({
        event,
        ...data,
      })
      hasFired.current = true
    }
  }, [event, data])

  return null
}
