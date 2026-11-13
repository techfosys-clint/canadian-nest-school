import { describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { enrollments, renewals } = vi.hoisted(() => ({
  enrollments: vi.fn(),
  renewals: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'test-token' }) }),
}))
vi.mock('@/lib/auth/auth', () => ({ verifyToken: () => ({ id: 'student' }) }))
vi.mock('@/lib/db/mongodb', () => ({ connectToDatabase: vi.fn() }))
vi.mock('@/lib/db/models/Enrollment', () => ({ Enrollment: { find: enrollments } }))
vi.mock('@/lib/db/models/SubscriptionPayment', () => ({
  SubscriptionPayment: { find: renewals },
}))

function queryReturning(rows: object[]) {
  return {
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: async () => rows,
  }
}

describe('subscription payment history', () => {
  it('preserves the first charge and period alongside a late-fee renewal', async () => {
    enrollments.mockReturnValue(queryReturning([{
      _id: 'enrollment',
      billingType: 'monthly',
      billingCycleAnchor: '2026-01-01T00:00:00.000Z',
      initialPaymentPeriodEnd: '2026-01-31T00:00:00.000Z',
      initialPaymentAmount: 1000,
      pricePaid: 1100,
      paidUntil: '2026-03-02T00:00:00.000Z',
    }]))
    renewals.mockReturnValue(queryReturning([{
      _id: 'renewal',
      enrollment: 'enrollment',
      amount: 1100,
      lateFee: 100,
      periodStart: '2026-01-31T00:00:00.000Z',
      periodEnd: '2026-03-02T00:00:00.000Z',
      paymentStatus: 'completed',
      createdAt: '2026-02-01T00:00:00.000Z',
    }]))

    const { payments } = await (await GET()).json()
    expect(payments).toMatchObject([
      { kind: 'renewal', amount: 1100, lateFee: 100 },
      { kind: 'enrollment', amount: 1000, periodEnd: '2026-01-31T00:00:00.000Z' },
    ])
  })

  it('leaves overwritten legacy values unavailable and corrects old quarterly renewal periods', async () => {
    enrollments.mockReturnValue(queryReturning([{
      _id: 'enrollment',
      billingType: 'quarterly',
      billingCycleAnchor: '2026-01-01T00:00:00.000Z',
      pricePaid: 3000,
      paidUntil: '2026-06-30T17:59:59.999Z',
    }]))
    renewals.mockReturnValue(queryReturning([{
      _id: 'renewal',
      enrollment: 'enrollment',
      amount: 3000,
      periodStart: '2026-03-31T17:59:59.999Z',
      periodEnd: '2026-04-30T17:59:59.999Z',
      paymentStatus: 'completed',
      createdAt: '2026-04-01T00:00:00.000Z',
    }]))

    const { payments } = await (await GET()).json()
    expect(payments).toMatchObject([
      { kind: 'renewal', periodEnd: '2026-06-30T17:59:59.999Z' },
      { kind: 'enrollment', amount: null, periodEnd: null },
    ])
  })
})
