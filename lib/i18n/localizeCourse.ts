import type { Locale } from './config'
import {
  pickLocalizedFaqs,
  pickLocalizedList,
  pickLocalizedRichText,
  pickLocalizedString,
} from './pickLocalized'

/** Resolve display fields for a course document at a given locale. */
export function localizeCourseDoc(doc: Record<string, any>, locale: Locale) {
  const title = pickLocalizedString(doc, 'title', locale) || doc.title || ''
  const summary = pickLocalizedString(doc, 'summary', locale) || doc.summary || ''
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

  const metaTitle =
    locale === 'bn' && doc.seo?.metaTitleBn?.trim()
      ? doc.seo.metaTitleBn
      : doc.seo?.metaTitle
  const metaDescription =
    locale === 'bn' && doc.seo?.metaDescriptionBn?.trim()
      ? doc.seo.metaDescriptionBn
      : doc.seo?.metaDescription

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
  return pickLocalizedString(instructor, 'bio', locale) || instructor.bio || ''
}

export function localizeFaqDoc(doc: Record<string, any>, locale: Locale) {
  return {
    question:
      locale === 'bn' && doc.questionBn?.trim()
        ? doc.questionBn
        : doc.question || '',
    answer:
      locale === 'bn' && doc.answerBn?.trim()
        ? doc.answerBn
        : doc.answer || '',
  }
}
