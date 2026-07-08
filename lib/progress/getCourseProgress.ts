import { Lesson } from '@/lib/db/models/Lesson'

export function calculateCourseProgressPercent(
  completedLessons: string[] | null | undefined,
  totalLessons: number,
): number {
  const completedCount = completedLessons?.length || 0
  if (totalLessons <= 0) return 0
  return Math.round((completedCount / totalLessons) * 100)
}

export async function getTotalLessonsForCourse(
  courseId: string,
): Promise<number> {
  return Lesson.countDocuments({ course: courseId })
}

export async function getCourseProgressPercent(
  courseId: string,
  completedLessons: string[] | null | undefined,
): Promise<number> {
  const totalLessons = await getTotalLessonsForCourse(courseId)
  return calculateCourseProgressPercent(completedLessons, totalLessons)
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
