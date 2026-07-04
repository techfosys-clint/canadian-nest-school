/**
 * All live class schedules are entered and displayed in Bangladesh time
 * (Asia/Dhaka, UTC+6, no DST). The admin form uses a bare datetime-local
 * string; the server may run in any timezone (UTC in production), so the
 * string must be parsed with an explicit +06:00 offset — otherwise a class
 * scheduled at 1:20 PM Dhaka time gets stored as 1:20 PM UTC (7:20 PM Dhaka).
 */

const DHAKA_OFFSET = '+06:00'

/** Parse a datetime-local string ("2026-07-04T13:20") as Bangladesh time. */
export function parseBdDate(value: string): Date {
  if (!value) return new Date(NaN)
  // Already has an explicit offset or Z — trust it as-is.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value)
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return new Date(`${withSeconds}${DHAKA_OFFSET}`)
}

/** Format a stored Date/ISO string back into a datetime-local value in BD time. */
export function toBdInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  // sv-SE locale formats as "YYYY-MM-DD HH:mm:ss"
  const s = d.toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' })
  return s.replace(' ', 'T').slice(0, 16)
}
