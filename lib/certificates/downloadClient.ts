'use client'

import Swal from 'sweetalert2'
import {
  canDownloadCertificate,
  hasSubmittedRequiredReviews,
  type CompletionReviewState,
} from '@/lib/reviews/completionGate'

type DownloadOpts = {
  courseId: string
  courseTitle: string
  gate?: CompletionReviewState
  onNeedReviews?: (courseId: string) => void
  onViewStatus?: (courseId: string) => void
}

/**
 * Downloads a course certificate PDF once required reviews are submitted.
 * Staff approval is not required for download.
 */
export async function downloadCourseCertificate(
  opts: DownloadOpts,
): Promise<'downloaded' | 'needs_reviews' | 'rejected' | 'error'> {
  const { courseId, courseTitle, gate, onNeedReviews, onViewStatus } = opts

  if (gate && !hasSubmittedRequiredReviews(gate)) {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Reviews Required',
      text: 'Please rate the course and teachers to unlock your certificate download.',
      showCancelButton: true,
      confirmButtonText: 'Leave Reviews',
      cancelButtonText: 'Later',
      confirmButtonColor: '#E61C24',
      background: '#ffffff',
      color: '#1e293b',
    })
    if (result.isConfirmed) onNeedReviews?.(courseId)
    return 'needs_reviews'
  }

  if (gate && !canDownloadCertificate(gate)) {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Reviews Rejected',
      text: 'Please resubmit your course and teacher reviews to unlock the certificate.',
      showCancelButton: true,
      confirmButtonText: 'Resubmit Reviews',
      cancelButtonText: 'OK',
      confirmButtonColor: '#E61C24',
      background: '#ffffff',
      color: '#1e293b',
    })
    if (result.isConfirmed) {
      onNeedReviews?.(courseId)
      onViewStatus?.(courseId)
    }
    return 'rejected'
  }

  try {
    const res = await fetch(`/api/certificates/download?courseId=${courseId}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.code === 'REVIEWS_REQUIRED' || data.redirectTo) {
        if (data.code === 'REVIEWS_REJECTED') {
          const result = await Swal.fire({
            icon: 'info',
            title: 'Reviews Rejected',
            text:
              data.error ||
              'Please resubmit your reviews to unlock the certificate.',
            showCancelButton: true,
            confirmButtonText: 'Resubmit Reviews',
            cancelButtonText: 'OK',
            confirmButtonColor: '#E61C24',
            background: '#ffffff',
            color: '#1e293b',
          })
          if (result.isConfirmed) onNeedReviews?.(courseId)
          return 'rejected'
        }

        const result = await Swal.fire({
          icon: 'info',
          title: 'Reviews Required',
          text:
            data.error ||
            'Please leave course and teacher reviews before downloading your certificate.',
          showCancelButton: true,
          confirmButtonText: 'Leave Reviews',
          cancelButtonText: 'Later',
          confirmButtonColor: '#E61C24',
          background: '#ffffff',
          color: '#1e293b',
        })
        if (result.isConfirmed) onNeedReviews?.(courseId)
        return 'needs_reviews'
      }
      throw new Error(data.error || 'Unable to download certificate.')
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${courseTitle.replace(/[^a-zA-Z0-9-_]+/g, '-')}-certificate.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Could not generate your certificate PDF.'
    const result = await Swal.fire({
      icon: 'error',
      title: 'Download Failed',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'My Certificates',
      cancelButtonText: 'Close',
      background: '#ffffff',
      color: '#1e293b',
      confirmButtonColor: '#E61C24',
    })
    if (result.isConfirmed && typeof window !== 'undefined') {
      window.location.href = '/dashboard/certificates'
    }
    return 'error'
  }
}

/** Load review gates for completed courses (parallel, small N). */
export async function fetchReviewGatesForCourses(
  courseIds: string[],
): Promise<Record<string, CompletionReviewState>> {
  const unique = [...new Set(courseIds.filter(Boolean))]
  const entries = await Promise.all(
    unique.map(async (courseId) => {
      try {
        const res = await fetch(
          `/api/completion-reviews?courseId=${encodeURIComponent(courseId)}`,
        )
        const data = await res.json()
        if (!res.ok || !data.success) return null
        return [
          courseId,
          {
            courseReviewStatus: data.courseReviewStatus || 'idle',
            teacherReviewStatus: data.teacherReviewStatus || 'idle',
          } satisfies CompletionReviewState,
        ] as const
      } catch {
        return null
      }
    }),
  )

  const map: Record<string, CompletionReviewState> = {}
  for (const entry of entries) {
    if (entry) map[entry[0]] = entry[1]
  }
  return map
}
