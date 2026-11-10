import { beforeEach, describe, expect, it, vi } from 'vitest'

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

import { getLocale } from '@/lib/i18n/getLocale'

describe('getLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads valid x-locale from middleware headers', async () => {
    headersMock.mockResolvedValue({
      get: (key: string) => (key === 'x-locale' ? 'en' : null),
    })
    await expect(getLocale()).resolves.toBe('en')

    headersMock.mockResolvedValue({
      get: (key: string) => (key === 'x-locale' ? 'bn' : null),
    })
    await expect(getLocale()).resolves.toBe('bn')
  })

  it('defaults to Bangla when header is missing/invalid', async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    })
    await expect(getLocale()).resolves.toBe('bn')

    headersMock.mockResolvedValue({
      get: () => 'fr',
    })
    await expect(getLocale()).resolves.toBe('bn')
  })
})
