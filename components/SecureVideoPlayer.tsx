'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FiLock, FiAlertTriangle } from 'react-icons/fi'

interface SecureVideoPlayerProps {
  lessonId: string
  title: string
}

// Persistent per-browser device id used for the concurrent-device limit.
function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem('ts-device-id')
    if (!id) {
      id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem('ts-device-id', id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

/**
 * Plays a private R2-hosted lesson video.
 *
 * 1. Calls the authorize endpoint (verifies login/enrollment, registers the
 *    device for the concurrent-device limit, surfaces nice error messages).
 * 2. Points <video> at the same-origin byte proxy `/api/stream/<id>/play`, so
 *    the real Cloudflare R2 URL is NEVER visible in devtools / Network tab.
 */
export default function SecureVideoPlayer({ lessonId, title }: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authorizeAndLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const deviceId = getDeviceId()
      const res = await fetch(`/api/stream/${lessonId}?d=${encodeURIComponent(deviceId)}`, {
        credentials: 'include',
        headers: { 'x-device-id': deviceId },
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to load this video.')
      }

      const video = videoRef.current
      if (!video) return
      // Same-origin proxy — the R2 URL stays server-side. deviceId is passed so
      // the proxy can keep the session fresh on reload.
      video.src = `/api/stream/${lessonId}/play?d=${encodeURIComponent(deviceId)}`
      video.load()
      setLoading(false)
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Unable to load this video.')
    }
  }, [lessonId])

  useEffect(() => {
    authorizeAndLoad()
  }, [authorizeAndLoad])

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950 text-white select-none">
        <FiAlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <p className="text-base font-bold mb-1">Playback Unavailable</p>
        <p className="text-base font-semibold text-zinc-400 max-w-sm leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={authorizeAndLoad}
          className="mt-4 py-2 px-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-black">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-10">
          <FiLock className="h-8 w-8 text-[#E61C24] mb-3 animate-pulse" />
          <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-base font-semibold text-zinc-400 mt-3">Securing stream…</p>
        </div>
      )}
      <video
        ref={videoRef}
        title={title}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        onError={() => {
          if (!loading) setError('Playback was interrupted. Please try again.')
        }}
        className="w-full h-full animate-fade-in bg-black"
      />
    </div>
  )
}
