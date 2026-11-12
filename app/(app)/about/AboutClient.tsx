'use client';

import CTASection from '@/components/CTASection';
import { useLocale } from '@/context/LocaleContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiBookOpen,
  FiClock,
  FiGlobe,
  FiLayers,
  FiSettings,
  FiShield,
} from 'react-icons/fi';

const PILLAR_ICONS = [FiBookOpen, FiShield, FiGlobe];
const OFFER_ICONS = [
  FiBookOpen,
  FiLayers,
  FiClock,
  FiShield,
  FiGlobe,
  FiSettings,
];

export default function AboutClient() {
  const { messages, href } = useLocale();
  const t = messages.about;
  const nav = messages.nav;

  const fadeInUp = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const statCardVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <div className='min-h-screen bg-white select-text'>
      {/* ── SECTION 1 & 2: ABOUT HEADER & STATS HERO ── */}
      <section className='pt-36 pb-24 px-6 relative overflow-hidden bg-white'>
        {/* Subtle background glow */}
        <div className='absolute top-1/4 right-1/4 w-150 h-100 bg-[#E61C24]/5 rounded-full blur-[130px] pointer-events-none' />

        <div className='container mx-auto space-y-16'>
          {/* About Centered Header (Screenshot 1) - Staggered reveal */}
          <motion.div
            variants={staggerContainer}
            initial='hidden'
            animate='visible'
            className='text-center max-w-3xl mx-auto space-y-5'
          >
            {/* Centered Breadcrumbs */}
            <motion.div
              variants={fadeInUp}
              className='flex items-center justify-center gap-1.5 text-base font-semibold text-zinc-500 mb-2 select-none'
            >
              <Link
                href={href('/')}
                className='hover:text-[#E61C24] transition-colors'
              >
                {nav.home}
              </Link>
              <span className='text-zinc-300 font-normal'>/</span>
              <span className='text-[#0A163A]'>{t.breadcrumb}</span>
            </motion.div>

            {/* Centered Badge Pill */}
            <motion.div
              variants={fadeInUp}
              className='inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E61C24]/8 border border-[#E61C24]/15 rounded-full select-none shadow-sm shadow-[#E61C24]/5'
            >
              <span className='w-2 h-2 rounded-full bg-[#E61C24] animate-pulse' />
              <span className='text-sm font-bold text-[#E61C24] uppercase tracking-wider'>
                {t.badge}
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeInUp}
              className='text-4xl sm:text-5xl md:text-6xl font-bold text-[#0A163A] tracking-tight leading-[1.2]'
            >
              {t.headingBefore}{' '}
              <span className='text-[#E61C24]'>{t.headingAccent}</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeInUp}
              className='text-base sm:text-lg font-semibold text-[#4F5B7C] leading-relaxed max-w-2xl mx-auto'
            >
              {t.intro}
            </motion.p>
          </motion.div>

          {/* Stats Hero Block (Screenshot 2) */}
          <div className='space-y-12'>
            {/* Hero Image - Soft slide and zoom */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className='relative aspect-16/7 w-full bg-zinc-50 rounded-lg overflow-hidden border border-zinc-200/50 shadow-md'
            >
              <Image
                src='https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'
                alt={t.heroImageAlt}
                className='w-full h-full object-cover pointer-events-none'
                width={1800}
                height={1800}
              />
            </motion.div>

            {/* Stats Grid - Staggered entrance on scroll */}
            <motion.div
              variants={staggerContainer}
              initial='hidden'
              whileInView='visible'
              viewport={{ once: true, amount: 0.15 }}
              className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-6'
            >
              {t.stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={statCardVariants}
                  whileHover={{
                    y: -5,
                    transition: { duration: 0.2, ease: 'easeOut' },
                  }}
                  className='p-5 bg-[#E61C24]/4 rounded-lg border border-[#E61C24]/15 flex flex-col gap-2 transition-all duration-300 hover:border-[#E61C24]/35 shadow-sm hover:shadow-md cursor-pointer'
                >
                  <span className='text-[#E61C24] text-4xl md:text-5xl font-bold'>
                    {stat.value}
                  </span>
                  <span className='text-[#0A163A] text-lg font-bold'>
                    {stat.label}
                  </span>
                  <p className='text-[#4F5B7C] text-base font-semibold leading-relaxed'>
                    {stat.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: OUR PURPOSE & VALUES (Premium Redesigned Section) ── */}
      <section className='py-20 md:py-28 px-6 bg-linear-to-b from-[#F8FAFC] to-[#F1F5F9] border-t border-b border-slate-100 relative overflow-hidden'>
        {/* Decorative background gradients */}
        <div className='absolute top-0 right-0 w-112.5 h-112.5 bg-[#E61C24]/3 rounded-full blur-[120px] pointer-events-none' />
        <div className='absolute bottom-0 left-0 w-112.5 h-112.5 bg-sky-500/3 rounded-full blur-[120px] pointer-events-none' />

        <div className='container mx-auto relative z-10'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'>
            {/* Left Column: Overlapping Visual Cards Deck */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className='lg:col-span-6 relative flex items-center justify-center min-h-100 md:min-h-115'
            >
              {/* Decorative dotted pattern overlay */}
              <div
                className='absolute inset-0 opacity-[0.25] pointer-events-none'
                style={{
                  backgroundImage:
                    'radial-gradient(#E61C24 1.2px, transparent 1.2px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Main Image Frame */}
              <div className='relative w-4/5 aspect-4/3 rounded-lg overflow-hidden border border-slate-200 shadow-lg group'>
                <Image
                  src='https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80'
                  alt={t.teamImageAlt}
                  className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]'
                  width={700}
                  height={500}
                />
              </div>

              {/* Overlapping Floating Card 1: Success Rate */}
              <motion.div
                whileHover={{ y: -3 }}
                className='absolute bottom-4 left-4 sm:left-10 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-lg p-4 shadow-lg max-w-50'
              >
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center text-[#E61C24]'>
                    <FiLayers className='h-5 w-5' />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-400 uppercase tracking-wide'>
                      {t.floatingSuccessLabel}
                    </p>
                    <p className='text-lg font-bold text-[#0A163A]'>
                      {t.floatingSuccessValue}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Overlapping Floating Card 2: Interactive Class info */}
              <motion.div
                whileHover={{ y: -3 }}
                className='absolute top-4 right-4 sm:right-10 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-lg p-4 shadow-lg max-w-55'
              >
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600'>
                    <FiGlobe
                      className='h-5 w-5 animate-spin'
                      style={{ animationDuration: '8s' }}
                    />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-400 uppercase tracking-wide'>
                      {t.floatingLiveLabel}
                    </p>
                    <p className='text-lg font-bold text-[#0A163A]'>
                      {t.floatingLiveValue}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: Title & Structured Value Cards */}
            <div className='lg:col-span-6 space-y-8'>
              <div className='space-y-4'>
                <span className='text-[#E61C24] font-bold text-base uppercase tracking-wider'>
                  {t.pillarsEyebrow}
                </span>
                <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A163A] tracking-tight leading-[1.2]'>
                  {t.pillarsTitle}
                </h2>
                <p className='text-base sm:text-lg text-slate-500 font-semibold leading-relaxed'>
                  {t.pillarsSubtitle}
                </p>
              </div>

              {/* Vertical Stack of Value Cards */}
              <div className='space-y-4'>
                {t.pillars.map((pillar, index) => {
                  const Icon = PILLAR_ICONS[index] ?? FiBookOpen;
                  return (
                    <div
                      key={pillar.title}
                      className='bg-white border border-slate-200/80 rounded-lg p-5 flex gap-4 shadow-sm hover:shadow-md transition-shadow group'
                    >
                      <div className='h-12 w-12 rounded-lg bg-[#E61C24]/8 border border-[#E61C24]/15 flex items-center justify-center text-[#E61C24] shrink-0 mt-0.5'>
                        <Icon className='h-6 w-6' />
                      </div>
                      <div className='space-y-1'>
                        <h3 className='text-lg font-bold text-[#0A163A] group-hover:text-[#E61C24] transition-colors'>
                          {pillar.title}
                        </h3>
                        <p className='text-base text-slate-500 font-semibold leading-relaxed'>
                          {pillar.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHAT WE OFFER (Screenshot 4) ── */}
      <section className='py-20 md:py-28 px-6 bg-white border-t border-zinc-100 relative overflow-hidden'>
        {/* Subtle background glow */}
        <div className='absolute top-1/4 right-0 w-137.5 h-95 bg-[#E61C24]/4 rounded-full blur-[130px] pointer-events-none' />

        <div className='container mx-auto relative z-10 space-y-16'>
          {/* Header - Staggered reveal */}
          <motion.div
            variants={staggerContainer}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.2 }}
            className='text-center max-w-3xl mx-auto space-y-4'
          >
            <motion.h2
              variants={fadeInUp}
              className='text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A163A] tracking-tight leading-[1.2]'
            >
              {t.offerTitle}
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className='text-base sm:text-lg font-semibold text-[#4F5B7C] leading-relaxed max-w-2xl mx-auto'
            >
              {t.offerSubtitle}
            </motion.p>
          </motion.div>

          {/* Offer Grid - 3x2 grid layout animated on scroll */}
          <motion.div
            variants={staggerContainer}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.15 }}
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          >
            {t.offers.map((offer, index) => {
              const Icon = OFFER_ICONS[index] ?? FiBookOpen;
              return (
                <motion.div
                  key={offer.title}
                  variants={statCardVariants}
                  whileHover={{
                    y: -5,
                    transition: { duration: 0.2, ease: 'easeOut' as const },
                  }}
                  className='p-6 bg-linear-to-br from-[#E61C24]/4 to-[#E61C24]/8 border border-[#E61C24]/10 rounded-lg shadow-sm hover:shadow-md hover:border-[#E61C24]/30 transition-all duration-300 group cursor-pointer'
                >
                  <div className='w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#E61C24] shadow-sm mb-5 transition-transform group-hover:scale-105 duration-300'>
                    <Icon className='h-6 w-6' />
                  </div>
                  <h3 className='text-xl font-bold text-[#0A163A] mb-2.5'>
                    {offer.title}
                  </h3>
                  <p className='text-base font-semibold text-[#4F5B7C] leading-relaxed'>
                    {offer.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 5: CTA SECTION (Replicated Homepage Last Section) ── */}
      <CTASection />
    </div>
  );
}
