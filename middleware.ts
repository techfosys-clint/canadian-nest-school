import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authenticated pages must never be cached by the browser or any proxy.
 * Without this, a logged-out user can press Back (or reopen a tab) and see
 * a cached copy of the dashboard / course player from their old session.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/checkout/:path*',
    '/shop-checkout/:path*',
    '/courses/:slug/watch',
  ],
}
