import { beforeEach, expect, it, vi } from 'vitest'
import type { ISubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { completeSubscriptionPayment } from './completeSubscriptionPayment'

const fixtures = vi.hoisted(() => ({
  claim: vi.fn(),
  findEnrollment: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@/lib/db/models/Coupon', () => ({ Coupon: { updateOne: vi.fn() } }))
vi.mock('@/lib/db/models/Enrollment', () => ({ Enrollment: { findById: fixtures.findEnrollment } }))
vi.mock('@/lib/db/models/SubscriptionPayment', () => ({ SubscriptionPayment: { findOneAndUpdate: fixtures.claim } }))
vi.mock('@/lib/eps', () => ({ verifyEpsTransaction: fixtures.verify }))

beforeEach(() => vi.resetAllMocks())

it('applies a verified renewal once when the callback is replayed', async () => {
  const pending = {
    _id: 'payment-id', enrollment: 'enrollment-id', amount: 250,
    paymentStatus: 'pending', merchantTransactionId: 'sandbox-renewal',
    periodStart: new Date('2027-02-28T00:00:00+06:00'),
  } as unknown as ISubscriptionPayment
  const enrollment = {
    billingType: 'monthly', paidUntil: new Date(pending.periodStart),
    calendarBillingAnchor: new Date('2027-01-31T00:00:00+06:00'),
    save: vi.fn(),
  }
  fixtures.verify.mockResolvedValue({ status: 'Success', totalAmount: 250 })
  fixtures.claim.mockResolvedValueOnce({ ...pending }).mockResolvedValueOnce(null)
  fixtures.findEnrollment.mockResolvedValue(enrollment)

  expect(await completeSubscriptionPayment({ ...pending } as ISubscriptionPayment)).toBe('completed')
  expect(await completeSubscriptionPayment({ ...pending } as ISubscriptionPayment)).toBe('already_completed')
  expect(enrollment.paidUntil).toEqual(new Date('2027-03-31T00:00:00+06:00'))
  expect(enrollment.save).toHaveBeenCalledOnce()
})
