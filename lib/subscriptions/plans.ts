export const paymentPlanLabels = {
  one_time: 'Full-course payment',
  monthly: 'Monthly',
  two_month: 'Every two months',
  quarterly: 'Every three months',
} as const

export type PaymentPlanType = keyof typeof paymentPlanLabels

export type PaymentPlan = {
  type: PaymentPlanType
  price: number
  regularPrice?: number
  noticeStartOffsetDays?: number
  noticeEndOffsetDays?: number
  blockOffsetDays?: number
}

export const paymentPlanTypes = Object.keys(paymentPlanLabels) as PaymentPlanType[]

export function parsePaymentPlans(value: unknown): PaymentPlan[] | null {
  if (!Array.isArray(value) || !value.length || value.length > paymentPlanTypes.length) return null
  const plans: PaymentPlan[] = []
  for (const option of value) {
    if (!option || !paymentPlanTypes.includes(option.type) || plans.some(plan => plan.type === option.type)) return null
    const { type, price, regularPrice, noticeStartOffsetDays, noticeEndOffsetDays, blockOffsetDays } = option
    if (!Number.isFinite(price) || price < 0 || (price === 0 && (type !== 'one_time' || value.length !== 1))) return null
    if (regularPrice !== undefined && (!Number.isFinite(regularPrice) || regularPrice <= price || price === 0)) return null
    if ([noticeStartOffsetDays, noticeEndOffsetDays, blockOffsetDays].some(days => days !== undefined && (!Number.isSafeInteger(days) || days < 0))) return null
    plans.push({ type, price, regularPrice, noticeStartOffsetDays, noticeEndOffsetDays, blockOffsetDays })
  }
  return plans
}

export function selectPaymentPlan(plans: PaymentPlan[], requested: unknown): PaymentPlan | undefined {
  if (requested === undefined && plans.length === 1) return plans[0]
  return plans.find(plan => plan.type === requested)
}

const monthsByType = { monthly: 1, two_month: 2, quarterly: 3 }

function dhakaDate(date: Date) {
  return new Date(date.getTime() + 6 * 60 * 60 * 1000)
}

export function addCalendarMonths(date: Date, months: number, anchor = date): Date {
  const shifted = dhakaDate(date)
  const day = dhakaDate(anchor).getUTCDate()
  shifted.setUTCDate(1)
  shifted.setUTCMonth(shifted.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate()
  shifted.setUTCDate(Math.min(day, lastDay))
  return new Date(shifted.getTime() - 6 * 60 * 60 * 1000)
}

export function firstBatchPaymentDue(anchor: Date, type: Exclude<PaymentPlanType, 'one_time'>, now: Date): Date {
  const start = dhakaDate(anchor)
  const today = dhakaDate(now)
  const elapsed = (today.getUTCFullYear() - start.getUTCFullYear()) * 12 + today.getUTCMonth() - start.getUTCMonth()
  const interval = monthsByType[type]
  const months = Math.max(interval, Math.floor(elapsed / interval) * interval)
  const candidate = addCalendarMonths(anchor, months)
  return candidate > now ? candidate : addCalendarMonths(anchor, months + interval)
}

export function nextBatchPaymentDue(previous: Date, type: Exclude<PaymentPlanType, 'one_time'>, anchor: Date): Date {
  const interval = monthsByType[type]
  const boundary = firstBatchPaymentDue(anchor, type, previous)
  const previousBoundary = addCalendarMonths(boundary, -interval, anchor)
  const extension = Math.max(0, previous.getTime() - previousBoundary.getTime())
  return new Date(boundary.getTime() + extension)
}
