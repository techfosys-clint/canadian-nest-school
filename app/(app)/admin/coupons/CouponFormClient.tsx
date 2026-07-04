'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiSave, FiCheck, FiTag, FiAlertCircle } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CouponFormClientProps {
  initialCoupon?: {
    id: string
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    expirationDate?: string
    maxUses?: number | string
    isActive: boolean
    course?: string
  }
  courses?: { id: string; title: string }[]
}

export default function CouponFormClient({ initialCoupon, courses = [] }: CouponFormClientProps) {
  const router = useRouter()
  
  const [code, setCode] = useState(initialCoupon?.code || '')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialCoupon?.discountType || 'fixed'
  )
  const [discountValue, setDiscountValue] = useState<number | ''>(
    initialCoupon?.discountValue !== undefined ? initialCoupon.discountValue : ''
  )
  const [expirationDate, setExpirationDate] = useState(initialCoupon?.expirationDate || '')
  const [maxUses, setMaxUses] = useState<number | string>(initialCoupon?.maxUses || '')
  const [isActive, setIsActive] = useState(initialCoupon?.isActive !== undefined ? initialCoupon.isActive : true)
  const [courseId, setCourseId] = useState(initialCoupon?.course || '')
  
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'TUTOR', 'SPACE', 'PROMO', 'LEARN', 'OFF']
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let randomSuffix = ''
    for (let i = 0; i < 4; i++) {
      randomSuffix += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setCode(`${randomPrefix}-${randomSuffix}`)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!code.trim()) {
      setErrorMsg('Promo coupon code is required.')
      return
    }
    if (discountValue === '' || discountValue < 0) {
      setErrorMsg('A valid discount value is required.')
      return
    }

    setSaving(true)
    const payload = {
      id: initialCoupon?.id,
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      expirationDate: expirationDate || undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      isActive,
      course: courseId || null,
    }

    try {
      const method = initialCoupon?.id ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/coupons', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        await Swal.fire({
          icon: 'success',
          title: initialCoupon?.id ? 'Coupon Updated' : 'Coupon Generated',
          text: `Coupon code "${payload.code}" was successfully saved.`,
          timer: 1500,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#1a1a1a',
        })
        router.push('/admin/coupons')
        router.refresh()
      } else {
        setErrorMsg(data.error || 'Failed to save promotional coupon.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the coupon.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/admin/coupons')}
              className="h-10 w-10 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
              <FiTag className="text-[#E61C24]" />
              <span>{initialCoupon ? 'Edit Coupon Code' : 'Generate Coupon Code'}</span>
            </h1>
          </div>
          <p className="text-base font-semibold text-slate-500 pl-13">
            Create promotional campaigns and custom discount codes for checkout.
          </p>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm">
        
        <form onSubmit={handleSave} className="space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-base font-semibold">
              <FiAlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Promo Code Name */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-bold text-slate-600">Promo Code (Uppercase, unique)</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                placeholder="e.g. DISCOUNT50, SPRINGFEST"
                value={code}
                disabled={!!initialCoupon}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-bold text-base font-mono focus:outline-none disabled:opacity-50 transition-colors"
                required
              />
              {!initialCoupon && (
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-5 py-3 rounded-lg border border-slate-200 hover:border-[#E61C24]/50 hover:text-slate-800 bg-white text-[#E61C24] font-bold text-base transition-all active:scale-[0.98] shrink-0"
                >
                  Auto-Generate
                </button>
              )}
            </div>
          </div>

          {/* Discount Parameters Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Discount Type</label>
              <select
                value={discountType}
                onChange={(e: any) => setDiscountType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none transition-colors"
              >
                <option value="fixed">Fixed cash deduction (৳)</option>
                <option value="percentage">Percentage discount (%)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">
                {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount BDT Value (৳)'}
              </label>
              <input
                type="number"
                placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 15.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                min="0"
                step="any"
                className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Limits Parameters Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Maximum Allowed Uses</label>
              <input
                type="number"
                placeholder="Unlimited uses"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                min="1"
                className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Expiration Date</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Course Restriction */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-bold text-slate-600">Restrict to Course (optional)</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none transition-colors"
            >
              <option value="">All courses (no restriction)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <p className="text-base text-slate-500">
              Select a course to make this coupon work only on that course&apos;s checkout.
            </p>
          </div>

          {/* Status Checkbox toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5 accent-[#E61C24] rounded cursor-pointer"
            />
            <label htmlFor="isActiveToggle" className="text-base font-bold text-slate-600 cursor-pointer">
              Activate promo coupon code immediately
            </label>
          </div>

          {/* Actions Button Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/40 mt-6">
            <button
              type="button"
              onClick={() => router.push('/admin/coupons')}
              className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base transition-colors cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <FiCheck className="h-5 w-5" />
              <span>{saving ? 'Saving...' : initialCoupon ? 'Apply Changes' : 'Generate Coupon'}</span>
            </button>
          </div>
        </form>

      </div>

    </div>
  )
}
