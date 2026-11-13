import { describe, expect, it } from 'vitest'
import {
  addDays,
  computeRenewalAmount,
  courseFee,
  endOfCalendarQuarterContaining,
  getSubscriptionAccessSnapshot,
  initialPaidUntil,
  initialQuarterlyPaidUntil,
  isMonthlyCourse,
  isQuarterlyCourse,
  isRecurringCourse,
  isRecurringEnrollment,
  nextCalendarQuarterEnd,
  nextPaidUntil,
} from '@/lib/subscriptions/billing'

describe('billing type helpers', () => {
  it('detects monthly / quarterly / recurring courses', () => {
    expect(isMonthlyCourse({ billingType: 'monthly' })).toBe(true)
    expect(isQuarterlyCourse({ billingType: 'quarterly' })).toBe(true)
    expect(isRecurringCourse({ billingType: 'monthly' })).toBe(true)
    expect(isRecurringCourse({ billingType: 'quarterly' })).toBe(true)
    expect(isRecurringCourse({ billingType: 'one_time' })).toBe(false)
    expect(isRecurringEnrollment({ billingType: 'quarterly' })).toBe(true)
    expect(isRecurringEnrollment({ billingType: 'one_time' })).toBe(false)
  })

  it('picks the correct fee by billing type', () => {
    expect(
      courseFee({
        billingType: 'one_time',
        price: 1000,
        monthlyFee: 500,
        quarterlyFee: 1400,
      }),
    ).toBe(1000)
    expect(
      courseFee({
        billingType: 'monthly',
        price: 1000,
        monthlyFee: 500,
        quarterlyFee: 1400,
      }),
    ).toBe(500)
    expect(
      courseFee({
        billingType: 'quarterly',
        price: 1000,
        monthlyFee: 500,
        quarterlyFee: 1400,
      }),
    ).toBe(1400)
  })
})

describe('calendar quarter paidUntil', () => {
  it('ends Q1 on 31 Mar 23:59:59.999 BD for a January batch end', () => {
    const end = endOfCalendarQuarterContaining(
      new Date('2026-01-15T10:00:00+06:00'),
    )
    expect(end.toISOString()).toBe(
      new Date('2026-03-31T23:59:59.999+06:00').toISOString(),
    )
  })

  it('ends Q2 / Q3 / Q4 on the last day of Jun / Sep / Dec', () => {
    expect(
      endOfCalendarQuarterContaining(
        new Date('2026-04-01T00:00:00+06:00'),
      ).toISOString(),
    ).toBe(new Date('2026-06-30T23:59:59.999+06:00').toISOString())

    expect(
      endOfCalendarQuarterContaining(
        new Date('2026-09-30T12:00:00+06:00'),
      ).toISOString(),
    ).toBe(new Date('2026-09-30T23:59:59.999+06:00').toISOString())

    expect(
      endOfCalendarQuarterContaining(
        new Date('2026-12-01T00:00:00+06:00'),
      ).toISOString(),
    ).toBe(new Date('2026-12-31T23:59:59.999+06:00').toISOString())
  })

  it('initialQuarterlyPaidUntil uses batch endDate quarter', () => {
    const paidUntil = initialQuarterlyPaidUntil(
      new Date('2026-05-20T00:00:00+06:00'),
    )
    expect(paidUntil.toISOString()).toBe(
      new Date('2026-06-30T23:59:59.999+06:00').toISOString(),
    )
  })

  it('nextCalendarQuarterEnd advances to the following quarter end', () => {
    const q1End = new Date('2026-03-31T23:59:59.999+06:00')
    expect(nextCalendarQuarterEnd(q1End).toISOString()).toBe(
      new Date('2026-06-30T23:59:59.999+06:00').toISOString(),
    )
  })

  it('rolls from Q4 into next year Q1', () => {
    const q4End = new Date('2026-12-31T23:59:59.999+06:00')
    expect(nextCalendarQuarterEnd(q4End).toISOString()).toBe(
      new Date('2027-03-31T23:59:59.999+06:00').toISOString(),
    )
  })
})

describe('monthly / nextPaidUntil', () => {
  it('initialPaidUntil is +30 days', () => {
    const from = new Date('2026-03-01T10:00:00.000Z')
    expect(initialPaidUntil(from).toISOString()).toBe(
      addDays(from, 30).toISOString(),
    )
  })

  it('monthly renewal adds 30 days (+ optional extension)', () => {
    const prev = new Date('2026-03-31T10:00:00.000Z')
    expect(nextPaidUntil(prev, 0, 'monthly').toISOString()).toBe(
      addDays(prev, 30).toISOString(),
    )
    expect(nextPaidUntil(prev, 3, 'monthly').toISOString()).toBe(
      addDays(prev, 33).toISOString(),
    )
  })

  it('quarterly renewal jumps to next calendar quarter end (+ extension)', () => {
    const prev = new Date('2026-03-31T23:59:59.999+06:00')
    expect(nextPaidUntil(prev, 0, 'quarterly').toISOString()).toBe(
      new Date('2026-06-30T23:59:59.999+06:00').toISOString(),
    )
    expect(nextPaidUntil(prev, 2, 'quarterly').toISOString()).toBe(
      addDays(new Date('2026-06-30T23:59:59.999+06:00'), 2).toISOString(),
    )
  })

  it('defaults billingType to monthly when omitted', () => {
    const prev = new Date('2026-01-01T00:00:00.000Z')
    expect(nextPaidUntil(prev).toISOString()).toBe(
      addDays(prev, 30).toISOString(),
    )
  })
})

