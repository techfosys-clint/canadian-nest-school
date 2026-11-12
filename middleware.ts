import { NextResponse, type NextRequest } from 'next/server'
import { isLocaleExcludedPath } from '@/lib/i18n/config'
import { stripLocalePrefix } from '@/lib/i18n/path'

const NO_CACHE_PREFIXES = [
  '/dashboard',
  '/admin',
  '/checkout',
  '/shop-checkout',
]

function needsNoStore(pathname: string): boolean {
  if (pathname.startsWith('/courses/') && pathname.endsWith('/watch')) {
    return true
  }
  return NO_CACHE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function applyNoStore(response: NextResponse) {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private',
  )
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
}

/** Locale must be on the *request* so RSC `headers().get('x-locale')` works. */
function withLocaleRequest(request: NextRequest, locale: 'bn' | 'en') {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)
  return requestHeaders
}

/**
 * Locale routing (10MS-style):
 * - Bangla (default): `/courses/...`
 * - English: `/en/courses/...` → rewrite to `/courses/...` + `x-locale: en`
 *
 * Auth pages keep no-store headers so back-button cache cannot leak sessions.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // `/en/...` on excluded routes → redirect to unprefixed path
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const bare = stripLocalePrefix(pathname)
    if (isLocaleExcludedPath(bare)) {
      const url = request.nextUrl.clone()
      url.pathname = bare
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = bare
    const response = NextResponse.rewrite(url, {
      request: { headers: withLocaleRequest(request, 'en') },
    })
    response.headers.set('x-locale', 'en')
    if (needsNoStore(bare)) applyNoStore(response)
    return response
  }

  const response = NextResponse.next({
    request: { headers: withLocaleRequest(request, 'bn') },
  })
  response.headers.set('x-locale', 'bn')
  if (needsNoStore(pathname)) applyNoStore(response)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except static assets and Next internals.
     * Locale rewrite + auth no-store both run here.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
