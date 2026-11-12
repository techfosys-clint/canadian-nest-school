import { FAQ } from '@/lib/db/models/FAQ'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getLocale } from '@/lib/i18n/getLocale'
import { getMessages } from '@/lib/i18n/getMessages'
import ContactPageClient from './ContactPageClient'
import type { ContactFaqSource } from './ContactPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const locale = await getLocale()
  const t = getMessages(locale).contact
  return {
    title: t.metaTitle,
    description: t.metaDescription,
  }
}

export default async function ContactPage() {
  await connectToDatabase()

  const faqsDocs = await FAQ.find({ isActive: true })
    .sort({ order: 1 })
    .limit(20)
    .lean()

  const faqSources: ContactFaqSource[] = faqsDocs.map((doc: any) => ({
    id: doc._id.toString(),
    question: doc.question,
    answer: doc.answer,
    questionBn: doc.questionBn,
    answerBn: doc.answerBn,
    order: doc.order,
    isActive: doc.isActive,
  }))

  return <ContactPageClient faqSources={faqSources} />
}
