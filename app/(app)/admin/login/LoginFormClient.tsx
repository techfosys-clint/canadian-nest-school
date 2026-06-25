'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function LoginFormClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please provide both email and password.')
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

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.')
      }

      // Check if logged-in user is authorized for administrative actions
      const allowedRoles = ['admin', 'staff', 'instructor']
      if (!data.user || !allowedRoles.includes(data.user.role)) {
        throw new Error('Access denied. This portal is reserved for administrative accounts.')
      }

      await Swal.fire({
        icon: 'success',
        title: 'Welcome Back',
        text: `Administrative session started for ${data.user.name}.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      // Force a hard refresh to load layout session properly
      window.location.href = '/admin'
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-base font-sans">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-base">
          {error}
        </div>
      )}

      {/* Email Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Email Address</label>
        <div className="relative">
          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="email"
            required
            placeholder="admin@tutorspace.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-semibold outline-none transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Password</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-11 py-3 text-base font-semibold outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
          >
            {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="flex items-center justify-between text-base font-semibold">
        <span /> {/* Spacer */}
        <Link
          href="/forgot-password"
          className="text-[#E61C24] hover:underline transition-colors cursor-pointer"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Login Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors duration-200 cursor-pointer disabled:opacity-50"
      >
        <FiLogIn className="h-5 w-5" />
        {loading ? 'Authenticating...' : 'Sign In to Console'}
      </button>
    </form>
  )
}
