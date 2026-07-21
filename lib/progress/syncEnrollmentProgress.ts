import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { getCourseProgressPercent } from '@/lib/progress/getCourseProgress'
import { syncCertificateRequestWithReviewGate } from '@/lib/reviews/reviewPack'

export async function syncEnrollmentProgressSideEffects(
  userId: string,
  courseId: string,
  completedLessons: string[],
): Promise<number> {
  const progress = await getCourseProgressPercent(courseId, completedLessons)

  // Keep progress field updated even below 100%
  if (progress < 100) {
    const existingCertificate = await CertificateRequest.findOne({
      student: userId,
      course: courseId,
    })
    if (existingCertificate) {
      existingCertificate.progress = progress
      await existingCertificate.save()
    }
    return progress
  }

  // At 100%: create/update cert — auto-approved once reviews are submitted
  await syncCertificateRequestWithReviewGate(userId, courseId, progress)

  return progress
}
