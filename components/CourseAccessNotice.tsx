'use client'

import { useSearchParams } from 'next/navigation'

export default function CourseAccessNotice() {
  const reason = useSearchParams().get('courseAccess')
  const message = reason === 'blocked'
    ? 'Course access is paused. Renew your subscription to continue learning.'
    : reason === 'enrollment'
      ? 'Course access requires a completed enrollment on this account.'
      : reason === 'unavailable'
        ? 'This course is currently unavailable.'
        : null

  if (!message) return null

  return (
    <div className='bg-amber-50 border-b border-amber-200'>
      <p role='alert' className='container mx-auto px-6 py-4 text-base font-semibold text-amber-900'>
        {message}
      </p>
    </div>
  )
}
