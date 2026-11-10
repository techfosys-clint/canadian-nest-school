export const locales = ['bn', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'bn'

/** Routes that never get an `/en` prefix (auth, admin, checkout, API). */
export const localeExcludedPrefixes = [
  '/api',
  '/admin',
  '/dashboard',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/checkout',
  '/shop-checkout',
  '/media',
  '/admin-report',
] as const

export function isLocaleExcludedPath(pathname: string): boolean {
  if (pathname.startsWith('/courses/') && pathname.endsWith('/watch')) {
    return true
  }
  return localeExcludedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isValidLocale(value: string | null | undefined): value is Locale {
  return value === 'bn' || value === 'en'
}
