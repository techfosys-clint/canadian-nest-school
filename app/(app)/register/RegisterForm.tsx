'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiPhone, FiBookOpen, FiCheck } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function RegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [academicLevel, setAcademicLevel] = useState('College/University')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const handleSendOtp = async () => {
    if (!phone) {
      Swal.fire({
        icon: 'error',
        title: 'Phone Number Required',
        text: 'Please enter your phone number first.',
        confirmButtonColor: '#615fff',
      })
      return
    }

    setSendingOtp(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (res.ok) {
        setOtpSent(true)
        Swal.fire({
          icon: 'success',
          title: 'OTP Sent',
          text: 'Please check your phone for the verification code.',
          confirmButtonColor: '#615fff',
        })
      } else {
        throw new Error(data.error || 'Failed to send OTP.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send OTP',
        text: err.message || 'Something went wrong.',
        confirmButtonColor: '#615fff',
      })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) {
      Swal.fire({
        icon: 'error',
        title: 'OTP Required',
        text: 'Please enter the verification code sent to your phone.',
        confirmButtonColor: '#615fff',
      })
      return
    }

    setVerifyingOtp(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()

      if (res.ok) {
        setOtpVerified(true)
        Swal.fire({
          icon: 'success',
          title: 'Phone Verified!',
          text: 'Your phone number has been verified successfully.',
          confirmButtonColor: '#615fff',
        })
      } else {
        throw new Error(data.error || 'Incorrect OTP.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Verification Failed',
        text: err.message || 'Something went wrong.',
        confirmButtonColor: '#615fff',
      })
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleNextStep = async () => {
    if (step === 1) {
      if (!name || !phone || !password) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Fields',
          text: 'Please fill in all account fields.',
          confirmButtonColor: '#615fff',
        })
        return
      }
      if (password.length < 6) {
        Swal.fire({
          icon: 'error',
          title: 'Weak Password',
          text: 'Password must be at least 6 characters long.',
          confirmButtonColor: '#615fff',
        })
        return
      }

      // Phone not yet verified — auto-send the OTP and reveal the verification box
      if (!otpVerified) {
        if (!otpSent) {
          await handleSendOtp()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Phone Not Verified',
            text: 'Please enter the verification code sent to your phone.',
            confirmButtonColor: '#615fff',
          })
        }
        return
      }
    }
    setStep(prev => prev + 1)
  }

  const handlePrevStep = () => {
    setStep(prev => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termsAccepted) {
      Swal.fire({
        icon: 'warning',
        title: 'Terms & Conditions',
        text: 'Please accept the Terms and Conditions to complete your registration.',
        confirmButtonColor: '#615fff',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          password,
          phone,
          role: 'student'
        }),
      })

      const data = await res.json()

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Account Created!',
          text: 'Welcome to Canadian Nest School! Redirecting to login...',
          timer: 2000,
          showConfirmButton: false,
        })
        
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        throw new Error(data.error || 'Registration failed. Email might already exist.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Sign Up Failed',
        text: err.message || 'Something went wrong.',
        confirmButtonColor: '#615fff',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* Left Side: Premium Navy Branding Column (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[#0A163A] text-white flex-col justify-between p-16 relative overflow-hidden select-none">
        {/* Soft glowing purple blur gradient blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#615fff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#543cdf]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Logo */}
        <Link href="/" className="flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm z-10 self-start">
          <img
            src="/logo.png"
            alt="Canadian Nest School"
            className="h-13 w-auto object-contain"
          />
        </Link>

        {/* Middle: Brand Messages */}
        <div className="flex flex-col gap-6 z-10 my-auto">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-base font-bold text-[#615fff] uppercase tracking-wider self-start">
            Student Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-tight text-white">
            Unlock your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#615fff] to-[#807eff]">Learning Potential</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md font-medium leading-relaxed">
            Access world-class interactive courses, learn from top global instructors, and track your progress all in one single, powerful space.
          </p>
        </div>

        {/* Bottom: Copyright Footer */}
        <div className="text-zinc-500 text-base font-semibold z-10">
          &copy; 2026 Canadian Nest School. All rights reserved.
        </div>
      </div>

      {/* Right Side: Form Workspace Column */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md bg-transparent p-0 relative z-10"
        >
          {/* Logo visible only on mobile */}
          <div className="flex justify-start lg:hidden mb-8">
            <Link href="/" className="flex items-center group">
              <img
                src="/logo.png"
                alt="Canadian Nest School"
                className="h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Form Header */}
          <div className="flex flex-col items-start mb-8">
            <span className="text-base font-bold text-[#615fff] uppercase tracking-wider mb-2">
              Get Started
            </span>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight font-display">
              Student Registration
            </h2>
          </div>

          {/* Multi-step progress indicator */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center justify-center relative">
                  <div 
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-base border-2 transition-all duration-300 ${
                      step >= s 
                        ? 'bg-[#615fff] border-[#615fff] text-white' 
                        : 'border-zinc-200 text-zinc-400 bg-white'
                    }`}
                  >
                    {step > s ? <FiCheck className="h-5 w-5" /> : s}
                  </div>
                  <span className="absolute -bottom-6 text-xs font-bold text-zinc-400 whitespace-nowrap hidden sm:block">
                    {s === 1 ? 'Account' : s === 2 ? 'Profile' : 'Confirm'}
                  </span>
                </div>
                {s < 3 && (
                  <div className="flex-1 h-0.5 mx-3 bg-zinc-200 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-[#615fff] transition-all duration-500"
                      style={{ width: step > s ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Multi-step Forms inside AnimatePresence */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: Account Setup */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-base font-bold text-zinc-700">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                        <FiUser className="h-5 w-5" />
                      </span>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
                      />
                    </div>
                  </div>

                  {/* Phone Number (Primary identifier, OTP-verified) */}
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-base font-bold text-zinc-700">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                        <FiPhone className="h-5 w-5" />
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        disabled={otpVerified}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-500"
                      />
                      {otpVerified && (
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-green-600">
                          <FiCheck className="h-5 w-5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OTP Verification — auto-revealed after clicking Continue */}
                  {otpSent && !otpVerified && (
                    <div className="space-y-1.5">
                      <label htmlFor="otp" className="text-base font-bold text-zinc-700">
                        Verification Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="6-digit code"
                          className="flex-1 px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp}
                          className="px-4 rounded-lg bg-[#615fff] hover:bg-[#615fff]/95 text-white font-bold text-base whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {verifyingOtp ? '...' : 'Verify'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="text-sm font-bold text-[#615fff] hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {sendingOtp ? 'Resending...' : "Didn't get the code? Resend"}
                      </button>
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-base font-bold text-zinc-700">
                      Password (Min. 6 chars)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                        <FiLock className="h-5 w-5" />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-lg bg-[#615fff] hover:bg-[#615fff]/95 text-white font-bold text-base shadow-lg shadow-[#615fff]/15 hover:shadow-[#615fff]/25 transition-all duration-300 cursor-pointer"
                  >
                    Continue
                    <FiArrowRight className="h-5 w-5" />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Profile Info */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Email Address (Optional) */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-base font-bold text-zinc-700">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                        <FiMail className="h-5 w-5" />
                      </span>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
                      />
                    </div>
                  </div>

                  {/* Academic Level */}
                  <div className="space-y-1.5">
                    <label htmlFor="academic" className="text-base font-bold text-zinc-700">
                      Academic Level
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
                        <FiBookOpen className="h-5 w-5" />
                      </span>
                      <select
                        id="academic"
                        value={academicLevel}
                        onChange={(e) => setAcademicLevel(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#615fff] focus:ring-3 focus:ring-[#615fff]/10 outline-none text-base transition-all font-semibold text-zinc-700 bg-white cursor-pointer appearance-none"
                      >
                        <option value="High School">High School</option>
                        <option value="College/University">College / University</option>
                        <option value="Graduate School">Graduate School</option>
                        <option value="Professional">Professional / Working</option>
                        <option value="Hobbyist">Hobbyist / Lifelong Learner</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex-1 py-3.5 rounded-lg border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-bold text-base hover:bg-zinc-50 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#615fff] hover:bg-[#615fff]/95 text-white font-bold text-base shadow-lg shadow-[#615fff]/15 hover:shadow-[#615fff]/25 transition-all cursor-pointer"
                    >
                      Continue
                      <FiArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Final Acceptance */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Terms Acceptance */}
                    <div className="flex items-start gap-3 pt-2">
                      <input
                        id="terms"
                        type="checkbox"
                        required
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-zinc-300 text-[#615fff] focus:ring-[#615fff] cursor-pointer"
                      />
                      <label htmlFor="terms" className="text-base font-semibold text-zinc-500 cursor-pointer select-none">
                        I agree to the <span className="text-[#615fff] hover:underline font-bold">Terms of Service</span> and <span className="text-[#615fff] hover:underline font-bold">Privacy Policy</span>.
                      </label>
                    </div>

                    {/* Navigation & Submit Buttons */}
                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="flex-1 py-3.5 rounded-lg border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-bold text-base hover:bg-zinc-50 transition-all cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#615fff] hover:bg-[#615fff]/95 text-white font-bold text-base shadow-lg shadow-[#615fff]/15 hover:shadow-[#615fff]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {loading ? (
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Register'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </form>
              )}

            </AnimatePresence>
          </div>

          {/* Footer info link */}
          <div className="mt-8 text-left text-base font-semibold text-zinc-500 pt-6">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-[#615fff] hover:text-[#543cdf] font-bold transition-colors"
            >
              Sign In
            </Link>
          </div>

        </motion.div>
      </div>

    </div>
  )
}
