'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPackage, FiMapPin, FiCheckCircle } from 'react-icons/fi'
import { formatBdDate } from '@/lib/bdTime'

interface UserSession {
  id: string
  name: string
  email: string
  role: string
}

interface OrderItem {
  title: string
  price: number
  quantity: number
}

interface OrderRow {
  id: string
  items: OrderItem[]
  totalAmount: number
  orderStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  processing: 'bg-amber-50 border-amber-200 text-amber-600',
  shipped: 'bg-blue-50 border-blue-200 text-blue-600',
  delivered: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  cancelled: 'bg-rose-50 border-rose-200 text-rose-600',
}

export default function MyOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderRow[]>([])

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/me')
        const sessionData = await sessionRes.json()
        if (!sessionRes.ok || !sessionData.authenticated) {
          router.push('/login')
          return
        }
        setUser(sessionData.user)

        const ordersRes = await fetch('/api/orders', { cache: 'no-store' })
        if (ordersRes.ok) {
          const data = await ordersRes.json()
          if (data.orders) setOrders(data.orders)
        }
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-650">Loading Your Orders...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-6 py-8 pb-16 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-zinc-800 flex items-center gap-2">
          <FiPackage className="text-[#E61C24]" /> My Orders
        </h1>
        <p className="text-base font-semibold text-zinc-450 mt-1">
          Track your book and merchandise orders from the Canadian Nest Shop.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-lg p-16 text-center">
          <FiPackage className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-base font-semibold text-zinc-450">You haven&apos;t placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-zinc-200/80 rounded-lg p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-450">
                  <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                  Placed on {formatBdDate(order.createdAt)}
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide border w-fit ${STATUS_STYLES[order.orderStatus]}`}>
                  {order.orderStatus}
                </span>
              </div>

              <div className="space-y-2 border-t border-zinc-100 pt-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-base font-semibold text-zinc-700">
                    <span>{item.title} &times; {item.quantity}</span>
                    <span>৳{(item.price * item.quantity).toLocaleString('en-BD')}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-base font-bold text-zinc-800 pt-2 border-t border-zinc-100">
                  <span>Total Paid</span>
                  <span className="text-[#E61C24]">৳{order.totalAmount.toLocaleString('en-BD')}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm font-semibold text-zinc-450 border-t border-zinc-100 pt-3">
                <FiMapPin className="h-4 w-4 text-[#E61C24] mt-0.5 shrink-0" />
                <span>{order.shippingAddress}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
