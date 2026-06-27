'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import Swal from 'sweetalert2'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please enter both your email and password.',
        confirmButtonColor: '#E61C24',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        pushToDataLayer({
          event: 'user_data_ready',
          event_id: generateEventId(),
          user_data: {
            user_id: data.user?.id || '',
            email: data.user?.email || '',
            phone_number: data.user?.phone || '',
            first_name: data.user?.name ? data.user.name.split(' ')[0] : '',
            last_name: data.user?.name && data.user.name.includes(' ') ? data.user.name.split(' ').slice(1).join(' ') : '',
            city: '',
            country: 'BD'
          }
        })

        Swal.fire({
          icon: 'success',
          title: 'Welcome Back!',
          text: 'You have signed in successfully.',
          timer: 1500,
          showConfirmButton: false,
        })
        
        // Redirect to dashboard or home based on role
        setTimeout(() => {
          const userRole = data.user?.role
          if (userRole === 'admin' || userRole === 'instructor' || userRole === 'staff') {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
          router.refresh()
        }, 1500)
      } else {
        throw new Error(data.message || 'Invalid credentials. Please try again.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Sign In Failed',
        text: err.message || 'Something went wrong.',
        confirmButtonColor: '#E61C24',
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
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#CC181F]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Logo */}
        <Link href="/" className="flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm z-10 self-start">
          <img
            src="/logo.png"
            alt="Canadian Nest School"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Middle: Brand Messages */}
        <div className="flex flex-col gap-6 z-10 my-auto">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-base font-bold text-[#E61C24] uppercase tracking-wider self-start">
            Student Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-tight text-white">
            Manage your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E61C24] to-[#FF4D55]">Learning Journey</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md font-medium leading-relaxed">
            Experience the next generation of online learning. Secure, intuitive, and designed specifically for modern students.
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
            <span className="text-base font-bold text-[#E61C24] uppercase tracking-wider mb-2">
              Welcome Back
            </span>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight font-display">
              Secure Login
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email / Phone input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-base font-bold text-zinc-700">
                Email Address or Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                  <FiMail className="h-5 w-5" />
                </span>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com or 01XXXXXXXXX"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-base font-bold text-zinc-700">
                Password
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
                  className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-medium text-zinc-800 placeholder-zinc-400 bg-white"
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

            {/* Remember Me & Forgot Password (Aligned Horizontally) */}
            <div className="flex items-center justify-between text-base font-semibold">
              <label className="flex items-center gap-2 text-zinc-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 rounded border-zinc-300 text-[#E61C24] focus:ring-[#E61C24] cursor-pointer"
                />
                Remember me
              </label>
              <Link 
                href="/forgot-password" 
                className="text-[#E61C24] hover:text-[#CC181F] transition-colors font-bold"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#E61C24]/95 text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <FiArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer info link */}
          <div className="mt-8 text-left text-base font-semibold text-zinc-500 pt-6">
            Don&apos;t have an account?{' '}
            <Link 
              href="/register" 
              className="text-[#E61C24] hover:text-[#CC181F] font-bold transition-colors"
            >
              Sign Up
            </Link>
          </div>

        </motion.div>
      </div>

    </div>
  )
}
