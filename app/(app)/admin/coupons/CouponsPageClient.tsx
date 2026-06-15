'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiEdit, FiTrash2, FiTag } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface CouponItem {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  expirationDate?: string
  isActive: boolean
  maxUses?: number | string
  usedCount: number
}

export default function CouponsPageClient({
  initialCoupons,
}: {
  initialCoupons: CouponItem[]
}) {
  const router = useRouter()
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons)

  const handleDelete = async (coupon: CouponItem) => {
    const result = await Swal.fire({
      title: 'Delete Coupon?',
      text: `Are you sure you want to permanently delete "${coupon.code}"? This will disable the promo code for all checkouts.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#27272a',
      background: '#121829',
      color: '#1a1a1a',
    })
    
    if (!result.isConfirmed) return

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
        Swal.fire({
          icon: 'success',
          title: 'Coupon Deleted',
          timer: 1200,
          showConfirmButton: false,
          background: '#121829',
          color: '#1a1a1a',
        })
      } else {
        throw new Error(data.error || 'Failed to delete coupon.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to delete coupon.',
        background: '#121829',
        color: '#1a1a1a',
      })
    }
  }

  const toggleStatus = async (coupon: CouponItem) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !coupon.isActive } : c))
        )
        
        Swal.fire({
          icon: 'success',
          title: !coupon.isActive ? 'Coupon Activated' : 'Coupon Paused',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          background: '#121829',
          color: '#1a1a1a',
        })
      }
    } catch (err) {
      console.error('Failed to toggle coupon status', err)
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">Coupons & Promo Codes</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Create, manage, and edit promotional discount campaigns for platform checkouts.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => router.push('/admin/coupons/new')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base shadow-lg shadow-[#615fff]/15 hover:scale-[1.01] transition-all cursor-pointer shrink-0"
        >
          <FiPlus className="h-5 w-5" /> 
          <span>Generate New Coupon</span>
        </button>
      </div>

      {/* ─── Coupons List Table ─── */}
      <div className="bg-[#121829] border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
        {coupons.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <FiTag className="h-12 w-12 text-zinc-700 mx-auto" />
            <h3 className="text-lg font-bold text-slate-600">No promotional coupons</h3>
            <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto">
              Create your first discount promo code to launch special campaigns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="bg-[#0b0e17] border-b border-slate-200/40 text-slate-500 font-bold text-sm uppercase tracking-wider select-none">
                  <th className="px-6 py-4">Promo Code</th>
                  <th className="px-6 py-4">Discount Value</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Usage Stats</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-[#152347]/10 transition-colors">
                    
                    {/* Code name */}
                    <td className="px-6 py-4 select-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#615fff]/15 border border-[#615fff]/20 flex items-center justify-center shrink-0">
                          <FiTag className="h-4.5 w-4.5 text-[#9693ff]" />
                        </div>
                        <span className="font-bold text-slate-800 text-base tracking-wide font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-100">
                          {coupon.code}
                        </span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-400 text-base">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% Off`
                          : `৳${coupon.discountValue.toLocaleString('en-BD')} Off`}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-500 text-base">
                        {coupon.expirationDate ? coupon.expirationDate : 'Never Expires'}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="px-6 py-4 text-base">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">
                          {coupon.usedCount} Used
                        </span>
                        {coupon.maxUses ? (
                          <span className="text-xs font-semibold text-slate-400 mt-0.5">
                            Max Limit: {coupon.maxUses}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Active State Toggle */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(coupon)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer select-none uppercase tracking-wide ${
                          coupon.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-100/60 border-slate-300/60 text-slate-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${coupon.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                        <span>{coupon.isActive ? 'Active' : 'Paused'}</span>
                      </button>
                    </td>

                    {/* Edit/Delete Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => router.push(`/admin/coupons/${coupon.id}/edit`)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-[#615fff] border border-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer hover:shadow-lg hover:shadow-[#615fff]/10"
                          title="Edit Coupon Settings"
                        >
                          <FiEdit className="h-4.5 w-4.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-rose-600 transition-all cursor-pointer hover:shadow-lg hover:shadow-rose-500/10"
                          title="Delete Coupon"
                        >
                          <FiTrash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
