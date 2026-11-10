'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { switchLocalePath } from '@/lib/i18n/path'

export default function LanguageSwitcher() {
  const pathname = usePathname() || '/'
  const { locale, messages } = useLocale()

  const bnHref = switchLocalePath(pathname, 'bn')
  const enHref = switchLocalePath(pathname, 'en')

  const btn = (active: boolean) =>
    active
      ? 'bg-[#E61C24] text-white border border-[#E61C24]'
      : 'bg-white text-zinc-600 border border-zinc-200/80 hover:border-[#E61C24]/40 hover:text-[#E61C24]'

  return (
    <div
      className='inline-flex items-center rounded-lg overflow-hidden shadow-sm'
      role='group'
      aria-label={messages.lang.switchTo}
    >
      <Link
        href={bnHref}
        className={`px-2.5 py-1.5 text-base font-semibold transition-colors ${btn(locale === 'bn')}`}
        hrefLang='bn'
        lang='bn'
      >
        {messages.lang.bn}
      </Link>
      <Link
        href={enHref}
        className={`px-2.5 py-1.5 text-base font-semibold transition-colors border-l-0 ${btn(locale === 'en')}`}
        hrefLang='en'
        lang='en'
      >
        {messages.lang.en}
      </Link>
    </div>
  )
}
