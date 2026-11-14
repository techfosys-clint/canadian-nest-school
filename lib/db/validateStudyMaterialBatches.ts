import { isValidObjectId } from 'mongoose'
import { Batch } from '@/lib/db/models/Batch'
import type { ICourse } from '@/lib/db/models/Course'

export async function validateStudyMaterialBatches(
  materials: ICourse['studyMaterials'],
  courseId: string,
): Promise<boolean> {
  const batches = [...new Set((materials ?? []).flatMap(material =>
    material.batch ? [String(material.batch)] : [],
  ))]
  if (!batches.length) return true
  if (!batches.every(id => isValidObjectId(id))) return false
  return await Batch.countDocuments({ course: courseId, _id: { $in: batches } }) === batches.length
}
