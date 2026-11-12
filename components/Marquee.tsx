'use client'

import { useLocale } from '@/context/LocaleContext'
import MarqueeClient from './MarqueeClient'

export default function Marquee() {
  const { messages } = useLocale()
  const items = messages.categories.items.map((item) => item.title)

  return <MarqueeClient items={items} />
}
