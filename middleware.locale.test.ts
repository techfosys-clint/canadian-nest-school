import { beforeEach, describe, expect, it, vi } from 'vitest'

const { nextMock, rewriteMock, redirectMock } = vi.hoisted(() => ({
  nextMock: vi.fn(),
  rewriteMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: nextMock,
    rewrite: rewriteMock,
    redirect: redirectMock,
  },
}))

import { middleware } from './middleware'

function makeRequest(pathname: string) {
  const url = new URL(`https://example.com${pathname}`)
  return {
    nextUrl: {
      pathname,
      clone() {
        const cloned: { pathname: string; toString(): string } = {
          pathname,
          toString() {
            return `https://example.com${cloned.pathname}`
          },
        }
        return cloned
      },
    },
    url: url.toString(),
  } as any
}

function makeResponse() {
  const headers = new Map<string, string>()
  return {
    headers: {
      set: (k: string, v: string) => headers.set(k, v),
      get: (k: string) => headers.get(k) ?? null,
    },
    _headers: headers,
  }
}

describe('middleware locale routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nextMock.mockImplementation(() => makeResponse())
    rewriteMock.mockImplementation(() => makeResponse())
    redirectMock.mockImplementation((url: { pathname: string }) => ({
      ...makeResponse(),
      redirectedTo: url.pathname,
    }))
  })

  it('sets x-locale=bn for unprefixed public paths', () => {
    const res = middleware(makeRequest('/courses'))
    expect(nextMock).toHaveBeenCalledOnce()
    expect(res.headers.get('x-locale')).toBe('bn')
  })

  it('rewrites /en/... to bare path and sets x-locale=en', () => {
    const res = middleware(makeRequest('/en/courses'))
    expect(rewriteMock).toHaveBeenCalledOnce()
    const rewrittenUrl = rewriteMock.mock.calls[0][0]
    expect(rewrittenUrl.pathname).toBe('/courses')
    expect(res.headers.get('x-locale')).toBe('en')
  })

  it('rewrites /en home to / with x-locale=en', () => {
    const res = middleware(makeRequest('/en'))
    expect(rewriteMock).toHaveBeenCalledOnce()
    expect(rewriteMock.mock.calls[0][0].pathname).toBe('/')
    expect(res.headers.get('x-locale')).toBe('en')
  })

  it('redirects /en-prefixed excluded routes to bare path', () => {
    const res = middleware(makeRequest('/en/login')) as any
    expect(redirectMock).toHaveBeenCalledOnce()
    expect(res.redirectedTo).toBe('/login')
  })

  it('redirects /en/checkout/... away from locale prefix', () => {
    const res = middleware(makeRequest('/en/checkout/abc')) as any
    expect(redirectMock).toHaveBeenCalledOnce()
    expect(res.redirectedTo).toBe('/checkout/abc')
  })

  it('applies no-store on dashboard paths', () => {
    const res = middleware(makeRequest('/dashboard'))
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/)
  })
})
