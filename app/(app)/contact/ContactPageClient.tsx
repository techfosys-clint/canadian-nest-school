'use client';

import type { FAQDoc } from '@/components/FAQ';
import FAQComponent from '@/components/FAQ';
import { useLocale } from '@/context/LocaleContext';
import { localizeFaqDoc } from '@/lib/i18n/localizeCourse';
import ContactFormClient from './ContactFormClient';

export type ContactFaqSource = {
  id: string;
  question?: string;
  answer?: string;
  questionBn?: string;
  answerBn?: string;
  order?: number;
  isActive?: boolean;
};

export default function ContactPageClient({
  faqSources,
}: {
  faqSources: ContactFaqSource[];
}) {
  const { locale, messages } = useLocale();
  const t = messages.contact;

  const faqs: FAQDoc[] = faqSources.map((doc) => {
    const localized = localizeFaqDoc(doc, locale);
    return {
      id: doc.id,
      question: localized.question,
      answer: localized.answer,
      order: doc.order,
      isActive: doc.isActive,
    };
  });

  return (
    <div className='min-h-screen bg-[#ffffff] text-[#0A163A] font-sans relative overflow-hidden pt-28'>
      {/* Decorative ambient glassmorphic glows */}
      <div className='absolute top-20 left-1/4 w-125 h-125 bg-[#E61C24]/5 rounded-full blur-[140px] pointer-events-none' />
      <div className='absolute top-40 right-1/4 w-150 h-100 bg-sky-500/5 rounded-full blur-[130px] pointer-events-none' />

      <div className='container mx-auto px-6 py-12 relative z-10'>
        {/* Header Hero — client locale so বাং/EN stays in sync */}
        <div className='text-center max-w-2xl mx-auto mb-16'>
          <p className='text-base font-bold text-[#E61C24] tracking-wide uppercase mb-3 animate-fade-in'>
            {t.eyebrow}
          </p>
          <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.2]'>
            {t.headingBefore}{' '}
            <span className='text-[#E61C24]'>{t.headingAccent}</span>
          </h1>
          <p className='mt-4 text-base font-semibold text-zinc-500 leading-relaxed'>
            {t.subtitle}
          </p>
        </div>

        <ContactFormClient />
      </div>

      <div className='bg-[#f5f8ff]/30 border-t border-zinc-100'>
        <FAQComponent
          faqs={faqs}
          eyebrow={t.faqEyebrow}
          headingBefore={t.faqHeadingBefore}
          headingAccent={t.faqHeadingAccent}
          subtitle={t.faqSubtitle}
        />
      </div>
    </div>
  );
}
