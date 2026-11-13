import { isValidObjectId } from 'mongoose'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { Enrollment } from '@/lib/db/models/Enrollment'

export async function getEnrollmentPreview(enrollmentId: string) {
  if (!isValidObjectId(enrollmentId)) return null
  const admin = await getAuthorizedUser(['admin'])
  if (!admin) return null
  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    paymentStatus: 'completed',
  }).lean()
  return enrollment ? { admin, enrollment } : null
}
