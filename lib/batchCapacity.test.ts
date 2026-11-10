import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  canStudentJoinBatch,
  isBatchAcceptingStudents,
  isBatchJoinWindowOpen,
} from '@/lib/batchCapacity'

const opens = new Date('2026-03-01T00:00:00+06:00')
const closes = new Date('2026-03-15T23:59:59.999+06:00')

function baseBatch(overrides: Record<string, unknown> = {}) {
  return {
    maxStudents: 0,
    students: [] as string[],
    reactivateDate: null as Date | null,
    joinOpensAt: opens,
    joinClosesAt: closes,
    status: 'upcoming' as const,
    ...overrides,
  }
}

describe('isBatchJoinWindowOpen', () => {
  it('returns false when join window fields are missing', () => {
    expect(
      isBatchJoinWindowOpen({ joinOpensAt: null, joinClosesAt: closes }),
    ).toBe(false)
    expect(
      isBatchJoinWindowOpen({ joinOpensAt: opens, joinClosesAt: null }),
    ).toBe(false)
    expect(
      isBatchJoinWindowOpen({ joinOpensAt: null, joinClosesAt: null }),
    ).toBe(false)
  })

  it('is open at the exact open and close instants (inclusive)', () => {
    expect(isBatchJoinWindowOpen(baseBatch(), opens)).toBe(true)
    expect(isBatchJoinWindowOpen(baseBatch(), closes)).toBe(true)
  })

  it('is closed before open and after close', () => {
    expect(
      isBatchJoinWindowOpen(
        baseBatch(),
        new Date('2026-02-28T23:59:59.999+06:00'),
      ),
    ).toBe(false)
    expect(
      isBatchJoinWindowOpen(
        baseBatch(),
        new Date('2026-03-16T00:00:00+06:00'),
      ),
    ).toBe(false)
  })

  it('is open in the middle of the window', () => {
    expect(
      isBatchJoinWindowOpen(
        baseBatch(),
        new Date('2026-03-08T12:00:00+06:00'),
      ),
    ).toBe(true)
  })
})

describe('isBatchAcceptingStudents', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts when maxStudents is 0 (unlimited)', () => {
    expect(
      isBatchAcceptingStudents({
        maxStudents: 0,
        students: ['a', 'b', 'c'],
        reactivateDate: null,
      }),
    ).toBe(true)
  })

  it('accepts while under capacity', () => {
    expect(
      isBatchAcceptingStudents({
        maxStudents: 2,
        students: ['a'],
        reactivateDate: null,
      }),
    ).toBe(true)
  })

  it('rejects when full and not reactivated', () => {
    expect(
      isBatchAcceptingStudents({
        maxStudents: 2,
        students: ['a', 'b'],
        reactivateDate: null,
      }),
    ).toBe(false)
  })

  it('reopens after reactivateDate even when full', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00+06:00'))
    expect(
      isBatchAcceptingStudents({
        maxStudents: 1,
        students: ['a'],
        reactivateDate: new Date('2026-04-01T00:00:00+06:00'),
      }),
    ).toBe(true)
  })

  it('stays closed when reactivateDate is still in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-20T12:00:00+06:00'))
    expect(
      isBatchAcceptingStudents({
        maxStudents: 1,
        students: ['a'],
        reactivateDate: new Date('2026-04-01T00:00:00+06:00'),
      }),
    ).toBe(false)
  })
})

describe('canStudentJoinBatch', () => {
  it('blocks completed batches even inside the join window', () => {
    expect(
      canStudentJoinBatch(
        baseBatch({ status: 'completed' }),
        new Date('2026-03-08T12:00:00+06:00'),
      ),
    ).toBe(false)
  })

  it('allows join when window open, not completed, and under capacity', () => {
    expect(
      canStudentJoinBatch(
        baseBatch({ maxStudents: 10, students: ['a'], status: 'active' }),
        new Date('2026-03-08T12:00:00+06:00'),
      ),
    ).toBe(true)
  })

  it('blocks when join window closed even if seats remain', () => {
    expect(
      canStudentJoinBatch(
        baseBatch({ maxStudents: 10, students: [] }),
        new Date('2026-03-20T12:00:00+06:00'),
      ),
    ).toBe(false)
  })

  it('blocks when full even inside the join window', () => {
    expect(
      canStudentJoinBatch(
        baseBatch({
          maxStudents: 1,
          students: ['a'],
          status: 'upcoming',
        }),
        new Date('2026-03-08T12:00:00+06:00'),
      ),
    ).toBe(false)
  })

  it('models non-overlapping batches: only the open window is joinable', () => {
    const batch1 = baseBatch({
      joinOpensAt: new Date('2026-01-01T00:00:00+06:00'),
      joinClosesAt: new Date('2026-01-31T23:59:59.999+06:00'),
      status: 'active',
    })
    const batch2 = baseBatch({
      joinOpensAt: new Date('2026-02-01T00:00:00+06:00'),
      joinClosesAt: new Date('2026-02-28T23:59:59.999+06:00'),
      status: 'upcoming',
    })

    const duringBatch1 = new Date('2026-01-15T12:00:00+06:00')
    const duringBatch2 = new Date('2026-02-15T12:00:00+06:00')
    const gap = new Date('2026-01-31T23:59:59.999+06:00') // still batch1 close
    const afterBoth = new Date('2026-03-01T00:00:00+06:00')

    expect(canStudentJoinBatch(batch1, duringBatch1)).toBe(true)
    expect(canStudentJoinBatch(batch2, duringBatch1)).toBe(false)

    expect(canStudentJoinBatch(batch1, duringBatch2)).toBe(false)
    expect(canStudentJoinBatch(batch2, duringBatch2)).toBe(true)

    expect(canStudentJoinBatch(batch1, gap)).toBe(true)
    expect(canStudentJoinBatch(batch2, gap)).toBe(false)

    expect(canStudentJoinBatch(batch1, afterBoth)).toBe(false)
    expect(canStudentJoinBatch(batch2, afterBoth)).toBe(false)

    const openNow = [batch1, batch2].filter((b) =>
      canStudentJoinBatch(b, duringBatch1),
    )
    expect(openNow).toHaveLength(1)
    expect(openNow[0]).toBe(batch1)
  })
})
