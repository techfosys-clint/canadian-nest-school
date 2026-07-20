'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FiArrowRight, FiAward, FiDownload, FiLock } from 'react-icons/fi'
import type { CompletionReviewState } from '@/lib/reviews/completionGate'
import { certCtaLabel, getCertCtaMode } from '@/lib/certificates/certCta'
import { downloadCourseCertificate } from '@/lib/certificates/downloadClient'

type Props = {
  courseId: string
  courseTitle: string
  courseSlug: string
  gate?: CompletionReviewState | null
  /** While gates are still loading */
  gateLoading?: boolean
}

/**
 * Consistent completed-course actions for Dashboard / My Courses:
 * Open Course + one status-aware certificate CTA.
 */
export default function CompletedCourseActions({
  courseId,
  courseTitle,
  courseSlug,
  gate,
  gateLoading,
}: Props) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const mode = gateLoading ? 'unknown' : getCertCtaMode(gate)
  const completeHref = `/dashboard/courses/${courseId}/complete`

  const goComplete = () => router.push(completeHref)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadCourseCertificate({
        courseId,
        courseTitle,
        gate: gate || undefined,
        onNeedReviews: goComplete,
        onViewStatus: goComplete,
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className='space-y-3'>
      <button
        type='button'
        onClick={() => router.push(`/courses/${courseSlug}/watch`)}
        className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all duration-200 cursor-pointer border-none active:scale-[0.99]'
      >
        <span>Open Course</span>
        <FiArrowRight className='h-5 w-5' />
      </button>

      {mode === 'download' && (
        <button
          type='button'
          onClick={handleDownload}
          disabled={downloading}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white border border-zinc-200/80 hover:border-emerald-400 text-emerald-700 hover:text-emerald-800 font-bold text-base transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]'
        >
          <FiDownload className='h-5 w-5' />
          <span>{certCtaLabel('download', downloading)}</span>
        </button>
      )}

      {mode === 'leave_reviews' && (
        <Link
          href={completeHref}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white border border-zinc-200/80 hover:border-[#E61C24]/40 text-zinc-700 hover:text-[#E61C24] font-bold text-base transition-all duration-200'
        >
          <FiAward className='h-5 w-5' />
          <span>{certCtaLabel('leave_reviews')}</span>
        </Link>
      )}

      {mode === 'awaiting_approval' && (
        <Link
          href={completeHref}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 hover:border-amber-300 font-bold text-base transition-all duration-200'
        >
          <FiLock className='h-5 w-5' />
          <span>{certCtaLabel('awaiting_approval')}</span>
        </Link>
      )}

      {(mode === 'unknown' || gateLoading) && (
        <Link
          href={completeHref}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white border border-zinc-200/80 hover:border-[#E61C24]/40 text-zinc-700 hover:text-[#E61C24] font-bold text-base transition-all duration-200'
        >
          <FiAward className='h-5 w-5' />
          <span>Reviews & Certificate</span>
        </Link>
      )}
    </div>
  )
}
