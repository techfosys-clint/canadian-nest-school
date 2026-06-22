import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { FAQ } from '@/lib/db/models/FAQ'
import FAQComponent from '@/components/FAQ'
import type { FAQDoc } from '@/components/FAQ'
import ContactFormClient from './ContactFormClient'

export const metadata = {
  title: 'Contact Us - Canadian Nest School',
  description: 'Have questions or feedback? Contact the Canadian Nest School support team today and we will get back to you shortly.',
}

export default async function ContactPage() {
  await connectToDatabase()

  // Fetch FAQs to display on the contact page
  const faqsDocs = await FAQ.find({ isActive: true })
    .sort({ order: 1 })
    .limit(20)
    .lean()

  const faqs: FAQDoc[] = faqsDocs.map((doc: any) => ({
    id: doc._id.toString(),
    question: doc.question,
    answer: doc.answer,
    order: doc.order,
    isActive: doc.isActive,
  }))

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0A163A] font-sans relative overflow-hidden pt-28">
      {/* Decorative ambient glassmorphic glows */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#E61C24]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-sky-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* ── Main Container ── */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-base font-bold text-[#E61C24] tracking-wide uppercase mb-3 animate-fade-in">
            Get in Touch
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.2]">
            We&apos;d Love to <span className="text-[#E61C24]">Hear From You</span>
          </h1>
          <p className="mt-4 text-base font-semibold text-zinc-500 leading-relaxed">
            Have questions about our courses, batches, or platform? Get in touch with our friendly support team.
          </p>
        </div>

        {/* Grid Area: Contact Details & Client Form */}
        <ContactFormClient />

      </div>

      {/* ── FAQ Section at the bottom of the contact page ── */}
      <div className="bg-[#f5f8ff]/30 border-t border-zinc-100">
        <FAQComponent faqs={faqs} />
      </div>
    </div>
  )
}
