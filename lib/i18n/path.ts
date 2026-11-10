import { defaultLocale, isLocaleExcludedPath, type Locale } from './config'

/** Strip `/en` prefix from a browser pathname. */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) {
    const stripped = pathname.slice(3)
    return stripped.length ? stripped : '/'
  }
  return pathname
}

/** Detect locale from the URL the user sees. */
export function localeFromPathname(pathname: string): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en'
  return defaultLocale
}

/**
 * Build a locale-aware href.
 * Bangla (default) has no prefix; English uses `/en/...`.
 * Excluded routes (admin, checkout, etc.) are never prefixed.
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (isLocaleExcludedPath(clean)) return clean
  if (locale === 'en') {
    if (clean === '/') return '/en'
    return `/en${clean}`
  }
  return clean
}

/** Swap current path to the other locale (same page). */
export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const bare = stripLocalePrefix(pathname)
  if (isLocaleExcludedPath(bare)) return bare
  return localizedPath(bare, nextLocale)
}
