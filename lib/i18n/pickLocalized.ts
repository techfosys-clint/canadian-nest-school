import type { Locale } from './config'

/**
 * Prefer Bangla field (`titleBn`) when locale is `bn` and the value is non-empty;
 * otherwise fall back to the English/base field (`title`).
 */
export function pickLocalizedString(
  doc: Record<string, unknown> | null | undefined,
  field: string,
  locale: Locale,
): string {
  if (!doc) return ''
  if (locale === 'bn') {
    const bn = doc[`${field}Bn`]
    if (typeof bn === 'string' && bn.trim()) return bn
  }
  const base = doc[field]
  return typeof base === 'string' ? base : ''
}

/** Prefer Bangla rich-text / mixed field when present. */
export function pickLocalizedRichText(
  doc: Record<string, unknown> | null | undefined,
  field: string,
  locale: Locale,
): unknown {
  if (!doc) return null
  if (locale === 'bn') {
    const bn = doc[`${field}Bn`]
    if (bn !== undefined && bn !== null && bn !== '') return bn
  }
  return doc[field] ?? null
}

export function pickLocalizedList<T extends Record<string, unknown>>(
  enList: T[] | null | undefined,
  bnList: T[] | null | undefined,
  locale: Locale,
): T[] {
  if (locale === 'bn' && Array.isArray(bnList) && bnList.length > 0) {
    return bnList
  }
  return Array.isArray(enList) ? enList : []
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
      const question =
        locale === 'bn' && f.questionBn?.trim()
          ? f.questionBn.trim()
          : (f.question || '').trim()
      const answer =
        locale === 'bn' && f.answerBn?.trim()
          ? f.answerBn.trim()
          : (f.answer || '').trim()
      return { question, answer }
    })
    .filter((f) => f.question && f.answer)
}
