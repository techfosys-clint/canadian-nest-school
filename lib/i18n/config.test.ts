import { describe, expect, it } from 'vitest'
import {
  defaultLocale,
  isLocaleExcludedPath,
  isValidLocale,
  locales,
} from '@/lib/i18n/config'

describe('i18n config', () => {
  it('defaults to Bangla with bn/en locales', () => {
    expect(defaultLocale).toBe('bn')
    expect([...locales]).toEqual(['bn', 'en'])
  })

  it('validates locale strings', () => {
    expect(isValidLocale('bn')).toBe(true)
    expect(isValidLocale('en')).toBe(true)
    expect(isValidLocale('fr')).toBe(false)
    expect(isValidLocale('')).toBe(false)
    expect(isValidLocale(null)).toBe(false)
    expect(isValidLocale(undefined)).toBe(false)
  })

  it.each([
    '/api',
    '/api/courses',
    '/admin',
    '/admin/courses',
    '/dashboard',
    '/dashboard/courses',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/checkout',
    '/checkout/abc',
    '/shop-checkout',
    '/media',
    '/admin-report',
    '/courses/abc/watch',
  ])('excludes %s from locale prefixing', (pathname) => {
    expect(isLocaleExcludedPath(pathname)).toBe(true)
  })

  it.each([
    '/',
    '/courses',
    '/courses/abc',
    '/about',
    '/contact',
    '/instructors',
    '/shop',
    '/en',
    '/en/courses',
  ])('allows locale prefixing on public path %s', (pathname) => {
    expect(isLocaleExcludedPath(pathname)).toBe(false)
  })
})
