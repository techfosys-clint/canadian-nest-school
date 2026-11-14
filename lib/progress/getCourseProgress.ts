import { isLessonAvailable } from '@/lib/lessons/delivery'
import { Lesson } from '@/lib/db/models/Lesson'

export function calculateCourseProgressPercent(
  completedLessons: string[] | null | undefined,
  totalLessons: number,
): number {
  const completedCount = completedLessons?.length || 0
  if (totalLessons <= 0) return 0
  return Math.round((completedCount / totalLessons) * 100)
}

export function sanitizeCompletedLessons(
  completedLessons: string[] | null | undefined,
  validLessonIds: Set<string>,
): string[] {
  if (!completedLessons?.length) return []

  const seen = new Set<string>()
  const sanitized: string[] = []

  for (const lessonId of completedLessons) {
    if (!validLessonIds.has(lessonId) || seen.has(lessonId)) continue
    seen.add(lessonId)
    sanitized.push(lessonId)
  }

  return sanitized
}

export async function getValidLessonIdSet(
  courseId: string,
  batchId?: string | null,
): Promise<Set<string>> {
  const lessons = await Lesson.find({ course: courseId }).select('batch hasDefaultDelivery batchSettings.batch').lean()
  return new Set(lessons
    .filter((lesson) => batchId === undefined || isLessonAvailable(lesson, batchId))
    .map((lesson) => String(lesson._id)))
}

export async function getLessonIdsByCourse(
  courseIds: string[],
): Promise<Map<string, Set<string>>> {
  const lessonIdsByCourse = new Map<string, Set<string>>()
  if (courseIds.length === 0) return lessonIdsByCourse

  const lessons = await Lesson.find({ course: { $in: courseIds } })
    .select('_id course')
    .lean()

  for (const lesson of lessons) {
    const courseId = lesson.course?.toString()
    if (!courseId) continue

    if (!lessonIdsByCourse.has(courseId)) {
      lessonIdsByCourse.set(courseId, new Set())
    }

    lessonIdsByCourse.get(courseId)!.add(lesson._id.toString())
  }

  return lessonIdsByCourse
}

export async function getValidatedCompletedLessons(
  courseId: string,
  completedLessons: string[] | null | undefined,
  batchId?: string | null,
): Promise<string[]> {
  const validLessonIds = await getValidLessonIdSet(courseId, batchId)
  return sanitizeCompletedLessons(completedLessons, validLessonIds)
}

export async function isLessonInCourse(
  courseId: string,
  lessonId: string,
): Promise<boolean> {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId })
    .select('_id')
    .lean()
  return Boolean(lesson)
}

export async function getTotalLessonsForCourse(
  courseId: string,
): Promise<number> {
  return Lesson.countDocuments({ course: courseId })
}

export async function getCourseProgressPercent(
  courseId: string,
  completedLessons: string[] | null | undefined,
  batchId?: string | null,
): Promise<number> {
  const validLessonIds = await getValidLessonIdSet(courseId, batchId)
  const sanitized = sanitizeCompletedLessons(completedLessons, validLessonIds)
  return calculateCourseProgressPercent(sanitized, validLessonIds.size)
}

export async function getLessonCountsByCourse(
  courseIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (courseIds.length === 0) return counts

  const rows = await Lesson.aggregate<{ _id: string; count: number }>([
    { $match: { course: { $in: courseIds } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ])

  for (const row of rows) {
    counts.set(row._id.toString(), row.count)
  }

  return counts
}
