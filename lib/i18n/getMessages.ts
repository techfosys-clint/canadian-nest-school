import type { Locale } from './config'
import bn from './messages/bn'
import en from './messages/en'
import type { Messages } from './messages/types'

const catalogs: Record<Locale, Messages> = { bn, en }

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.bn
}
