import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLearningSession } from './learningSession'

const { findStudent, findUser } = vi.hoisted(() => ({
  findStudent: vi.fn(),
  findUser: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => ({ value: name }) }),
}))
vi.mock('@/lib/auth/auth', () => ({
  verifyToken: (token: string) => ({ id: token }),
}))
vi.mock('@/lib/db/models/Student', () => ({ Student: { findById: findStudent } }))
vi.mock('@/lib/db/models/User', () => ({ User: { findById: findUser } }))

describe('learning session', () => {
  beforeEach(() => vi.resetAllMocks())

  it('prefers a student account when both cookies resolve', async () => {
    findStudent.mockResolvedValue({ id: 'student' })
    expect(await getLearningSession()).toEqual({ account: { id: 'student' }, role: 'student' })
    expect(findUser).not.toHaveBeenCalled()
  })

  it('falls back to the admin account when the student record is gone', async () => {
    findStudent.mockResolvedValue(null)
    const admin = { id: 'admin', role: 'admin' }
    findUser.mockResolvedValue(admin)
    expect(await getLearningSession()).toEqual({ account: admin, role: 'admin' })
  })
})
