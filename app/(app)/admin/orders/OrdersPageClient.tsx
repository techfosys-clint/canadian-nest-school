'use client'

import React, { useState } from 'react'
import { FiPackage, FiMapPin, FiPhone, FiUser, FiPrinter, FiCheckSquare, FiSquare } from 'react-icons/fi'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  // Applies the new status immediately (a fulfillment status dropdown with
  // no confirm step is easy to mis-click), then offers a few seconds to
  // undo it back to the previous value via a toast instead of a blocking
  // "are you sure?" dialog on every single change.
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)))
    }
  }

  const handlePrintInvoices = () => {
    if (selectedIds.size === 0) return
    // Rendered in a hidden #print-invoices block; print.css (below) hides
    // everything else so only the selected invoices come out on paper.
    window.print()
  }

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id))

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
            View paid orders and update fulfillment status.
          </p>
        </div>

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
          <>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {selectedIds.size === orders.length ? (
                  <FiCheckSquare className="h-4.5 w-4.5 text-[#E61C24]" />
                ) : (
                  <FiSquare className="h-4.5 w-4.5" />
                )}
                Select All
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                const isSelected = selectedIds.has(order.id)
                return (
                  <div key={order.id} className={`p-6 space-y-4 transition-colors ${isSelected ? 'bg-[#E61C24]/5' : ''}`}>
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => toggleSelect(order.id)}
                        className="mt-1 shrink-0 cursor-pointer"
                        title="Select for printing"
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
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Printable invoices — only visible to the print stylesheet above */}
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

            <div className="flex items-center justify-between text-sm font-semibold text-slate-500 border-t border-slate-200 pt-4">
              <span>Status: <span className="uppercase font-bold text-slate-700">{order.orderStatus}</span></span>
              <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
