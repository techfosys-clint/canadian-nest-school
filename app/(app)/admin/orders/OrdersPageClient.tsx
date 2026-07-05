'use client'

import React, { useState } from 'react'
import { FiPackage, FiMapPin, FiPhone, FiUser } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface OrderItem {
  title: string
  price: number
  quantity: number
}

interface OrderRow {
  id: string
  studentName: string
  studentEmail: string
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

export default function OrdersPageClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders)

  const updateStatus = async (order: OrderRow, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus as OrderRow['orderStatus'] } : o))
        )
      } else {
        throw new Error(data.error || 'Failed to update order status.')
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#ffffff', color: '#1a1a1a' })
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold font-display text-slate-800">Shop Orders</h1>
        <p className="text-base font-semibold text-slate-500 mt-1">
          View paid orders and update fulfillment status.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {orders.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <FiPackage className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-600">No paid orders yet</h3>
            <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto">
              Completed shop orders will appear here once customers pay for products.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div key={order.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{order.studentName}</p>
                    <p className="text-sm font-semibold text-slate-450">{order.studentEmail}</p>
                  </div>
                  <select
                    value={order.orderStatus}
                    onChange={(e) => updateStatus(order, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide border cursor-pointer ${STATUS_STYLES[order.orderStatus]}`}
                  >
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Items</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-base font-semibold text-slate-700">
                        <span>{item.title} &times; {item.quantity}</span>
                        <span>৳{(item.price * item.quantity).toLocaleString('en-BD')}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span className="text-[#E61C24]">৳{order.totalAmount.toLocaleString('en-BD')}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Shipping</p>
                    <p className="flex items-center gap-2 text-base font-semibold text-slate-700">
                      <FiUser className="h-4 w-4 text-[#E61C24]" /> {order.shippingName}
                    </p>
                    <p className="flex items-center gap-2 text-base font-semibold text-slate-700">
                      <FiPhone className="h-4 w-4 text-[#E61C24]" /> {order.shippingPhone}
                    </p>
                    <p className="flex items-start gap-2 text-base font-semibold text-slate-700">
                      <FiMapPin className="h-4 w-4 text-[#E61C24] mt-0.5 shrink-0" /> {order.shippingAddress}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
