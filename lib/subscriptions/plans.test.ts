import { describe, expect, it } from 'vitest'
import { getSubscriptionAccessSnapshot, nextPaidUntil, computeRenewalAmount } from './billing'
import { expectedBatchPayments, addCalendarMonths, firstBatchPaymentDue, parsePaymentPlans, selectPaymentPlan } from './plans'

const start = new Date('2026-11-15T00:00:00+06:00')
const joined = new Date('2026-11-25T13:00:00+06:00')

describe('batch billing calendar', () => {
  it.each([
    ['monthly', '2026-12-15'],
    ['two_month', '2027-01-15'],
    ['quarterly', '2027-02-15'],
  ] as const)('uses the batch schedule for a late %s enrollment', (type, due) => {
    expect(firstBatchPaymentDue(start, type, joined)).toEqual(new Date(due + 'T00:00:00+06:00'))
  })

  it('advances past billing periods that already ended', () => {
    expect(firstBatchPaymentDue(start, 'monthly', new Date('2027-01-26T12:00:00+06:00')))
      .toEqual(new Date('2027-02-15T00:00:00+06:00'))
  })

  it('carries an extension forward when it crosses into the next month', () => {
    const anchor = new Date('2027-01-31T00:00:00+06:00')
    const extended = new Date('2027-03-02T00:00:00+06:00')
    expect(nextPaidUntil(extended, 0, 'monthly', anchor)).toEqual(new Date('2027-04-02T00:00:00+06:00'))
  })

  it('calculates a fixed six-month duration across years', () => {
    expect(addCalendarMonths(start, 6)).toEqual(new Date('2027-05-15T00:00:00+06:00'))
  })

  it.each([['2027', '28'], ['2028', '29']])('restores the 31st after February in %s', (year, day) => {
    const anchor = new Date(year + '-01-31T00:00:00+06:00')
    const february = firstBatchPaymentDue(anchor, 'monthly', anchor)
    expect(february).toEqual(new Date(year + '-02-' + day + 'T00:00:00+06:00'))
    expect(nextPaidUntil(february, 0, 'monthly', anchor)).toEqual(new Date(year + '-03-31T00:00:00+06:00'))
  })
})

describe('payment option configuration', () => {
  const plans = parsePaymentPlans([
    { type: 'monthly', price: 1500, noticeStartOffsetDays: 5 },
    { type: 'quarterly', price: 4000, regularPrice: 4500, noticeStartOffsetDays: 9 },
  ])!

  it('requires a selection among enabled plans and uses the configured amount', () => {
    expect(selectPaymentPlan(plans, undefined)).toBeUndefined()
    expect(selectPaymentPlan(plans, 'two_month')).toBeUndefined()
    expect(selectPaymentPlan(plans, 'quarterly')?.price).toBe(4000)
  })

  it('accepts a standalone free option and rejects mixing it with paid options', () => {
    const free = { type: 'one_time', price: 0 }
    expect(selectPaymentPlan(parsePaymentPlans([free])!, undefined)?.price).toBe(0)
    expect(parsePaymentPlans([free, ...plans])).toBeNull()
    expect(parsePaymentPlans([{ type: 'quarterly', price: 4000, regularPrice: 3000 }])).toBeNull()
  })

  it('uses the chosen enrollment plan for renewal fees and notice timing', () => {
    const course = { billingType: 'monthly' as const, paymentPlans: plans }
    const enrollment = { billingType: 'quarterly' as const, paymentStatus: 'completed' as const, paidUntil: start }
    expect(computeRenewalAmount(course, enrollment).baseFee).toBe(4000)
    expect(getSubscriptionAccessSnapshot(enrollment, course, joined).noticeStartAt)
      .toEqual(new Date('2026-11-06T00:00:00+06:00'))
  })
})

it('counts the initial full payment and renewals before the batch ends', () => {
  const end = addCalendarMonths(start, 6)
  expect(expectedBatchPayments(start, end, 'monthly', joined)).toBe(6)
  expect(expectedBatchPayments(start, end, 'quarterly', joined)).toBe(2)
  expect(expectedBatchPayments(start, end, 'monthly', new Date('2027-04-25T00:00:00+06:00'))).toBe(1)
})
