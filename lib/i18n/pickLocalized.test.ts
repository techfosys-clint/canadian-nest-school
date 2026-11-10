import { describe, expect, it } from 'vitest'
import {
  pickLocalizedFaqs,
  pickLocalizedList,
  pickLocalizedRichText,
  pickLocalizedString,
} from '@/lib/i18n/pickLocalized'

describe('pickLocalizedString', () => {
  const doc = {
    title: 'English Title',
    titleBn: 'বাংলা শিরোনাম',
    summary: '',
    summaryBn: 'বাংলা সারাংশ',
  }

  it('uses Bangla on bn locale', () => {
    expect(pickLocalizedString(doc, 'title', 'bn')).toBe('বাংলা শিরোনাম')
  })

  it('uses English on en locale when present', () => {
    expect(pickLocalizedString(doc, 'title', 'en')).toBe('English Title')
  })

  it('falls back to Bangla on en locale when English is empty', () => {
    expect(pickLocalizedString(doc, 'summary', 'en')).toBe('বাংলা সারাংশ')
  })

  it('falls back to English on bn locale when Bangla is blank (legacy)', () => {
    expect(
      pickLocalizedString(
        { title: 'English Title', titleBn: '   ' },
        'title',
        'bn',
      ),
    ).toBe('English Title')
  })

  it('returns empty string for missing docs/fields', () => {
    expect(pickLocalizedString(null, 'title', 'bn')).toBe('')
    expect(pickLocalizedString({}, 'title', 'bn')).toBe('')
    expect(pickLocalizedString({ title: 123 }, 'title', 'en')).toBe('')
  })
})

describe('pickLocalizedRichText', () => {
  it('prefers Bangla rich text on bn and English on en', () => {
    const doc = {
      description: { type: 'en' },
      descriptionBn: { type: 'bn' },
    }
    expect(pickLocalizedRichText(doc, 'description', 'bn')).toEqual({
      type: 'bn',
    })
    expect(pickLocalizedRichText(doc, 'description', 'en')).toEqual({
      type: 'en',
    })
  })

  it('falls back to Bangla when English rich text is empty', () => {
    expect(
      pickLocalizedRichText(
        { description: '', descriptionBn: { type: 'bn' } },
        'description',
        'en',
      ),
    ).toEqual({ type: 'bn' })
  })

  it('falls back to English when Bangla rich text is empty (legacy)', () => {
    expect(
      pickLocalizedRichText(
        { description: { type: 'en' }, descriptionBn: '' },
        'description',
        'bn',
      ),
    ).toEqual({ type: 'en' })
    expect(pickLocalizedRichText(null, 'description', 'bn')).toBeNull()
  })
})

describe('pickLocalizedList', () => {
  const en = [{ text: 'a' }, { text: 'b' }]
  const bn = [{ text: 'ক' }]

  it('uses Bangla list on bn locale', () => {
    expect(pickLocalizedList(en, bn, 'bn')).toEqual(bn)
  })

  it('uses English list on en locale when present', () => {
    expect(pickLocalizedList(en, bn, 'en')).toEqual(en)
  })

  it('falls back to Bangla list on en locale when English is empty', () => {
    expect(pickLocalizedList([], bn, 'en')).toEqual(bn)
    expect(pickLocalizedList(null, bn, 'en')).toEqual(bn)
  })

  it('falls back to English list on bn locale when Bangla is empty (legacy)', () => {
    expect(pickLocalizedList(en, [], 'bn')).toEqual(en)
  })

  it('returns [] when both lists are missing', () => {
    expect(pickLocalizedList(null, null, 'en')).toEqual([])
  })
})

describe('pickLocalizedFaqs', () => {
  const faqs = [
    {
      question: 'Q EN',
      answer: 'A EN',
      questionBn: 'প্রশ্ন',
      answerBn: 'উত্তর',
    },
    {
      question: '',
      answer: '',
      questionBn: 'শুধু বাংলা',
      answerBn: 'বাংলা উত্তর',
    },
    {
      question: '',
      answer: '',
      questionBn: '',
      answerBn: '',
    },
  ]

  it('maps Bangla FAQ fields on bn locale', () => {
    expect(pickLocalizedFaqs(faqs, 'bn')).toEqual([
      { question: 'প্রশ্ন', answer: 'উত্তর' },
      { question: 'শুধু বাংলা', answer: 'বাংলা উত্তর' },
    ])
  })

  it('uses English FAQ fields on en, falling back to Bangla', () => {
    expect(pickLocalizedFaqs(faqs, 'en')).toEqual([
      { question: 'Q EN', answer: 'A EN' },
      { question: 'শুধু বাংলা', answer: 'বাংলা উত্তর' },
    ])
  })

  it('returns [] for non-arrays', () => {
    expect(pickLocalizedFaqs(null, 'bn')).toEqual([])
    expect(pickLocalizedFaqs(undefined, 'en')).toEqual([])
  })
})
