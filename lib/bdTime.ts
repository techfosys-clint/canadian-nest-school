/**
 * All user-facing schedules and calendar dates use Bangladesh time
 * (Asia/Dhaka, UTC+6, no DST). Production servers typically run in UTC, so
 * formatting/parsing without an explicit timezone shifts late-night BD dates
 * to the previous calendar day.
 */

export const BD_TIME_ZONE = 'Asia/Dhaka'
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
  const s = d.toLocaleString('sv-SE', { timeZone: BD_TIME_ZONE })
  return s.replace(' ', 'T').slice(0, 16)
}

/** Calendar day in Bangladesh as YYYY-MM-DD (for streaks, attendance defaults). */
export function bdTodayYmd(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: BD_TIME_ZONE })
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  return isNaN(d.getTime()) ? null : d
}

function cleanOptions(
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions | undefined {
  if (!options) return undefined
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) cleaned[key] = value
  }
  return cleaned as Intl.DateTimeFormatOptions
}

/** Short date: "24 Jul 2026" */
export function formatBdDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = asDate(value)
  if (!d) return ''
  return d.toLocaleDateString('en-BD', {
    timeZone: BD_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...cleanOptions(options),
  })
}

/** Date + time: "24 Jul 2026, 01:00 AM" */
export function formatBdDateTime(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = asDate(value)
  if (!d) return ''
  return d.toLocaleString('en-BD', {
    timeZone: BD_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...cleanOptions(options),
  })
}

/** Long certificate-style date: "July 24, 2026" */
export function formatBdLongDate(
  value: Date | string | null | undefined,
): string {
  const d = asDate(value)
  if (!d) return ''
  return d.toLocaleDateString('en-US', {
    timeZone: BD_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
