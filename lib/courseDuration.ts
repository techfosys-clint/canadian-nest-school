/**
 * Course duration is stored as text (e.g. "14 hours"). The admin form edits
 * it as a number plus a unit; older courses may hold a bare number ("110")
 * or free text ("14 Hours of video lectures").
 */

export const DURATION_UNITS = ['hours', 'weeks', 'months'] as const
export type DurationUnit = (typeof DURATION_UNITS)[number]

const UNIT_LABELS: Record<DurationUnit, [string, string]> = {
  hours: ['hour', 'hours'],
  weeks: ['week', 'weeks'],
  months: ['month', 'months'],
}

/** Splits a stored duration into a number and unit when it starts with one. */
export function parseCourseDuration(value: string | null | undefined): {
  amount: string
  unit: DurationUnit
} {
  const text = (value || '').trim()
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/)
  if (!match) return { amount: '', unit: 'hours' }
  const word = match[2].toLowerCase()
  const unit: DurationUnit = word.startsWith('week')
    ? 'weeks'
    : word.startsWith('month')
      ? 'months'
      : 'hours'
  return { amount: match[1], unit }
}

/** Builds the stored text from the form fields ("" when no amount). */
export function buildCourseDuration(amount: string, unit: DurationUnit): string {
  const n = Number(amount)
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return ''
  const [one, many] = UNIT_LABELS[unit]
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Text to display. A bare number ("110") gets the default unit (hours);
 * anything else is shown as it was entered.
 */
export function formatCourseDuration(value: string | null | undefined): string {
  const text = (value || '').trim()
  if (/^\d+(\.\d+)?$/.test(text)) {
    return buildCourseDuration(text, 'hours')
  }
  return text
}
