import { describe, expect, it } from 'vitest'
import {
  localizeCourseDoc,
  localizeFaqDoc,
  localizeInstructorBio,
} from '@/lib/i18n/localizeCourse'

const courseDoc = {
  title: 'Spoken English',
  titleBn: 'স্পোকেন ইংলিশ',
  summary: 'EN summary',
  summaryBn: 'বাংলা সারাংশ',
  description: { root: 'en' },
  descriptionBn: { root: 'bn' },
  whatYouWillLearn: ['Speak fluently'],
  whatYouWillLearnBn: ['সাবলীলভাবে কথা বলুন'],
  requirements: ['Basic English'],
  requirementsBn: ['মৌলিক ইংরেজি'],
  courseFaqs: [
    {
      question: 'How long?',
      answer: '3 months',
      questionBn: 'কতদিন?',
      answerBn: '৩ মাস',
    },
  ],
  seo: {
    metaTitle: 'SEO EN',
    metaTitleBn: 'এসইও বাংলা',
    metaDescription: 'Desc EN',
    metaDescriptionBn: 'বর্ণনা বাংলা',
  },
}

describe('localizeCourseDoc', () => {
  it('resolves Bangla display fields', () => {
    const localized = localizeCourseDoc(courseDoc, 'bn')
    expect(localized.title).toBe('স্পোকেন ইংলিশ')
    expect(localized.summary).toBe('বাংলা সারাংশ')
    expect(localized.description).toEqual({ root: 'bn' })
    expect(localized.whatYouWillLearn).toEqual(['সাবলীলভাবে কথা বলুন'])
    expect(localized.requirements).toEqual(['মৌলিক ইংরেজি'])
    expect(localized.courseFaqs).toEqual([
      { question: 'কতদিন?', answer: '৩ মাস' },
    ])
    expect(localized.seo).toEqual({
      metaTitle: 'এসইও বাংলা',
      metaDescription: 'বর্ণনা বাংলা',
    })
  })

  it('resolves English display fields', () => {
    const localized = localizeCourseDoc(courseDoc, 'en')
    expect(localized.title).toBe('Spoken English')
    expect(localized.summary).toBe('EN summary')
    expect(localized.description).toEqual({ root: 'en' })
    expect(localized.whatYouWillLearn).toEqual(['Speak fluently'])
    expect(localized.requirements).toEqual(['Basic English'])
    expect(localized.courseFaqs[0].question).toBe('How long?')
    expect(localized.seo.metaTitle).toBe('SEO EN')
  })

  it('falls back to Bangla on English locale when English is missing', () => {
    const localized = localizeCourseDoc(
      {
        ...courseDoc,
        title: '',
        summary: '',
        description: '',
        whatYouWillLearn: [],
        requirements: [],
        courseFaqs: [
          {
            question: '',
            answer: '',
            questionBn: 'কতদিন?',
            answerBn: '৩ মাস',
          },
        ],
        seo: {
          metaTitle: '',
          metaTitleBn: 'এসইও বাংলা',
          metaDescription: '',
          metaDescriptionBn: 'বর্ণনা বাংলা',
        },
      },
      'en',
    )
    expect(localized.title).toBe('স্পোকেন ইংলিশ')
    expect(localized.summary).toBe('বাংলা সারাংশ')
    expect(localized.description).toEqual({ root: 'bn' })
    expect(localized.whatYouWillLearn).toEqual(['সাবলীলভাবে কথা বলুন'])
    expect(localized.requirements).toEqual(['মৌলিক ইংরেজি'])
    expect(localized.courseFaqs).toEqual([
      { question: 'কতদিন?', answer: '৩ মাস' },
    ])
    expect(localized.seo).toEqual({
      metaTitle: 'এসইও বাংলা',
      metaDescription: 'বর্ণনা বাংলা',
    })
  })
})

describe('localizeInstructorBio', () => {
  it('prefers bioBn for Bangla and falls back for English', () => {
    expect(
      localizeInstructorBio({ bio: 'EN bio', bioBn: 'বাংলা বায়ো' }, 'bn'),
    ).toBe('বাংলা বায়ো')
    expect(
      localizeInstructorBio({ bio: '', bioBn: 'বাংলা বায়ো' }, 'en'),
    ).toBe('বাংলা বায়ো')
  })

  it('handles null instructor', () => {
    expect(localizeInstructorBio(null, 'bn')).toBe('')
  })
})

describe('localizeFaqDoc', () => {
  it('picks locale-specific question/answer with Bangla fallback', () => {
    const doc = {
      question: 'Q?',
      answer: 'A',
      questionBn: 'প্রশ্ন?',
      answerBn: 'উত্তর',
    }
    expect(localizeFaqDoc(doc, 'bn')).toEqual({
      question: 'প্রশ্ন?',
      answer: 'উত্তর',
    })
    expect(localizeFaqDoc(doc, 'en')).toEqual({ question: 'Q?', answer: 'A' })
    expect(
      localizeFaqDoc(
        { question: '', answer: '', questionBn: 'প্রশ্ন?', answerBn: 'উত্তর' },
        'en',
      ),
    ).toEqual({ question: 'প্রশ্ন?', answer: 'উত্তর' })
  })
})
