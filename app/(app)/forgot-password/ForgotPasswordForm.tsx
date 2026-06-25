'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FiMail, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Email',
        text: 'Please enter your email address.',
        confirmButtonColor: '#615fff',
        background: '#1a1a1a',
        color: '#ffffff',
        customClass: {
          popup: 'rounded-lg',
          confirmButton: 'rounded-lg text-base font-bold px-6 py-2.5 bg-[#615fff]',
        },
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitted(true)
        Swal.fire({
          icon: 'success',
          title: 'Reset Email Sent',
          text: 'If that email exists in our system, we have sent password reset instructions.',
          confirmButtonColor: '#615fff',
          background: '#1a1a1a',
          color: '#ffffff',
          customClass: {
            popup: 'rounded-lg',
            confirmButton: 'rounded-lg text-base font-bold px-6 py-2.5 bg-[#615fff]',
          },
        })
      } else {
        throw new Error(data.message || 'Failed to send reset link.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: err.message || 'Something went wrong.',
        confirmButtonColor: '#615fff',
        background: '#1a1a1a',
        color: '#ffffff',
        customClass: {
          popup: 'rounded-lg',
          confirmButton: 'rounded-lg text-base font-bold px-6 py-2.5 bg-[#615fff]',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      
      {/* ─── LEFT PANE: BRAND EXPERIENCE & MARKETING COVER (MD+ only) ─── */}
      <aside className="hidden md:flex md:w-1/2 flex-col justify-between bg-[#070b19] p-12 text-white relative select-none">
        
        {/* Subtle Glowing Blur Blob */}
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-[#615fff]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm w-fit">
            <img
              src="/logo.png"
              alt="Canadian Nest School"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Middle Hero Slogan */}
        <div className="relative z-10 my-auto py-12 space-y-6">
          <span className="px-3.5 py-1 text-base font-bold text-[#615fff] bg-[#615fff]/10 rounded-lg border border-[#615fff]/20 uppercase tracking-wider w-fit block">
            Forgot Password
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-display">
            Manage your <br />
            <span className="text-[#615fff]">Learning Journey</span>
          </h1>
          <p className="text-zinc-400 font-semibold text-lg leading-relaxed max-w-md">
            Experience the next generation of online learning. Secure, intuitive, and designed specifically for modern students.
          </p>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/40 pt-6">
          <p className="text-zinc-500 font-bold text-base">
            &copy; 2026 Canadian Nest School. All rights reserved.
          </p>
        </div>

      </aside>

      {/* ─── RIGHT PANE: INTERACTIVE FORGOT PASSWORD FORM ─── */}
      <main className="flex-1 w-full md:w-1/2 flex items-center justify-center bg-white p-8 sm:p-12 md:p-16 relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Top Header (Displays only on small screens) */}
          <div className="flex items-center justify-between md:hidden mb-6">
            <Link href="/" className="flex items-center group">
              <img
                src="/logo.png"
                alt="Canadian Nest School"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <span className="px-2.5 py-0.5 text-base font-bold text-[#615fff] bg-[#615fff]/10 rounded-lg border border-[#615fff]/20 uppercase">
              Forgot Password
            </span>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <p className="text-[#615fff] text-base font-bold uppercase tracking-wider">
              Reset Access
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">
              Recover Password
            </h2>
            <p className="text-zinc-550 font-semibold text-base leading-relaxed">
              {submitted 
                ? "Check your inbox for password reset instructions." 
                : "Provide your registered email address below, and we'll dispatch a secure recovery link."}
            </p>
          </div>

          {/* Main Action Forms */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Address Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-base font-bold text-zinc-700">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white border border-zinc-200 focus:border-[#615fff] focus:ring-4 focus:ring-[#615fff]/10 text-zinc-900 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-lg shadow-[#615fff]/15 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <FiArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-lg p-4 text-base font-semibold leading-relaxed text-left">
                📩 A password recovery link has been dispatched to <strong>{email}</strong>. Please check your inbox and spam folders to proceed!
              </div>
              
              <button
                onClick={() => setSubmitted(false)}
                className="text-base font-bold text-[#615fff] hover:text-[#5248e8] transition-colors cursor-pointer"
              >
                Didn&apos;t receive it? Request another link
              </button>
            </div>
          )}

          {/* Footer Back Links */}
          <div className="pt-6 border-t border-zinc-100 flex items-center justify-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 text-base font-bold transition-colors"
            >
              <FiArrowLeft className="h-4.5 w-4.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

        </div>
      </main>

    </div>
  )
}
