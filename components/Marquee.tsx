'use client'

import { useLocale } from '@/context/LocaleContext'
import MarqueeClient from './MarqueeClient'

export default function Marquee() {
  const { messages } = useLocale()
  const items = messages.categories.marquee

  return <MarqueeClient items={items} />
}
