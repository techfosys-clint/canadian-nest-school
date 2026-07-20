'use client'

import React, { useState } from 'react'
import { FiPackage, FiMapPin, FiPhone, FiUser, FiPrinter, FiCheckSquare, FiSquare, FiRefreshCw } from 'react-icons/fi'
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
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  orderStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  merchantTransactionId?: string
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  processing: 'bg-amber-50 border-amber-200 text-amber-600',
  shipped: 'bg-blue-50 border-blue-200 text-blue-600',
  delivered: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  cancelled: 'bg-rose-50 border-rose-200 text-rose-600',
}

const PAYMENT_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  pending: 'bg-amber-50 border-amber-200 text-amber-600',
  failed: 'bg-rose-50 border-rose-200 text-rose-600',
  refunded: 'bg-slate-50 border-slate-200 text-slate-600',
}

export default function OrdersPageClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  const persistStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderStatus: newStatus }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update order status.')
    }
  }

  const updateStatus = async (order: OrderRow, newStatus: string) => {
    const previousStatus = order.orderStatus
    if (previousStatus === newStatus) return

    try {
      await persistStatus(order.id, newStatus)
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus as OrderRow['orderStatus'] } : o))
      )

      const toastResult = await Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: `Order marked ${newStatus}`,
        showConfirmButton: true,
        confirmButtonText: 'Undo',
        confirmButtonColor: '#475569',
        timer: 6000,
        timerProgressBar: true,
        showClass: { popup: '' },
        hideClass: { popup: '' },
      })

      if (toastResult.isConfirmed) {
        await persistStatus(order.id, previousStatus)
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, orderStatus: previousStatus } : o))
        )
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          icon: 'info',
          title: 'Status reverted',
          timer: 2000,
          showConfirmButton: false,
        })
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#ffffff', color: '#1a1a1a' })
    }
  }

  const handleVerifyOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order', id: orderId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verification failed.')
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, paymentStatus: data.paymentStatus as OrderRow['paymentStatus'] }
            : o,
        ),
      )

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon:
          data.result === 'completed' || data.result === 'already_completed'
            ? 'success'
            : 'info',
        title: `Payment ${data.paymentStatus}`,
        showConfirmButton: false,
        timer: 2500,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Verify Failed',
        text: err.message,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    }
  }

  const handleSyncEps = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/payments/eps/reconcile', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync EPS payments.')
      }
      const s = data.summary
      await Swal.fire({
        icon: 'success',
        title: 'EPS Sync Complete',
        html: `<p class="text-left">Orders completed: <b>${s.ordersCompleted}</b><br/>Enrollments completed: <b>${s.enrollmentsCompleted}</b><br/>Still pending: <b>${s.ordersPending + s.enrollmentsPending}</b></p>`,
        background: '#ffffff',
        color: '#1a1a1a',
      })
      window.location.reload()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        text: err.message,
        background: '#ffffff',
        color: '#1a1a1a',
      })
    } finally {
      setSyncing(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const paidOrders = orders.filter((o) => o.paymentStatus === 'completed')

  const toggleSelectAll = () => {
    if (selectedIds.size === paidOrders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paidOrders.map((o) => o.id)))
    }
  }

  const handlePrintInvoices = () => {
    if (selectedIds.size === 0) return
    window.print()
  }

  const selectedOrders = paidOrders.filter((o) => selectedIds.has(o.id))

  return (
    <div className="px-6 py-8 space-y-6 container mx-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoices,
          #print-invoices * {
            visibility: visible;
          }
          #print-invoices {
            position: absolute;
            inset: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800">Shop Orders</h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            View orders, sync EPS payments, and update fulfillment status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncEps}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-base transition-all cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
            Sync EPS
          </button>
          <button
            type="button"
            onClick={handlePrintInvoices}
            disabled={selectedIds.size === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <FiPrinter className="h-5 w-5" />
            Print Invoices{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {orders.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <FiPackage className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-600">No orders yet</h3>
            <p className="text-base font-semibold text-slate-400 max-w-sm mx-auto">
              Shop orders will appear here once customers start checkout.
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {paidOrders.length > 0 && selectedIds.size === paidOrders.length ? (
                  <FiCheckSquare className="h-4.5 w-4.5 text-[#E61C24]" />
                ) : (
                  <FiSquare className="h-4.5 w-4.5" />
                )}
                Select All Paid
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                const isSelected = selectedIds.has(order.id)
                const isPaid = order.paymentStatus === 'completed'
                return (
                  <div key={order.id} className={`p-6 space-y-4 transition-colors ${isSelected ? 'bg-[#E61C24]/5' : ''}`}>
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => isPaid && toggleSelect(order.id)}
                        disabled={!isPaid}
                        className="mt-1 shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isPaid ? 'Select for printing' : 'Only paid orders can be printed'}
                      >
                        {isSelected ? (
                          <FiCheckSquare className="h-5 w-5 text-[#E61C24]" />
                        ) : (
                          <FiSquare className="h-5 w-5 text-slate-300" />
                        )}
                      </button>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800">{order.studentName}</p>
                            <p className="text-sm font-semibold text-slate-450">{order.studentEmail}</p>
                            {order.merchantTransactionId && (
                              <p className="text-sm font-semibold text-slate-400 mt-0.5 font-mono">
                                {order.merchantTransactionId}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide border ${PAYMENT_STYLES[order.paymentStatus] || ''}`}
                            >
                              {order.paymentStatus}
                            </span>
                            {(order.paymentStatus === 'pending' || order.paymentStatus === 'failed') && (
                              <button
                                type="button"
                                onClick={() => handleVerifyOrder(order.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:text-[#E61C24] hover:border-[#E61C24]/40 cursor-pointer"
                              >
                                <FiRefreshCw className="h-4 w-4" />
                                Verify EPS
                              </button>
                            )}
                            {isPaid && (
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
                            )}
                          </div>
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
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div id="print-invoices" className="hidden">
        {selectedOrders.map((order) => (
          <div key={order.id} className="p-10" style={{ pageBreakAfter: 'always' }}>
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Canadian Nest School</h2>
                <p className="text-base font-semibold text-slate-500">Shop Order Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-500 uppercase">Order ID</p>
                <p className="text-base font-mono font-bold text-slate-800">{order.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase mb-1">Billed To</p>
                <p className="text-base font-bold text-slate-800">{order.studentName}</p>
                <p className="text-base font-semibold text-slate-600">{order.studentEmail}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase mb-1">Ship To</p>
                <p className="text-base font-bold text-slate-800">{order.shippingName}</p>
                <p className="text-base font-semibold text-slate-600">{order.shippingPhone}</p>
                <p className="text-base font-semibold text-slate-600">{order.shippingAddress}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-2 text-sm font-bold text-slate-500 uppercase">Item</th>
                  <th className="py-2 text-sm font-bold text-slate-500 uppercase text-center">Qty</th>
                  <th className="py-2 text-sm font-bold text-slate-500 uppercase text-right">Price</th>
                  <th className="py-2 text-sm font-bold text-slate-500 uppercase text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-2 text-base font-semibold text-slate-800">{item.title}</td>
                    <td className="py-2 text-base font-semibold text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-2 text-base font-semibold text-slate-600 text-right">৳{item.price.toLocaleString('en-BD')}</td>
                    <td className="py-2 text-base font-semibold text-slate-800 text-right">৳{(item.price * item.quantity).toLocaleString('en-BD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t-2 border-slate-800">
                  <span>Total Paid</span>
                  <span>৳{order.totalAmount.toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
