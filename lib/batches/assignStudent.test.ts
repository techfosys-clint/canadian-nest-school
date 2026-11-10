import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findById } = vi.hoisted(() => ({
  findById: vi.fn(),
}))

vi.mock('@/lib/db/models/Batch', () => ({
  Batch: { findById },
}))

import { assignStudentToBatch } from '@/lib/batches/assignStudent'

const courseId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const otherCourseId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const batchId = 'cccccccccccccccccccccccc'
const studentId = 'dddddddddddddddddddddddd'
const otherStudentId = 'eeeeeeeeeeeeeeeeeeeeeeee'

function makeBatch(overrides: Record<string, unknown> = {}) {
  const students = (overrides.students as string[]) || []
  return {
    _id: batchId,
    course: { toString: () => courseId },
    students: students.map((id) => ({ toString: () => id })),
    maxStudents: 10,
    reactivateDate: null,
    joinOpensAt: new Date('2026-03-01T00:00:00+06:00'),
    joinClosesAt: new Date('2026-03-31T23:59:59.999+06:00'),
    status: 'upcoming',
    save: vi.fn().mockResolvedValue(undefined),
    push: undefined,
    ...overrides,
    // keep mutable students array for push
    ...(overrides.students
      ? {
          students: (overrides.students as string[]).map((id) => ({
            toString: () => id,
          })),
        }
      : {}),
  }
}

describe('assignStudentToBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns error when batch is missing', async () => {
    findById.mockResolvedValue(null)
    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
    })
    expect(result).toEqual({ ok: false, error: 'Batch not found.' })
  })

  it('rejects batches that belong to another course', async () => {
    findById.mockResolvedValue(
      makeBatch({ course: { toString: () => otherCourseId } }),
    )
    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
    })
    expect(result).toEqual({
      ok: false,
      error: 'Batch does not belong to this course.',
    })
  })

  it('is a no-op success when student is already on the roster', async () => {
    const batch = makeBatch({ students: [studentId] })
    findById.mockResolvedValue(batch)
    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
    })
    expect(result).toEqual({ ok: true })
    expect(batch.save).not.toHaveBeenCalled()
  })

  it('assigns when join window is open and seats remain', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00+06:00'))

    const batch = makeBatch({ students: [otherStudentId] })
    // push onto the students array (assignStudent uses batch.students.push)
    batch.students.push = Array.prototype.push.bind(batch.students)
    findById.mockResolvedValue(batch)

    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
    })

    expect(result).toEqual({ ok: true })
    expect(batch.save).toHaveBeenCalledOnce()
    expect(batch.students).toHaveLength(2)
  })

  it('rejects when join window is closed (non-force)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00+06:00'))

    const batch = makeBatch()
    findById.mockResolvedValue(batch)

    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/not open for enrollment/i)
    }
    expect(batch.save).not.toHaveBeenCalled()
  })

  it('force path still fails when batch is full', async () => {
    const batch = makeBatch({
      maxStudents: 1,
      students: [otherStudentId],
      joinOpensAt: null,
      joinClosesAt: null,
    })
    findById.mockResolvedValue(batch)

    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
      force: true,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/full/i)
    }
  })

  it('force path can assign even when join window is closed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00+06:00'))

    const batch = makeBatch({ students: [] })
    batch.students.push = Array.prototype.push.bind(batch.students)
    findById.mockResolvedValue(batch)

    const result = await assignStudentToBatch({
      batchId,
      studentId,
      courseId,
      force: true,
    })

    expect(result).toEqual({ ok: true })
    expect(batch.save).toHaveBeenCalledOnce()
  })
})
