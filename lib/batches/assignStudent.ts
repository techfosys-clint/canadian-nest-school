import { canStudentJoinBatch, isBatchAcceptingStudents } from '@/lib/batchCapacity'
import { Batch } from '@/lib/db/models/Batch'
import mongoose from 'mongoose'

/**
 * Adds a student to a batch roster if not already present.
 * Re-checks join window + capacity unless `force` (admin / already-paid path).
 */
export async function assignStudentToBatch(params: {
  batchId: string
  studentId: string
  courseId: string
  /** Skip join-window check (admin assign). Still blocks when full unless reactivated. */
  force?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const batch = await Batch.findById(params.batchId)
  if (!batch) return { ok: false, error: 'Batch not found.' }

  if (batch.course.toString() !== params.courseId.toString()) {
    return { ok: false, error: 'Batch does not belong to this course.' }
  }

  const already = batch.students.some(
    (s: { toString(): string }) => s.toString() === params.studentId.toString(),
  )
  if (already) return { ok: true }

  if (params.force) {
    if (!isBatchAcceptingStudents(batch)) {
      return {
        ok: false,
        error: `This batch is full (max ${batch.maxStudents} students).`,
      }
    }
  } else if (!canStudentJoinBatch(batch)) {
    return {
      ok: false,
      error:
        'This batch is not open for enrollment (join window closed or full).',
    }
  }

  batch.students.push(new mongoose.Types.ObjectId(params.studentId) as any)
  await batch.save()
  return { ok: true }
}
