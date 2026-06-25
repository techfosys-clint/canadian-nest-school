'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FiZap,
  FiMail,
  FiLock,
  FiUser,
  FiPhone,
  FiMapPin,
  FiTag,
  FiCheckCircle,
  FiCheck,
  FiAlertCircle,
  FiChevronLeft,
  FiArrowRight,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CourseData {
  id: string
  title: string
  summary: string
  price: number
  imageUrl: string
  instructorName: string
  categoryName: string
}

interface UserSession {
  id: string
  name: string
  email: string
  phone?: string
  role: string
}

export default function CheckoutFormClient({ course }: { course: CourseData }) {
  const router = useRouter()
  
  // Auth states
  const [user, setUser] = useState<UserSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)

  // Login form states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Register form states
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPhone, setRegPhone] = useState('')

  // Checkout states
  const [billingName, setBillingName] = useState('')
  const [billingPhone, setBillingPhone] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  // Pop-up free inline alert states
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null)

  // Check login session on mount
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (res.ok && data.authenticated) {
          setUser(data.user)
          setBillingName(data.user.name || '')
          setBillingPhone(data.user.phone || '')
        }
      } catch (err) {
        console.error('Session verify failed:', err)
      } finally {
        setLoadingSession(false)
      }
    }
    getSession()
  }, [])

  // Handle Login submission
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
        setBillingName(data.user.name || '')
        setBillingPhone(data.user.phone || '')
        setAuthSuccess(`Welcome back, ${data.user.name}! Continuing to billing...`)
      } else {
        throw new Error(data.message || 'Invalid email or password.')
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Registration submission + silent login
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    if (!regName || !regEmail || !regPassword) {
      setAuthError('Please fill in all required fields.')
      return
    }
    if (regPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.')
      return
    }

    setAuthLoading(true)
    try {
      // 1. Create account
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone || undefined,
          role: 'student',
        }),
      })
      const regData = await regRes.json()

      if (!regRes.ok || !regData.success) {
        throw new Error(regData.error || 'Registration failed. Email might already exist.')
      }

      // 2. Perform silent login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      })
      const loginData = await loginRes.json()

      if (loginRes.ok && loginData.success) {
        setUser(loginData.user)
        setBillingName(loginData.user.name || '')
        setBillingPhone(loginData.user.phone || '')
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

  // Handle Coupon code verification
  const handleApplyCoupon = async () => {
    setCouponError('')
    setCouponSuccess('')
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.')
      return
    }

    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setAppliedCoupon(data.coupon)
        setCouponSuccess(`Coupon "${data.coupon.code}" applied successfully!`)
      } else {
        throw new Error(data.error || 'Invalid coupon.')
      }
    } catch (err: any) {
      setCouponError(err.message)
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  // Recalculate prices
  const basePrice = course.price
  let discountAmount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (basePrice * appliedCoupon.discountValue) / 100
    } else {
      discountAmount = appliedCoupon.discountValue
    }
  }
  const finalPrice = Math.max(0, basePrice - discountAmount)

  // Complete course purchase / checkout
  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutError(null)
    setCheckoutSuccess(null)
    if (!billingName.trim() || !billingPhone.trim() || !billingAddress.trim()) {
      setCheckoutError('Please fill in your name, phone number, and billing address.')
      return
    }

    setPurchaseLoading(true)
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          billingName,
          billingPhone,
          billingAddress,
        }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setCheckoutSuccess(`You have successfully purchased and enrolled in "${course.title}".`)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to complete transaction.')
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'There was an issue processing your checkout.')
    } finally {
      setPurchaseLoading(false)
    }
  }

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
      {/* Back button */}
      <Link
        href={`/courses/${course.id}`}
        className="inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group"
      >
        <FiChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
        <span>Return to Course Page</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* LEFT COLUMN: AUTH WORKSPACE OR CHECKOUT BILLING */}
        <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
          
          {!user ? (
            /* USER IS ANONYMOUS: SIGN IN OR SIGN UP WORKSPACE */
            <div className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6">
              
              {/* Tab Header */}
              <div className="flex border-b border-zinc-200">
                <button
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'login'
                      ? 'border-[#E61C24] text-[#E61C24]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'register'
                      ? 'border-[#E61C24] text-[#E61C24]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authTab === 'login' ? (
                /* INLINE LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-800">Sign in to complete purchase</h3>
                    <p className="text-sm font-semibold text-zinc-450 mt-1">
                      Access your student credentials to log your enrollment.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse">
                      {authSuccess}
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Email Address or Mobile Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiMail className="h-5 w-5" />
                        </span>
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
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiLock className="h-5 w-5" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
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

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer mt-4"
                    >
                      {authLoading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Sign In & Continue</span>
                          <FiArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* INLINE REGISTER FORM */
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-800">Register new student account</h3>
                    <p className="text-sm font-semibold text-zinc-450 mt-1">
                      Set up your credentials to manage courses and trace progress.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-655 font-semibold text-base">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse">
                      {authSuccess}
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiUser className="h-5 w-5" />
                        </span>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiMail className="h-5 w-5" />
                        </span>
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
                      <label className="text-base font-bold text-zinc-700">Password (Min 6 chars)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiLock className="h-5 w-5" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
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

                    <div className="space-y-1.5">
                      <label className="text-base font-bold text-zinc-700">Phone Number (Optional)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                          <FiPhone className="h-5 w-5" />
                        </span>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer mt-4"
                    >
                      {authLoading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Create Account & Sign In</span>
                          <FiArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* USER IS AUTHENTICATED: SHOW BILLING FORM & COUPONS */
            <div className="space-y-6">
              
              {/* Billing Info Form */}
              <div className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
                    <FiMapPin className="text-[#E61C24]" />
                    Billing Information
                  </h3>
                  <p className="text-sm font-semibold text-zinc-450 mt-1">
                    Provide billing address credentials to verify this transaction.
                  </p>
                </div>

                <form onSubmit={handleCompletePurchase} className="space-y-4">
                  {checkoutError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-105 rounded-lg text-rose-650 font-semibold text-base">
                      {checkoutError}
                    </div>
                  )}

                  {checkoutSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-800 text-center flex flex-col items-center gap-2">
                      <FiCheckCircle className="h-7 w-7 text-emerald-500 animate-bounce" />
                      <span className="font-bold text-lg leading-tight">Purchase Confirmed!</span>
                      <span className="text-sm font-semibold text-emerald-700 leading-relaxed">{checkoutSuccess}</span>
                      <span className="text-zinc-500 text-xs font-semibold mt-1 animate-pulse">Redirecting you to active learning space...</span>
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-base font-bold text-zinc-700">Full Billing Name</label>
                    <input
                      type="text"
                      required
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-base font-bold text-zinc-700">Email Address (Account Reference)</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 font-semibold text-base outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-base font-bold text-zinc-700">Contact Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800"
                    />
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-1.5">
                    <label className="text-base font-bold text-zinc-700">Billing Address</label>
                    <textarea
                      required
                      rows={3}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Street address, City, State, ZIP code, Country"
                      className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={purchaseLoading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer mt-6"
                  >
                    {purchaseLoading ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiZap className="h-5 w-5 fill-white" />
                        <span>Complete Course Purchase (৳{finalPrice.toLocaleString('en-BD')})</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY COURSE SUMMARY CARD & COUPON APPLICATION */}
        <div className="lg:col-span-5 relative z-10 w-full order-1 lg:order-2 space-y-6 lg:sticky lg:top-32">
          
          {/* Sticky Course details widget */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            
            {/* Banner image */}
            {course.imageUrl && (
              <div className="aspect-[16/10] overflow-hidden bg-zinc-50 border-b border-zinc-100 relative">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 space-y-6">
              
              {/* Category, Title, Instructor */}
              <div className="space-y-2">
                {course.categoryName && (
                  <span className="inline-block px-3 py-1 bg-[#E61C24]/10 rounded-lg font-bold text-xs text-[#E61C24] uppercase tracking-wide">
                    {course.categoryName}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 tracking-tight leading-snug">
                  {course.title}
                </h2>
                <p className="text-base font-semibold text-zinc-500">
                  Instructed by <span className="font-bold text-zinc-800">{course.instructorName}</span>
                </p>
              </div>

              {/* Price list breakdown */}
              <div className="border-t border-zinc-100 pt-5 space-y-3.5">
                <p className="text-base font-bold text-zinc-800">Order Investment Summary</p>
                
                <div className="flex justify-between items-center text-base font-semibold text-zinc-600">
                  <span>Base Course Price</span>
                  <span className="font-bold text-zinc-800">৳{basePrice.toLocaleString('en-BD')}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-base font-semibold text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <FiTag className="h-4 w-4" />
                      Promo code ({appliedCoupon.code})
                    </span>
                    <span className="font-bold">-৳{discountAmount.toLocaleString('en-BD')}</span>
                  </div>
                )}

                <div className="border-t border-zinc-100 pt-3.5 flex justify-between items-center">
                  <span className="text-base font-bold text-zinc-800">Total Investment</span>
                  <span className="text-3xl font-bold text-[#E61C24]">
                    ৳{finalPrice.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code section (Shown only if logged in) */}
          {user && (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
              <label className="text-base font-bold text-zinc-800 flex items-center gap-2">
                <FiTag className="text-[#E61C24]" />
                Apply Coupon / Promo Code
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SAVE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 focus:border-[#E61C24] outline-none text-base transition-all font-mono font-bold text-zinc-800"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="px-5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  {couponLoading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>

              {couponError && (
                <div className="flex items-center gap-1.5 text-rose-500 text-sm font-semibold">
                  <FiAlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                  <FiCheck className="h-4.5 w-4.5 shrink-0" />
                  <span>{couponSuccess}</span>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
