'use client'

import { formatBdDate } from '@/lib/bdTime'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { FiAlertTriangle, FiLoader } from 'react-icons/fi'
import Swal from 'sweetalert2'

type Notice = {
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseSlug: string
  paidUntil: string
  isBlocked: boolean
  showOverdueNotice: boolean
  daysPastDue: number
  daysUntilDue: number
  monthlyFee: number
}

export default function SubscriptionFeeBanner() {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [payingId, setPayingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/notices', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.success && Array.isArray(data.notices)) {
        setNotices(data.notices)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handlePay = async (notice: Notice) => {
    const { value: couponCode } = await Swal.fire({
      title: `Renew — ${notice.courseTitle}`,
      html: `
        <p class="text-base text-slate-600 mb-3">
          Monthly fee: <strong>BDT ${notice.monthlyFee}</strong>
          ${notice.paidUntil ? ` · Due ${formatBdDate(notice.paidUntil)}` : ''}
        </p>
        <input id="sub-coupon" class="swal2-input" placeholder="Extension coupon (optional)" />
      `,
      showCancelButton: true,
      confirmButtonText: 'Pay with EPS',
      confirmButtonColor: '#E61C24',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const el = document.getElementById('sub-coupon') as HTMLInputElement | null
        return el?.value?.trim() || ''
      },
    })

    if (couponCode === undefined) return

    setPayingId(notice.enrollmentId)
    try {
      const res = await fetch('/api/subscriptions/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: notice.enrollmentId,
          couponCode: couponCode || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      if (res.ok && data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Subscription renewed',
          text: 'Your access has been extended.',
          confirmButtonColor: '#E61C24',
        })
        await load()
        router.refresh()
        return
      }
      throw new Error(data.error || 'Renewal failed.')
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Could not start payment',
        text: err.message || 'Please try again.',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setPayingId(null)
    }
  }

  if (notices.length === 0) return null

  return (
    <div className='space-y-3 mb-6'>
      {notices.map((n) => (
        <div
          key={n.enrollmentId}
          className='rounded-lg border border-rose-300/80 bg-rose-50 px-4 py-4 sm:px-5 sm:py-4'
        >
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex gap-3 min-w-0'>
              <FiAlertTriangle className='h-6 w-6 text-[#E61C24] shrink-0 mt-0.5' />
              <div className='min-w-0'>
                <p className='text-base font-bold text-rose-900'>
                  {n.isBlocked
                    ? 'Course access paused — monthly fee unpaid'
                    : 'Monthly fee reminder'}
                </p>
                <p className='text-base text-rose-800/90 mt-1'>
                  <span className='font-semibold'>{n.courseTitle}</span>
                  {n.paidUntil
                    ? ` · period ends ${formatBdDate(n.paidUntil)}`
                    : ''}
                  {n.isBlocked
                    ? '. Live classes and recordings are locked until you renew.'
                    : n.daysPastDue > 0
                      ? `. ${n.daysPastDue} day(s) past due — renew to keep access.`
                      : `. Due in ${Math.max(0, n.daysUntilDue)} day(s).`}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => void handlePay(n)}
              disabled={payingId === n.enrollmentId}
              className='inline-flex items-center justify-center gap-2 shrink-0 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base px-5 py-2.5 transition-colors disabled:opacity-60'
            >
              {payingId === n.enrollmentId ? (
                <>
                  <FiLoader className='h-5 w-5 animate-spin' />
                  Starting…
                </>
              ) : (
                `Pay BDT ${n.monthlyFee}`
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
