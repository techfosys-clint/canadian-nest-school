import { describe, expect, it } from 'vitest'
import { getMessages } from '@/lib/i18n/getMessages'
import bn from '@/lib/i18n/messages/bn'
import en from '@/lib/i18n/messages/en'

function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      leafPaths(item, `${prefix}[${index}]`),
    )
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

describe('getMessages', () => {
  it('returns Bangla and English catalogs', () => {
    expect(getMessages('bn')).toBe(bn)
    expect(getMessages('en')).toBe(en)
  })

  it('keeps bn/en message key trees in sync', () => {
    const bnPaths = leafPaths(bn).sort()
    const enPaths = leafPaths(en).sort()
    expect(enPaths).toEqual(bnPaths)
  })

  it('has non-empty string leaves in both catalogs', () => {
    for (const [locale, catalog] of [
      ['bn', bn],
      ['en', en],
    ] as const) {
      for (const path of leafPaths(catalog)) {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
        let cur: unknown = catalog
        for (const part of parts) {
          cur = (cur as Record<string, unknown>)[part]
        }
        expect(typeof cur, `${locale}:${path}`).toBe('string')
        expect(String(cur).trim().length, `${locale}:${path}`).toBeGreaterThan(
          0,
        )
      }
    }
  })

  it('exposes expected top-level UI sections', () => {
    const messages = getMessages('en')
    expect(Object.keys(messages).sort()).toEqual(
      [
        'about',
        'common',
        'contact',
        'courses',
        'cta',
        'features',
        'footer',
        'hero',
        'instructors',
        'lang',
        'nav',
      ].sort(),
    )
  })

  it('keeps feature item counts aligned across locales', () => {
    expect(getMessages('bn').features.items).toHaveLength(
      getMessages('en').features.items.length,
    )
  })
})
