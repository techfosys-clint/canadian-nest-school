import { describe, expect, it } from 'vitest'
import { buildCourseDuration, formatCourseDuration, parseCourseDuration } from './courseDuration'

describe('course duration', () => {
  it('parses stored text into number + unit', () => {
    expect(parseCourseDuration('14 hours')).toEqual({ amount: '14', unit: 'hours' })
    expect(parseCourseDuration('110')).toEqual({ amount: '110', unit: 'hours' })
    expect(parseCourseDuration('6 Weeks')).toEqual({ amount: '6', unit: 'weeks' })
    expect(parseCourseDuration('3 months')).toEqual({ amount: '3', unit: 'months' })
    expect(parseCourseDuration('14 Hours of video lectures')).toEqual({ amount: '14', unit: 'hours' })
    expect(parseCourseDuration('')).toEqual({ amount: '', unit: 'hours' })
    expect(parseCourseDuration('self paced')).toEqual({ amount: '', unit: 'hours' })
  })

  it('builds the stored text with singular/plural', () => {
    expect(buildCourseDuration('14', 'hours')).toBe('14 hours')
    expect(buildCourseDuration('1', 'weeks')).toBe('1 week')
    expect(buildCourseDuration('1', 'months')).toBe('1 month')
    expect(buildCourseDuration('', 'hours')).toBe('')
    expect(buildCourseDuration('0', 'hours')).toBe('')
  })

  it('formats bare numbers as hours and keeps other text', () => {
    expect(formatCourseDuration('110')).toBe('110 hours')
    expect(formatCourseDuration('14 hours')).toBe('14 hours')
    expect(formatCourseDuration('Self paced')).toBe('Self paced')
    expect(formatCourseDuration(null)).toBe('')
  })
})
