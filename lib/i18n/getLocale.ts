import { headers } from 'next/headers'
import { defaultLocale, isValidLocale, type Locale } from './config'

/** Read locale set by middleware (`x-locale`). Defaults to Bangla. */
export async function getLocale(): Promise<Locale> {
  const h = await headers()
  const value = h.get('x-locale')
  return isValidLocale(value) ? value : defaultLocale
}
