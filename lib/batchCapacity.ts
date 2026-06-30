import type { IBatch } from './db/models/Batch'

/**
 * A batch with maxStudents > 0 stops accepting new joins once it's full,
 * unless reactivateDate has passed — at which point it reopens regardless
 * of how many students are already in it (the cap is a one-time gate, not a
 * hard ceiling once reactivated).
 */
export function isBatchAcceptingStudents(batch: Pick<IBatch, 'maxStudents' | 'students' | 'reactivateDate'>): boolean {
  if (!batch.maxStudents || batch.maxStudents <= 0) return true
  if (batch.students.length < batch.maxStudents) return true
  if (batch.reactivateDate && new Date() >= new Date(batch.reactivateDate)) return true
  return false
}
