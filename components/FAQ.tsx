'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiHelpCircle } from 'react-icons/fi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FAQDoc {
  id: string
  question: string
  answer: string
  order?: number
  isActive?: boolean
}

interface FAQProps {
  faqs: FAQDoc[]
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const headingVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
  },
}

const subTextVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] as const },
  },
}

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] as const },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FAQ({ faqs }: FAQProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null)

  if (faqs.length === 0) return null

  const toggle = (id: string) =>
    setOpenId((prev) => (prev === id ? null : id))

  return (
    <section className="py-20 md:py-28 px-6 bg-[#f5f8ff]/50 border-t border-zinc-100 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#E61C24]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10">

        {/* ── Heading ── */}
        <div className="text-center mb-14">
          <motion.p
            variants={subTextVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-base font-bold text-[#E61C24] mb-3 tracking-wide uppercase"
          >
            Got Questions?
          </motion.p>

          <motion.h2
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-[1.2]"
          >
            Frequently Asked{' '}
            <span className="text-[#E61C24]">Questions</span>
          </motion.h2>

          <motion.p
            variants={subTextVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-4 text-base font-semibold text-zinc-500 max-w-xl mx-auto leading-relaxed"
          >
            Everything you need to know about Canadian Nest. Can&apos;t find the answer
            you&apos;re looking for? Feel free to reach out to us.
          </motion.p>
        </div>

        {/* ── Accordion ── */}
        <motion.div
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="space-y-3 max-w-3xl mx-auto"
        >
          {faqs.map((faq) => {
            const isOpen = openId === faq.id

            return (
              <motion.div key={faq.id} variants={itemVariants}>
                <div
                  className={`rounded-lg border cursor-pointer select-none overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? 'bg-[#E61C24] border-[#E61C24] shadow-lg shadow-[#E61C24]/20'
                      : 'bg-white border-zinc-200/80 hover:border-[#E61C24]/40 hover:shadow-md'
                  }`}
                >
                  {/* Question row */}
                  <motion.button
                    type="button"
                    onClick={() => toggle(faq.id)}
                    whileTap={{ scale: 0.995 }}
                    className="w-full flex items-center justify-between px-6 py-5 gap-4 text-left"
                  >
                    <span
                      className={`text-base font-bold leading-snug transition-colors duration-300 ${
                        isOpen ? 'text-white' : 'text-zinc-800'
                      }`}
                    >
                      {faq.question}
                    </span>

                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        isOpen
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      <FiPlus className="h-4 w-4" />
                    </motion.span>
                  </motion.button>

                  {/* Answer */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-6 pb-6 border-t border-white/15">
                          <p className="text-base font-semibold text-white/90 leading-relaxed pt-4">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── Still have questions? CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-lg bg-white border border-zinc-200/80 shadow-sm max-w-3xl mx-auto"
        >
          <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 flex items-center justify-center shrink-0">
            <FiHelpCircle className="h-5 w-5 text-[#E61C24]" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-base font-bold text-zinc-800">Still have questions?</p>
            <p className="text-base font-semibold text-zinc-550">
              Our support team is happy to help you out.
            </p>
          </div>
          <a
            href="mailto:info.canadiannestschool@gmail.com"
            className="shrink-0 px-5 py-3 bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base rounded-lg shadow-md shadow-[#E61C24]/20 transition-all duration-300"
          >
            Contact Support
          </a>
        </motion.div>

      </div>
    </section>
  )
}
