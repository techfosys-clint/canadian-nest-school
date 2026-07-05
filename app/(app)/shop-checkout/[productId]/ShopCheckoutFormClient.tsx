'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safeJson'
import {
  FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiCheckCircle,
  FiAlertCircle, FiChevronLeft, FiArrowRight, FiEye, FiEyeOff,
  FiMinus, FiPlus, FiShoppingBag, FiBookOpen,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface ProductData {
  id: string
  title: string
  slug: string
  price: number
  thumbnail: string
  inStock: boolean
  maxQty: number
}

interface UserSession {
  id: string
  name: string
  email: string
  phone?: string
  role: string
}

export default function ShopCheckoutFormClient({
  product,
  initialQuantity,
}: {
  product: ProductData
  initialQuantity: number
}) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register')
  const [showPassword, setShowPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regOtp, setRegOtp] = useState('')
  const [regOtpSent, setRegOtpSent] = useState(false)
  const [regOtpVerified, setRegOtpVerified] = useState(false)
  const [sendingRegOtp, setSendingRegOtp] = useState(false)
  const [verifyingRegOtp, setVerifyingRegOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const [quantity, setQuantity] = useState(Math.min(initialQuantity, product.maxQty))
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (res.ok && data.authenticated) {
          setUser(data.user)
          setShippingName(data.user.name || '')
          setShippingPhone(data.user.phone || '')
        }
      } catch (err) {
        console.error('Session verify failed:', err)
      } finally {
        setLoadingSession(false)
      }
    }
    getSession()
  }, [])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in both email and password.')
      return
    }
    setAuthLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUser(data.user)
        setShippingName(data.user.name || '')
        setShippingPhone(data.user.phone || '')
        setAuthSuccess(`Welcome back, ${data.user.name}! Continuing to shipping details...`)
      } else {
        throw new Error(data.message || 'Invalid email or password.')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSendRegOtp = async () => {
    if (!regPhone) {
      setAuthError('Please enter your mobile number first.')
      return
    }
    setAuthError(null)
    setSendingRegOtp(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone }),
      })
      const data = await res.json()
      if (res.ok) {
        setRegOtpSent(true)
        setCountdown(60)
        setAuthSuccess('OTP sent! Please check your phone for the verification code.')
      } else {
        throw new Error(data.error || 'Failed to send OTP.')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send OTP.')
    } finally {
      setSendingRegOtp(false)
    }
  }

  const handleVerifyRegOtp = async () => {
    if (!regOtp) {
      setAuthError('Please enter the verification code sent to your phone.')
      return
    }
    setAuthError(null)
    setVerifyingRegOtp(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, otp: regOtp }),
      })
      const data = await res.json()
      if (res.ok) {
        setRegOtpVerified(true)
        setAuthSuccess('Phone number verified successfully!')
      } else {
        throw new Error(data.error || 'Incorrect OTP.')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed.')
    } finally {
      setVerifyingRegOtp(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    if (!regName || !regPhone || !regEmail || !regPassword) {
      setAuthError('Please fill in your name, mobile number, email, and password.')
      return
    }
    if (!regOtpVerified) {
      setAuthError('Please verify your mobile number with the OTP code first.')
      return
    }
    if (regPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.')
      return
    }

    setAuthLoading(true)
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, phone: regPhone, role: 'student' }),
      })
      const regData = await regRes.json()
      if (!regRes.ok || !regData.success) {
        throw new Error(regData.error || 'Registration failed. Phone number might already be registered.')
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regPhone, password: regPassword }),
      })
      const loginData = await loginRes.json()

      if (loginRes.ok && loginData.success) {
        setUser(loginData.user)
        setShippingName(loginData.user.name || '')
        setShippingPhone(loginData.user.phone || '')
        setAuthSuccess(`Account created successfully! Welcome, ${loginData.user.name}.`)
      } else {
        throw new Error('Registration succeeded, but login failed. Please sign in manually.')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrderError(null)
    if (!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim()) {
      setOrderError('Please fill in your name, phone number, and shipping address.')
      return
    }

    setPlacingOrder(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          shippingName,
          shippingPhone,
          shippingAddress,
        }),
      })
      const data = await parseJsonResponse(response)

      if (response.ok && data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      throw new Error(data.error || 'Failed to place order.')
    } catch (err: any) {
      setOrderError(err.message || 'There was an issue processing your order.')
    } finally {
      setPlacingOrder(false)
    }
  }

  const totalPrice = product.price * quantity

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-600">Loading Checkout Workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 pt-28 pb-16">
      <Link
        href={`/shop/${product.slug}`}
        className="inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group"
      >
        <FiChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
        <span>Return to Product Page</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT: AUTH OR SHIPPING */}
        <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
          {!user ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6">
              <div className="flex border-b border-zinc-200">
                <button
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'login' ? 'border-[#E61C24] text-[#E61C24]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'register' ? 'border-[#E61C24] text-[#E61C24]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authTab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-800">Sign in to complete your order</h3>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base">{authError}</div>
                  )}
                  {authSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse">{authSuccess}</div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Email Address or Mobile Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiMail className="h-5 w-5" /></span>
                        <input
                          type="text"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com or 01XXXXXXXXX"
                          className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiLock className="h-5 w-5" /></span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors">
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-300 cursor-pointer disabled:opacity-70"
                    >
                      {authLoading ? 'Signing In...' : 'Sign In'} <FiArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-800">Create your account &amp; order</h3>
                    <p className="text-sm font-semibold text-zinc-450 mt-1">Register and place your order in one step.</p>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base">{authError}</div>
                  )}
                  {authSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse">{authSuccess}</div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiUser className="h-5 w-5" /></span>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiPhone className="h-5 w-5" /></span>
                          <input
                            type="text"
                            required
                            disabled={regOtpVerified}
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white disabled:opacity-60"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendRegOtp}
                          disabled={sendingRegOtp || regOtpVerified || countdown > 0}
                          className="px-4 py-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
                        >
                          {regOtpVerified ? 'Verified' : countdown > 0 ? `Resend (${countdown}s)` : sendingRegOtp ? 'Sending...' : 'Send OTP'}
                        </button>
                      </div>
                    </div>

                    {regOtpSent && !regOtpVerified && (
                      <div className="space-y-1.5">
                        <label className="text-base font-bold text-zinc-700">Verification Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={regOtp}
                            onChange={(e) => setRegOtp(e.target.value)}
                            placeholder="Enter OTP"
                            className="flex-1 px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyRegOtp}
                            disabled={verifyingRegOtp}
                            className="px-4 py-3 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
                          >
                            {verifyingRegOtp ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiMail className="h-5 w-5" /></span>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiLock className="h-5 w-5" /></span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors">
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-300 cursor-pointer disabled:opacity-70"
                    >
                      {authLoading ? 'Creating Account...' : 'Create Account & Continue'} <FiArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-zinc-800">Shipping Details</h3>
                <p className="text-sm font-semibold text-zinc-450 mt-1">Where should we deliver your order?</p>
              </div>

              {orderError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base flex items-center gap-2">
                  <FiAlertCircle className="h-5 w-5 shrink-0" /> {orderError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiUser className="h-5 w-5" /></span>
                  <input
                    type="text"
                    required
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">Mobile Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400"><FiPhone className="h-5 w-5" /></span>
                  <input
                    type="text"
                    required
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-base font-bold text-zinc-700">Full Delivery Address</label>
                <div className="relative">
                  <span className="absolute top-3 left-0 pl-3.5 flex items-center text-zinc-400"><FiMapPin className="h-5 w-5" /></span>
                  <textarea
                    required
                    rows={3}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="House, road, area, city, postal code"
                    className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 bg-white resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={placingOrder || !product.inStock}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-300 cursor-pointer disabled:opacity-70"
              >
                {placingOrder ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiShoppingBag className="h-5 w-5" />
                    Pay ৳{totalPrice.toLocaleString('en-BD')} &amp; Place Order
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5 sticky top-24">
            <h3 className="text-xl font-bold text-zinc-800 border-b border-zinc-100 pb-4">Order Summary</h3>

            <div className="flex items-center gap-4">
              <div className="h-20 w-16 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0 flex items-center justify-center">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <FiBookOpen className="h-6 w-6 text-zinc-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-800 line-clamp-2">{product.title}</p>
                <p className="text-sm font-semibold text-zinc-450 mt-1">৳{product.price.toLocaleString('en-BD')} each</p>
              </div>
            </div>

            {!user && (
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-zinc-700">Quantity</span>
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <FiMinus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-zinc-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.maxQty, q + 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {user && (
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-zinc-700">Quantity</span>
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <FiMinus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-zinc-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.maxQty, q + 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-zinc-800">Total</span>
              <span className="text-2xl font-bold text-[#E61C24]">৳{totalPrice.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Secure payment powered by EPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
