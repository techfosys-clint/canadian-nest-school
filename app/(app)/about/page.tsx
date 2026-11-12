import AboutClient from './AboutClient'
import { getLocale } from '@/lib/i18n/getLocale'
import { getMessages } from '@/lib/i18n/getMessages'

export async function generateMetadata() {
  const locale = await getLocale()
  const t = getMessages(locale).about
  return {
    title: t.metaTitle,
    description: t.metaDescription,
  }
}

export default function AboutPage() {
  return <AboutClient />
}
