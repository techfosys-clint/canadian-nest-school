'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaLinkedinIn, FaFacebookF } from 'react-icons/fa'
import Swal from 'sweetalert2'

// Nav link definitions — href is the "page" to match against
const MAIN_PAGES = [
  { label: 'Home',     href: '/',          match: '/' },
  { label: 'Company',  href: '/#company',  match: null },
  { label: 'Works',    href: '/#courses',  match: '/courses' },
  { label: 'Services', href: '/#services', match: null },
  { label: 'Pricing',  href: '/#pricing',  match: null },
]

const QUICK_LINKS = [
  { label: 'Blogs',   href: '/blogs',   match: '/blogs' },
  { label: 'Career',  href: '/#career',  match: '/career' },
  { label: 'Contact', href: '/contact',  match: '/contact' },
]

export default function Footer() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Returns true if this link should be highlighted as active
  const isActive = (match: string | null): boolean => {
    if (!match) return false
    if (match === '/') return pathname === '/'
    return pathname === match || pathname.startsWith(match + '/')
  }

  const linkClass = (match: string | null) =>
    isActive(match)
      ? 'text-[#E61C24] font-bold transition-colors'
      : 'text-zinc-400 hover:text-[#E61C24] transition-colors'

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      Swal.fire({
        icon: 'success',
        title: 'Subscribed!',
        text: 'Thank you for subscribing to our newsletter.',
        confirmButtonColor: '#E61C24',
      })
      setEmail('')
    } catch (error) {
      console.error(error)
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Something went wrong, please try again.',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="bg-[#0b0b0f] text-zinc-300 relative overflow-hidden mt-auto font-sans">

      {/* ── Main grid ── */}
      <div className="container mx-auto px-6 pt-16 pb-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Col 1 – Branding & Info */}
          <div className="lg:col-span-5 space-y-6">
            <Link href="/" className="inline-flex items-center bg-white px-3 py-1.5 rounded-lg shadow-sm group">
              <img
                src="/logo.png"
                alt="Canadian Nest School"
                className="h-15 w-auto object-contain transition-transform group-hover:scale-102 duration-300"
              />
            </Link>

            <div className="space-y-4 text-base text-zinc-400 leading-relaxed">
              <p>
                Empowering children, teens, adults, and educators through high-quality English education, phonics-based learning, IELTS preparation, and teacher training programs.
              </p>
              <p className="font-semibold text-white border-l-2 border-[#E61C24] pl-3">
                Building Confident English Learners Through Canadian Educational Standards.
              </p>
            </div>

            {/* Removed Subscribe to our Newsletter */}
          </div>

          {/* Group Main Pages & Quick Links to display side-by-side on mobile */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-4 md:col-span-2 lg:pl-2">
            {/* Col 2 – Main Pages */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">
                Main Pages
              </h3>
              <ul className="space-y-3 text-base">
                {MAIN_PAGES.map(({ label, href, match }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass(match)}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 – Quick Links */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">
                Quick Links
              </h3>
              <ul className="space-y-3 text-base">
                {QUICK_LINKS.map(({ label, href, match }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass(match)}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Col 4 – Get in Touch + Follow Us */}
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">
                Get in Touch
              </h3>
              <div className="space-y-2 text-base">
                <p>
                  <span className="text-[#E61C24]">Phone:</span>{' '}
                  <a href="tel:+8801617643566" className="text-zinc-300 hover:text-[#E61C24] transition-colors">
                    +880 1617-643566
                  </a>
                </p>
                <p>
                  <span className="text-[#E61C24]">Email:</span>{' '}
                  <a href="mailto:info@tutorspace.com" className="text-zinc-300 hover:text-[#E61C24] transition-colors">
                    info@tutorspace.com
                  </a>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">
                Follow Us
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  <FaLinkedinIn className="h-4 w-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  <FaFacebookF className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-zinc-800 mt-14 pt-8 pb-2 flex flex-col md:flex-row items-center justify-between gap-4 text-base text-zinc-500 relative z-10">
          <Link
            href="/privacy-policy"
            className={pathname === '/privacy-policy' ? 'text-[#E61C24] font-bold' : 'hover:text-zinc-300 transition-colors'}
          >
            Privacy policy
          </Link>
          <div className="text-center text-zinc-500 text-base">
            &copy; 2026 Canadian Nest School. All Rights Reserved. Design &amp; Developed By{' '}
            <a href="https://www.teachfosys.com/" target="_blank" rel="noopener noreferrer" className="text-[#E61C24] hover:underline font-bold">
              Teachfosys
            </a>
          </div>
          <Link
            href="/terms-of-service"
            className={pathname === '/terms-of-service' ? 'text-[#E61C24] font-bold' : 'hover:text-zinc-300 transition-colors'}
          >
            Terms of Use
          </Link>
        </div>
      </div>

      {/* ── Watermark ── */}
      <div
        aria-hidden="true"
        className="select-none pointer-events-none text-center leading-none overflow-hidden pb-4"
      >
        <span className="text-[12vw] font-bold text-white/[0.04] uppercase tracking-tight whitespace-nowrap block">
          Canadian Nest
        </span>
      </div>

    </footer>
  )
}
