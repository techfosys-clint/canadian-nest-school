import type { Locale } from './config'
import {
  pickLocalizedFaqs,
  pickLocalizedList,
  pickLocalizedRichText,
  pickLocalizedString,
} from './pickLocalized'

/** Resolve display fields for a course document at a given locale. */
export function localizeCourseDoc(doc: Record<string, any>, locale: Locale) {
  const title =
    pickLocalizedString(doc, 'title', locale) ||
    doc.titleBn ||
    doc.title ||
    ''
  const summary =
    pickLocalizedString(doc, 'summary', locale) ||
    doc.summaryBn ||
    doc.summary ||
    ''
  const description = pickLocalizedRichText(doc, 'description', locale)
  const whatYouWillLearn = pickLocalizedList(
    doc.whatYouWillLearn,
    doc.whatYouWillLearnBn,
    locale,
  )
  const requirements = pickLocalizedList(
    doc.requirements,
    doc.requirementsBn,
    locale,
  )
  const courseFaqs = pickLocalizedFaqs(doc.courseFaqs, locale)

  const metaTitleBn = doc.seo?.metaTitleBn?.trim() || ''
  const metaTitleEn = doc.seo?.metaTitle?.trim() || ''
  const metaDescriptionBn = doc.seo?.metaDescriptionBn?.trim() || ''
  const metaDescriptionEn = doc.seo?.metaDescription?.trim() || ''

  const metaTitle =
    locale === 'en'
      ? metaTitleEn || metaTitleBn
      : metaTitleBn || metaTitleEn
  const metaDescription =
    locale === 'en'
      ? metaDescriptionEn || metaDescriptionBn
      : metaDescriptionBn || metaDescriptionEn

  return {
    title,
    summary,
    description,
    whatYouWillLearn,
    requirements,
    courseFaqs,
    seo: {
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || summary,
    },
  }
}

export function localizeInstructorBio(
  instructor: Record<string, any> | null | undefined,
  locale: Locale,
): string {
  if (!instructor) return ''
  return (
    pickLocalizedString(instructor, 'bio', locale) ||
    instructor.bioBn ||
    instructor.bio ||
    ''
  )
}

export function localizeFaqDoc(doc: Record<string, any>, locale: Locale) {
  const questionBn = doc.questionBn?.trim() || ''
  const answerBn = doc.answerBn?.trim() || ''
  const questionEn = doc.question?.trim() || ''
  const answerEn = doc.answer?.trim() || ''

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
}
