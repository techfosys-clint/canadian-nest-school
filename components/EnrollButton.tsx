'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowRight, FiZap, FiCheck } from 'react-icons/fi'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

import { formatBdDate, formatBdDateTime } from '@/lib/bdTime'

type BatchOption = {
  id: string
  name: string
  startDate: string
  endDate: string
  classSchedule?: string
  orientationDate?: string
  joinClosesAt?: string | null
  seatsLeft: number | null
}

interface EnrollButtonProps {
  requiresBatch?: boolean
  courseId: string
  courseTitle: string
  courseSlug?: string
  coursePrice?: number
  courseCategory?: string
  isLoggedIn: boolean
  isAlreadyEnrolled: boolean
}

export default function EnrollButton({
  requiresBatch,
  courseId,
  courseTitle,
  courseSlug,
  coursePrice = 0,
  courseCategory = '',
  isAlreadyEnrolled,
}: EnrollButtonProps) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [loading, setLoading] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [batches, setBatches] = useState<BatchOption[]>([])

  async function chooseBatch() {
    dialog.current?.showModal()
    setLoading(true)
    setBatchError('')
    try {
      const response = await fetch(`/api/courses/${courseId}/open-batches`)
      if (!response.ok) throw new Error('Could not load batches. Please try again.')
      const data = await response.json()
      setBatches(data.batches)
      if (!data.batches.length) setBatchError('No batches are open for enrollment right now.')
    } catch {
      setBatchError('Could not load batches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollClick = async () => {
    if (isAlreadyEnrolled) {
      if (courseSlug) {
        router.push(`/courses/${courseSlug}/watch`)
      } else {
        router.push('/dashboard')
      }
    } else {
      pushToDataLayer({
        event: 'add_to_cart',
        event_id: generateEventId(),
        ecommerce: {
          currency: 'BDT',
          value: coursePrice,
          items: [{
            item_id: courseId,
            item_name: courseTitle,
            item_category: courseCategory,
            price: coursePrice,
            quantity: 1
          }]
        }
      })
      if (requiresBatch) await chooseBatch()
      else router.push(`/checkout/${courseId}`)
    }
  }

  // Render State 1: Enrolled
  if (isAlreadyEnrolled) {
    return (
      <button
        onClick={handleEnrollClick}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 text-[#E61C24] border border-[#E61C24]/30 font-bold text-base transition-all duration-300 cursor-pointer"
      >
        <FiCheck className="h-4.5 w-4.5 shrink-0" />
        <span>Go to Course</span>
      </button>
    )
  }

  return (
    <>
    <button
      onClick={handleEnrollClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 whitespace-nowrap ${
        loading ? 'opacity-80 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <FiZap className="h-5 w-5 fill-white" />
      )}
      <span>{loading ? 'Processing Enrollment...' : 'Enroll In Course'}</span>
    </button>
    <dialog ref={dialog} aria-label='Choose your batch'
      className='fixed inset-0 m-auto w-[min(94vw,58rem)] max-h-[85dvh] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 backdrop:bg-slate-950/50'>
      <div className='flex items-center justify-between gap-4'>
        <h2 className='text-xl font-bold'>Choose your batch</h2>
        <button type='button' onClick={() => dialog.current?.close()} className='rounded-lg border border-zinc-200 px-3 py-2'>Close</button>
      </div>
      <div className='mt-4 space-y-3'>
        {loading && <p role='status'>Loading batches…</p>}
        {batchError && <p role='status'>{batchError}</p>}
        {!loading && !batchError && batches.map(batch => (
          <article key={batch.id} className='flex flex-col rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-sm'>
            <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
              <h3 className='text-lg font-bold text-[#0A163A]'>{batch.name}</h3>
              {batch.seatsLeft !== null && (
                <span className='text-base font-semibold text-slate-700'>
                  {batch.seatsLeft} {batch.seatsLeft === 1 ? 'seat' : 'seats'} left
                </span>
              )}
            </div>
            <dl className='my-3 grid grow grid-cols-2 gap-x-4 gap-y-2 text-base text-slate-700 md:grid-cols-4'>
              <div>
                <dt className='font-semibold'>Batch starts</dt>
                <dd>{formatBdDate(batch.startDate)}</dd>
              </div>
              <div>
                <dt className='font-semibold'>Batch ends</dt>
                <dd>{formatBdDate(batch.endDate)}</dd>
              </div>
              <div>
                <dt className='font-semibold'>Class days and times</dt>
                <dd>{batch.classSchedule || 'To be announced'}</dd>
              </div>
              <div>
                <dt className='font-semibold'>Orientation</dt>
                <dd>{batch.orientationDate ? formatBdDate(batch.orientationDate) : 'To be announced'}</dd>
              </div>
              {batch.joinClosesAt && (
                <div className='col-span-2'>
                  <dt className='font-semibold'>Enrollment closes</dt>
                  <dd>{formatBdDateTime(batch.joinClosesAt)} (Dhaka time)</dd>
                </div>
              )}
            </dl>
            <button
              type='button'
              aria-label={`Select ${batch.name}`}
              className='inline-flex w-full items-center justify-center gap-2 self-start rounded-lg bg-[#E61C24] px-4 py-2.5 text-base font-bold text-white hover:bg-[#c5141b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:w-auto'
              onClick={() => {
                dialog.current?.close()
                router.push(`/checkout/${courseId}?batch=${encodeURIComponent(batch.id)}`)
              }}
            >
              Select batch <FiArrowRight aria-hidden='true' />
            </button>
          </article>
        ))}
      </div>
    </dialog>
    </>
  )
}
