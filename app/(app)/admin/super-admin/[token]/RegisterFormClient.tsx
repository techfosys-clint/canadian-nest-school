'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function RegisterFormClient() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          password,
          role: 'admin',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Setup failed. Please try again.')
      }

      // Auto-login with the freshly created credentials so the admin lands
      // straight on the dashboard instead of having to sign in manually.
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'admin' }),
      })

      await Swal.fire({
        icon: 'success',
        title: 'Initial Setup Complete',
        text: 'Root administrator account configured successfully!',
        background: '#ffffff',
        color: '#1a1a1a',
        confirmButtonColor: '#E61C24',
        customClass: {
          popup: 'rounded-lg',
          confirmButton: 'rounded-lg text-base font-bold px-6 py-2.5 bg-[#E61C24]',
        },
      })

      if (loginRes.ok) {
        window.location.href = '/admin'
      } else {
        router.push('/admin/login')
      }
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

      {/* Full Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Full Name *</label>
        <div className="relative">
          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            required
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-semibold outline-none transition-colors"
          />
        </div>
      </div>

      {/* Email Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Email Address *</label>
        <div className="relative">
          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="email"
            required
            placeholder="e.g. admin@tutorspace.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-semibold outline-none transition-colors"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Phone Number (Optional)</label>
        <div className="relative">
          <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="tel"
            placeholder="e.g. +88017XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-semibold outline-none transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Password *</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-11 py-3 text-base font-semibold outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
          >
            {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-base font-bold text-slate-600">Confirm Password *</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Retype password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/70 text-slate-800 rounded-lg pl-11 pr-11 py-3 text-base font-semibold outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
          >
            {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Register Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors duration-200 cursor-pointer disabled:opacity-50"
      >
        <FiCheckCircle className="h-5 w-5" />
        {loading ? 'Configuring Console...' : 'Initialize System'}
      </button>
    </form>
  )
}
