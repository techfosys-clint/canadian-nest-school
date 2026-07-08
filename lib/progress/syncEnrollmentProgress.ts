import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { getCourseProgressPercent } from '@/lib/progress/getCourseProgress'

export async function syncEnrollmentProgressSideEffects(
  userId: string,
  courseId: string,
  completedLessons: string[],
): Promise<number> {
  const progress = await getCourseProgressPercent(courseId, completedLessons)

  const existingCertificate = await CertificateRequest.findOne({
    student: userId,
    course: courseId,
  })

  if (existingCertificate) {
    existingCertificate.progress = progress
    await existingCertificate.save()
  } else if (progress === 100) {
    await CertificateRequest.create({
      student: userId,
      course: courseId,
      status: 'pending',
      progress,
    })
  }

  return progress
}
