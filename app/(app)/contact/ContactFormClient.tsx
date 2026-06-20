'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiMail, FiPhone, FiMapPin, FiClock, FiSend } from 'react-icons/fi'
import Swal from 'sweetalert2'

// ─── Animation Variants ───────────────────────────────────────────────────────

const formContainerVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }
}

const infoContainerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }
}

export default function ContactFormClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !subject || !message) {
      Swal.fire({
        icon: 'warning',
        title: 'Fields Required',
        text: 'Please fill in all the required form fields.',
        confirmButtonColor: '#E61C24'
      })
      return
    }

    setSubmitting(true)
    try {
      // Mock API call delay for high fidelity UX
      await new Promise((resolve) => setTimeout(resolve, 1200))
      
      Swal.fire({
        icon: 'success',
        title: 'Message Sent!',
        text: 'Thank you for reaching out. A support representative will get back to you shortly.',
        confirmButtonColor: '#E61C24',
        background: '#ffffff',
        color: '#0A163A'
      })

      // Reset form
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (err) {
      console.error(err)
      Swal.fire({
        icon: 'error',
        title: 'Error Occurred',
        text: 'Failed to send message. Please try again later.',
        confirmButtonColor: '#E61C24'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* ── Left Column: Contact Cards ── */}
        <motion.div
          variants={infoContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="bg-[#f8fafc] rounded-lg p-8 shadow-sm space-y-8 relative overflow-hidden">
            {/* Ambient card background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E61C24]/5 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight pb-4 border-b border-zinc-200">
              Contact Information
            </h2>

            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-[#E61C24]/10 flex items-center justify-center text-[#E61C24] shrink-0 border border-[#E61C24]/20">
                  <FiPhone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-zinc-800">Phone</p>
                  <a href="tel:+8801739534707" className="text-base font-semibold text-zinc-550 hover:text-[#E61C24] transition-colors block">
                    +880 17 3953 4707
                  </a>
                  <p className="text-base font-semibold text-zinc-400">Sunday - Thursday, 9am - 8pm (GMT+6)</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0 border border-sky-500/20">
                  <FiMail className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-zinc-800">Email Address</p>
                  <a href="mailto:info.canadiannestschool@gmail.com" className="text-base font-semibold text-zinc-550 hover:text-sky-500 transition-colors block">
                    info.canadiannestschool@gmail.com
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20">
                  <FiMapPin className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-zinc-800">Our Office</p>
                  <p className="text-base font-semibold text-zinc-550 leading-relaxed">
                    Online Global Platform
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
                  <FiClock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-zinc-800">Support Hours</p>
                  <p className="text-base font-semibold text-zinc-550 leading-relaxed">
                    Sunday through Thursday, 9:00 AM to 8:00 PM (GMT+6).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Right Column: Interactive Form ── */}
        <motion.div
          variants={formContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="lg:col-span-7"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg p-8 shadow-md space-y-6 relative overflow-hidden"
          >
            {/* Form Header */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                Send Us a Message
              </h2>
              <p className="text-base font-semibold text-zinc-500">
                Fill out the form below and we will get back to you within 24 hours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-base font-bold text-zinc-700">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#f8fafc] border border-zinc-200 focus:border-[#E61C24] text-zinc-850 rounded-lg p-3 text-base font-semibold outline-none transition-all"
                />
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-base font-bold text-zinc-700">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  className="w-full bg-[#f8fafc] border border-zinc-200 focus:border-[#E61C24] text-zinc-850 rounded-lg p-3 text-base font-semibold outline-none transition-all"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-2">
              <label htmlFor="subject" className="text-base font-bold text-zinc-700">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Please write the subject of your query here"
                className="w-full bg-[#f8fafc] border border-zinc-200 focus:border-[#E61C24] text-zinc-850 rounded-lg p-3 text-base font-semibold outline-none transition-all"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-base font-bold text-zinc-700">
                Your Message <span className="text-red-400">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please write your questions or detailed message here so we can help you better..."
                className="w-full bg-[#f8fafc] border border-zinc-200 focus:border-[#E61C24] text-zinc-850 rounded-lg p-3 text-base font-semibold outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base rounded-lg transition-all duration-300 shadow-md shadow-[#E61C24]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <span>Sending Message...</span>
              ) : (
                <>
                  <span>Send Message</span>
                  <FiSend className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>
        </motion.div>

      </div>

    </>
  )
}
