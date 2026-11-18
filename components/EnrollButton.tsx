'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiZap, FiCheck } from 'react-icons/fi'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

import { useLocale } from '@/context/LocaleContext'

type BatchOption = {
  id: string
  name: string
  startDate: string
  endDate: string
  firstClassAt?: string
  classSchedule?: string
  orientationDate?: string
  joinClosesAt?: string | null
  seatsLeft: number | null
}

interface EnrollButtonProps {
  requiresBatch?: boolean
  thumbnail?: string
  classCount?: number
  level?: string
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
  thumbnail,
  classCount,
  level,
  courseId,
  courseTitle,
  courseSlug,
  coursePrice = 0,
  courseCategory = '',
  isAlreadyEnrolled,
}: EnrollButtonProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const t = (english: string, bangla: string) => locale === 'bn' ? bangla : english
  const [selectedBatch, setSelectedBatch] = useState('')
  const date = (value: string, time = false) => new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    timeZone: 'Asia/Dhaka', dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}),
  }).format(new Date(value))
  const checkout = (batch?: string) => {
    const query = new URLSearchParams({ lang: locale })
    if (batch) query.set('batch', batch)
    router.push(`/checkout/${courseId}?${query}`)
  }
  const dialog = useRef<HTMLDialogElement>(null)
  const [loading, setLoading] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [batches, setBatches] = useState<BatchOption[]>([])

  async function chooseBatch() {
    setSelectedBatch('')
    dialog.current?.showModal()
    setLoading(true)
    setBatchError('')
    try {
      const response = await fetch(`/api/courses/${courseId}/open-batches`)
      if (!response.ok) throw new Error('Could not load batches. Please try again.')
      const data = await response.json()
      setBatches(data.batches)
      if (!data.batches.length) setBatchError(t('No batches are open for enrollment right now.', 'এই মুহূর্তে কোনো ব্যাচে ভর্তি খোলা নেই।'))
    } catch {
      setBatchError(t('Could not load batches. Please try again.', 'ব্যাচ লোড করা যায়নি। আবার চেষ্টা করুন।'))
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
      else checkout()
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
      <span>{loading ? 'Processing Enrollment...' : t('Enroll In Course', 'কোর্সে ভর্তি হন')}</span>
    </button>
    <dialog ref={dialog} aria-label={t('Choose your batch', 'ব্যাচ নির্বাচন করুন')}
      className='fixed inset-0 m-auto w-[min(94vw,58rem)] max-h-[85dvh] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 backdrop:bg-slate-950/50'>
      <div className='flex items-center justify-between gap-4'>
        <h2 className='text-xl font-bold'>{t('Choose your batch', 'ব্যাচ নির্বাচন করুন')}</h2>
        <button type='button' onClick={() => dialog.current?.close()} className='rounded-lg border border-zinc-200 px-3 py-2'>{t('Close', 'বন্ধ করুন')}</button>
      </div>
      <div className='my-4 flex items-center gap-4 border-b border-slate-200 pb-4'>
        {thumbnail && <img src={thumbnail} alt='' className='h-16 w-24 rounded-lg object-cover' />}
        <div>
          <p className='font-bold text-slate-900'>{courseTitle}</p>
          <p className='text-base text-slate-600'>
            {classCount ? `${classCount.toLocaleString(locale)} ${t('classes', 'ক্লাস')}` : ''}
            {level ? ` · ${level}` : ''}
          </p>
        </div>
      </div>
      <div className='max-h-[52dvh] space-y-3 overflow-y-auto p-1' role='radiogroup' aria-label={t('Available batches', 'উপলব্ধ ব্যাচ')}>
        {loading && <p role='status'>{t('Loading batches…', 'ব্যাচ লোড হচ্ছে…')}</p>}
        {batchError && <p role='status'>{batchError}</p>}
        {!loading && !batchError && batches.map(batch => (
          <label key={batch.id} className={`block cursor-pointer rounded-lg border p-4 ${selectedBatch === batch.id ? 'border-red-600 bg-red-50' : 'border-slate-300 bg-slate-50'}`}>
            <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
              <span className='flex items-center gap-3 font-bold text-[#0A163A]'><input type='radio' name='enrollment-batch' checked={selectedBatch === batch.id} onChange={() => setSelectedBatch(batch.id)} />{batch.name}</span>
              {batch.seatsLeft !== null && (
                <span className='text-base font-semibold text-slate-700'>
                  {locale === 'bn' ? `${batch.seatsLeft.toLocaleString('bn-BD')}টি আসন বাকি` : `${batch.seatsLeft} ${batch.seatsLeft === 1 ? 'seat' : 'seats'} left`}
                </span>
              )}
            </div>
            <dl className='my-3 grid grow grid-cols-2 gap-x-4 gap-y-2 text-base text-slate-700 md:grid-cols-4'>
              <div>
                <dt className='font-semibold'>{t('Batch starts', 'ব্যাচ শুরু')}</dt>
                <dd>{date(batch.startDate)}</dd>
              </div>
              <div>
                <dt className='font-semibold'>{t('Batch ends', 'ব্যাচ শেষ')}</dt>
                <dd>{date(batch.endDate)}</dd>
              </div>
              {batch.firstClassAt && <div>
                <dt className='font-semibold'>{t('First class', 'প্রথম ক্লাস')}</dt>
                <dd>{date(batch.firstClassAt, true)}</dd>
              </div>}
              <div>
                <dt className='font-semibold'>{t('Class days and times', 'ক্লাসের দিন ও সময়')}</dt>
                <dd>{batch.classSchedule || t('To be announced', 'পরে জানানো হবে')}</dd>
              </div>
              <div>
                <dt className='font-semibold'>{t('Orientation', 'ওরিয়েন্টেশন')}</dt>
                <dd>{batch.orientationDate ? date(batch.orientationDate, !batch.orientationDate.includes('T00:00:00.000Z') && !batch.orientationDate.includes('T18:00:00.000Z')) : t('To be announced', 'পরে জানানো হবে')}</dd>
              </div>
              {batch.joinClosesAt && (
                <div className='col-span-2'>
                  <dt className='font-semibold'>{t('Enrollment closes', 'ভর্তির শেষ সময়')}</dt>
                  <dd>{date(batch.joinClosesAt, true)} (Dhaka time)</dd>
                </div>
              )}
            </dl>
          </label>
        ))}
      </div>
      <div className='mt-4 flex justify-end border-t border-slate-200 pt-4'>
        <button type='button' disabled={!selectedBatch} onClick={() => { dialog.current?.close(); checkout(selectedBatch) }}
          className='rounded-lg bg-[#E61C24] px-5 py-3 font-bold text-white disabled:opacity-50'>
          {t('Continue', 'এগিয়ে যান')}
        </button>
      </div>
    </dialog>
    </>
  )
}
