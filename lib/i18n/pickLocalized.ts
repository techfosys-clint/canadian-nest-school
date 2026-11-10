import type { Locale } from './config'

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Bangla is the primary content language.
 * - `bn` locale: prefer `fieldBn`, then English/base `field`
 * - `en` locale: prefer English/base `field`, then fall back to `fieldBn`
 */
export function pickLocalizedString(
  doc: Record<string, unknown> | null | undefined,
  field: string,
  locale: Locale,
): string {
  if (!doc) return ''
  const bn = asNonEmptyString(doc[`${field}Bn`])
  const base = asNonEmptyString(doc[field])

  if (locale === 'en') return base || bn || ''
  return bn || base || ''
}

/** Bangla-primary rich-text / mixed field picker (same fallback rules). */
export function pickLocalizedRichText(
  doc: Record<string, unknown> | null | undefined,
  field: string,
  locale: Locale,
): unknown {
  if (!doc) return null
  const bn = doc[`${field}Bn`]
  const base = doc[field]
  const bnOk = bn !== undefined && bn !== null && bn !== ''
  const baseOk = base !== undefined && base !== null && base !== ''

  if (locale === 'en') {
    if (baseOk) return base
    if (bnOk) return bn
    return null
  }
  if (bnOk) return bn
  if (baseOk) return base
  return null
}

/**
 * Bangla-primary list picker.
 * `enList` = English/base list, `bnList` = Bangla list.
 */
export function pickLocalizedList<T extends Record<string, unknown>>(
  enList: T[] | null | undefined,
  bnList: T[] | null | undefined,
  locale: Locale,
): T[] {
  const en = Array.isArray(enList) && enList.length > 0 ? enList : null
  const bn = Array.isArray(bnList) && bnList.length > 0 ? bnList : null

  if (locale === 'en') return en || bn || []
  return bn || en || []
}

type FaqItem = {
  question?: string
  answer?: string
  questionBn?: string
  answerBn?: string
}

/** FAQ rows store both languages on the same object for easy admin editing. */
export function pickLocalizedFaqs(
  faqs: FaqItem[] | null | undefined,
  locale: Locale,
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(faqs)) return []
  return faqs
    .map((f) => {
      const questionBn = f.questionBn?.trim() || ''
      const answerBn = f.answerBn?.trim() || ''
      const questionEn = (f.question || '').trim()
      const answerEn = (f.answer || '').trim()

      if (locale === 'en') {
        return {
          question: questionEn || questionBn,
          answer: answerEn || answerBn,
        }
      }
      return {
        question: questionBn || questionEn,
        answer: answerBn || answerEn,
      }
    })
    .filter((f) => f.question && f.answer)
}
