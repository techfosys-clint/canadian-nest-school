import { formatBdLongDate } from '@/lib/bdTime'

export function formatCertificateDate(date: Date = new Date()): string {
  return formatBdLongDate(date)
}

/** Fixed certificate body text under the student name. */
export function buildCertificateDescription(
  courseTitle: string,
  completionDate?: Date | string | null,
): string {
  const courseName = (courseTitle || '').trim() || 'this'
  const awardedOn =
    completionDate instanceof Date
      ? formatCertificateDate(completionDate)
      : typeof completionDate === 'string' && completionDate.trim()
        ? completionDate.trim()
        : formatCertificateDate(new Date())

  return (
    `For successfully completing the ${courseName} program. ` +
    `This certificate recognizes their exceptional dedication, continuous skill development, ` +
    `and strong commitment to learning in accordance with international educational standards.\n\n` +
    `Awarded on this day, ${awardedOn}`
  )
}
