import { getCourseProgressPercent } from '@/lib/progress/getCourseProgress'
import { syncCertificateRequestWithReviewGate } from '@/lib/reviews/reviewPack'

export async function syncEnrollmentProgressSideEffects(
  userId: string,
  courseId: string,
  completedLessons: string[],
): Promise<number> {
  const progress = await getCourseProgressPercent(courseId, completedLessons)

  // Single source of truth for cert row status vs reviews + syllabus %.
  await syncCertificateRequestWithReviewGate(userId, courseId)

  return progress
}
