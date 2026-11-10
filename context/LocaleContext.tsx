'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { defaultLocale, type Locale } from '@/lib/i18n/config'
import { getMessages } from '@/lib/i18n/getMessages'
import type { Messages } from '@/lib/i18n/messages/types'
import {
  localeFromPathname,
  localizedPath,
  stripLocalePrefix,
} from '@/lib/i18n/path'

type LocaleContextValue = {
  locale: Locale
  messages: Messages
  /** Locale-aware href builder */
  href: (path: string) => string
  /** Pathname without `/en` prefix (for active-link checks) */
  barePathname: string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  /** Optional SSR locale; client still derives from URL. */
  initialLocale?: Locale
}) {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname) || initialLocale || defaultLocale
  const barePathname = stripLocalePrefix(pathname)
  const messages = getMessages(locale)

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages,
      href: (path: string) => localizedPath(path, locale),
      barePathname,
    }),
    [locale, messages, barePathname],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. admin)
    return {
      locale: defaultLocale,
      messages: getMessages(defaultLocale),
      href: (path) => path,
      barePathname: '/',
    }
  }
  return ctx
}
