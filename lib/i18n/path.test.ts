import { describe, expect, it } from 'vitest'
import {
  localeFromPathname,
  localizedPath,
  stripLocalePrefix,
  switchLocalePath,
} from '@/lib/i18n/path'

describe('stripLocalePrefix', () => {
  it('strips /en and /en/... prefixes', () => {
    expect(stripLocalePrefix('/en')).toBe('/')
    expect(stripLocalePrefix('/en/')).toBe('/')
    expect(stripLocalePrefix('/en/courses')).toBe('/courses')
    expect(stripLocalePrefix('/en/courses/abc')).toBe('/courses/abc')
  })

  it('leaves Bangla (unprefixed) paths unchanged', () => {
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/courses')).toBe('/courses')
    expect(stripLocalePrefix('/about')).toBe('/about')
  })
})

describe('localeFromPathname', () => {
  it('detects English from /en prefix', () => {
    expect(localeFromPathname('/en')).toBe('en')
    expect(localeFromPathname('/en/courses')).toBe('en')
  })

  it('defaults everything else to Bangla', () => {
    expect(localeFromPathname('/')).toBe('bn')
    expect(localeFromPathname('/courses')).toBe('bn')
    expect(localeFromPathname('/english')).toBe('bn')
    expect(localeFromPathname('/energy')).toBe('bn')
  })
})

describe('localizedPath', () => {
  it('keeps Bangla paths unprefixed', () => {
    expect(localizedPath('/', 'bn')).toBe('/')
    expect(localizedPath('/courses', 'bn')).toBe('/courses')
    expect(localizedPath('courses', 'bn')).toBe('/courses')
  })

  it('prefixes English public paths with /en', () => {
    expect(localizedPath('/', 'en')).toBe('/en')
    expect(localizedPath('/courses', 'en')).toBe('/en/courses')
    expect(localizedPath('/courses/abc', 'en')).toBe('/en/courses/abc')
    expect(localizedPath('about', 'en')).toBe('/en/about')
  })

  it('never prefixes excluded routes (admin, checkout, auth, etc.)', () => {
    expect(localizedPath('/admin', 'en')).toBe('/admin')
    expect(localizedPath('/checkout/abc', 'en')).toBe('/checkout/abc')
    expect(localizedPath('/login', 'en')).toBe('/login')
    expect(localizedPath('/dashboard', 'en')).toBe('/dashboard')
    expect(localizedPath('/courses/abc/watch', 'en')).toBe(
      '/courses/abc/watch',
    )
  })
})

describe('switchLocalePath', () => {
  it('switches Bangla public page to English', () => {
    expect(switchLocalePath('/courses', 'en')).toBe('/en/courses')
    expect(switchLocalePath('/', 'en')).toBe('/en')
  })

  it('switches English public page to Bangla', () => {
    expect(switchLocalePath('/en/courses', 'bn')).toBe('/courses')
    expect(switchLocalePath('/en', 'bn')).toBe('/')
  })

  it('keeps excluded routes unprefixed when switching', () => {
    expect(switchLocalePath('/admin/courses', 'en')).toBe('/admin/courses')
    expect(switchLocalePath('/en/login', 'bn')).toBe('/login')
    expect(switchLocalePath('/en/checkout/x', 'en')).toBe('/checkout/x')
  })
})
