import { beforeEach, describe, expect, it, vi } from 'vitest'
import CourseWatchPage from './page'

const { session, access, preview, lessons } = vi.hoisted(() => ({
  session: vi.fn(),
  access: vi.fn(),
  preview: vi.fn(),
  lessons: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(url) },
  notFound: () => { throw new Error('not found') },
}))
vi.mock('@/lib/db/mongodb', () => ({ connectToDatabase: vi.fn() }))
vi.mock('@/lib/auth/learningSession', () => ({ getLearningSession: session }))
vi.mock('@/lib/auth/enrollmentPreview', () => ({ getEnrollmentPreview: preview }))
vi.mock('@/lib/subscriptions/access', () => ({ assertCourseContentAccess: access }))
vi.mock('@/components/CoursePlayerClient', () => ({ default: () => null }))
vi.mock('@/lib/db/models/Course', () => ({
  Course: {
    findOne: () => ({
      populate() { return this },
      lean: async () => ({ _id: 'course', slug: 'example' }),
    }),
  },
}))
vi.mock('@/lib/db/models/Lesson', () => ({ Lesson: { find: lessons } }))

function open(query: { from?: string; preview?: string }) {
  return CourseWatchPage({
    params: Promise.resolve({ slug: 'example' }),
    searchParams: Promise.resolve(query),
  })
}

describe('course player access', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    session.mockResolvedValue({ account: { id: 'student' }, role: 'student' })
    lessons.mockReturnValue({
      sort: () => ({
        lean: async () => [{
          _id: 'visible-lesson',
          lessonType: 'recorded',
          batchSettings: [
            { batch: 'batch', lessonType: 'recorded', videoUrl: 'videos/a.mp4', duration: 45, order: 2 },
            { batch: 'student-batch', lessonType: 'live', liveUrl: 'https://example.com/class', duration: 60, order: 4 },
          ],
        }],
      }),
    })
  })

  it.each(['dashboard', 'courses'])('opens the player from %s for an enrolled student', async (from) => {
    access.mockResolvedValue({ allowed: true, enrollment: { batch: 'batch' } })
    const player = await open({ from })
    expect(access).toHaveBeenCalledWith('student', 'course')
    expect(player.props.lessons).toMatchObject([
      { id: 'visible-lesson', lessonType: 'recorded', videoUrl: 'videos/a.mp4', duration: 45, order: 2 },
    ])
    expect(player.props.previewEnrollmentId).toBeUndefined()
  })

  it.each([
    ['dashboard', 'NOT_ENROLLED', '/dashboard?courseAccess=enrollment'],
    ['courses', 'SUBSCRIPTION_BLOCKED', '/dashboard/courses?courseAccess=blocked'],
  ])('returns to %s with an explanation when access changes', async (from, reason, url) => {
    access.mockResolvedValue({ allowed: false, reason })
    await expect(open({ from })).rejects.toThrow(url)
    expect(lessons).not.toHaveBeenCalled()
  })

  it('opens the same lesson ID with a different delivery for another enrolled batch', async () => {
    access.mockResolvedValue({ allowed: true, enrollment: { batch: 'student-batch' } })
    const player = await open({ from: 'dashboard' })
    expect(player.props.lessons).toMatchObject([
      { id: 'visible-lesson', lessonType: 'live', videoUrl: '', duration: 60, order: 4 },
    ])
  })

  it('previews the selected enrollment with its visible progress', async () => {
    preview.mockResolvedValue({
      admin: { id: 'admin' },
      enrollment: {
        course: 'course',
        batch: 'student-batch',
        completedLessons: ['visible-lesson', 'other-batch-lesson'],
      },
    })
    const player = await open({ preview: 'enrollment' })
    expect(player.props.previewEnrollmentId).toBe('enrollment')
    expect(player.props.initialCompletedLessonIds).toEqual(['visible-lesson'])
    expect(access).not.toHaveBeenCalled()
    expect(player.props.lessons).toMatchObject([
      { id: 'visible-lesson', lessonType: 'live', liveUrl: 'https://example.com/class', duration: 60, order: 4 },
    ])
    expect(player.props.lessons[0].videoUrl).toBe('')
  })

  it('rejects unauthorized previews', async () => {
    preview.mockResolvedValue(null)
    await expect(open({ preview: 'enrollment' })).rejects.toThrow('not found')
    expect(lessons).not.toHaveBeenCalled()
  })
})