describe('getSubscriptionAccessSnapshot', () => {
  const course = {
    billingType: 'monthly' as const,
    noticeStartOffsetDays: 5,
    noticeEndOffsetDays: 2,
    blockOffsetDays: 2,
  }

  it('treats one-time / incomplete enrollments as always active', () => {
    const snap = getSubscriptionAccessSnapshot(
      {
        billingType: 'one_time',
        paidUntil: undefined,
        accessStatus: 'active',
        paymentStatus: 'completed',
      },
      course,
      new Date('2026-03-10T12:00:00+06:00'),
    )
    expect(snap.isRecurring).toBe(false)
    expect(snap.isBlocked).toBe(false)
  })

  it('stays active before notice window', () => {
    const paidUntil = new Date('2026-03-20T12:00:00+06:00')
    const snap = getSubscriptionAccessSnapshot(
      {
        billingType: 'monthly',
        paidUntil,
        accessStatus: 'active',
        paymentStatus: 'completed',
      },
      course,
      new Date('2026-03-10T12:00:00+06:00'),
    )
    expect(snap.isBlocked).toBe(false)
    expect(snap.showOverdueNotice).toBe(false)
    expect(snap.billingType).toBe('monthly')
  })

  it('shows overdue notice near due date', () => {
    const paidUntil = new Date('2026-03-20T12:00:00+06:00')
    const snap = getSubscriptionAccessSnapshot(
      {
        billingType: 'quarterly',
        paidUntil,
        accessStatus: 'active',
        paymentStatus: 'completed',
      },
      { ...course, billingType: 'quarterly' },
      new Date('2026-03-18T12:00:00+06:00'),
    )
    expect(snap.showOverdueNotice).toBe(true)
    expect(snap.isBlocked).toBe(false)
    expect(snap.billingType).toBe('quarterly')
  })

  it('blocks after paidUntil + blockOffsetDays', () => {
    const paidUntil = new Date('2026-03-20T12:00:00+06:00')
    const snap = getSubscriptionAccessSnapshot(
      {
        billingType: 'monthly',
        paidUntil,
        accessStatus: 'active',
        paymentStatus: 'completed',
      },
      course,
      new Date('2026-03-22T12:00:00+06:00'),
    )
    expect(snap.isBlocked).toBe(true)
    expect(snap.accessStatus).toBe('blocked')
    expect(snap.showOverdueNotice).toBe(false)
  })

  it('honors stored accessStatus=blocked even before blockAt', () => {
    const paidUntil = new Date('2026-03-20T12:00:00+06:00')
    const snap = getSubscriptionAccessSnapshot(
      {
        billingType: 'monthly',
        paidUntil,
        accessStatus: 'blocked',
        paymentStatus: 'completed',
      },
      course,
      new Date('2026-03-10T12:00:00+06:00'),
    )
    expect(snap.isBlocked).toBe(true)
  })
})

describe('computeRenewalAmount', () => {
  it('uses quarterlyFee for quarterly courses', () => {
    const result = computeRenewalAmount(
      {
        billingType: 'quarterly',
        monthlyFee: 500,
        quarterlyFee: 1400,
        lateFeeEnabled: false,
        lateFeeAmount: 50,
      },
      { paidUntil: new Date('2026-06-30T23:59:59.999+06:00') },
      { now: new Date('2026-06-01T00:00:00+06:00') },
    )
    expect(result).toEqual({ baseFee: 1400, lateFee: 0, total: 1400 })
  })

  it('adds late fee after paidUntil when enabled', () => {
    const result = computeRenewalAmount(
      {
        billingType: 'monthly',
        monthlyFee: 500,
        quarterlyFee: 1400,
        lateFeeEnabled: true,
        lateFeeAmount: 50,
      },
      { paidUntil: new Date('2026-03-01T00:00:00+06:00') },
      { now: new Date('2026-03-05T00:00:00+06:00') },
    )
    expect(result).toEqual({ baseFee: 500, lateFee: 50, total: 550 })
  })

  it('skips late fee when overrideFee is provided', () => {
    const result = computeRenewalAmount(
      {
        billingType: 'monthly',
        monthlyFee: 500,
        quarterlyFee: 1400,
        lateFeeEnabled: true,
        lateFeeAmount: 50,
      },
      { paidUntil: new Date('2026-03-01T00:00:00+06:00') },
      {
        now: new Date('2026-03-05T00:00:00+06:00'),
        overrideFee: 400,
      },
    )
    expect(result).toEqual({ baseFee: 400, lateFee: 0, total: 400 })
  })
})
