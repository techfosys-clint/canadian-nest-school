'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CartProvider } from '@/context/CartContext'
import Navbar from './Navbar'
import Footer from './Footer'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

export default function ClientNavbarFooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Determine page type heuristically based on pathname
    let pageType = 'Other'
    if (pathname === '/') pageType = 'Home'
    else if (pathname.startsWith('/courses')) pageType = 'Course'
    else if (pathname.startsWith('/checkout') || pathname.startsWith('/shop-checkout')) pageType = 'Checkout'
    else if (pathname.startsWith('/dashboard')) pageType = 'Dashboard'
    else if (pathname.startsWith('/admin')) pageType = 'Admin'
    else if (pathname === '/login' || pathname === '/register') pageType = 'Auth'

    pushToDataLayer({
      event: 'page_view',
      event_id: generateEventId(),
      page_type: pageType,
      page_title: document.title || 'Canadian Nest School',
      page_url: window.location.href,
      page_path: pathname
    })
  }, [pathname])

  // Define route prefixes that should be excluded from the global Navbar & Footer wrapper
  const excludePrefixes = [
    '/admin',
    '/admin-report',
    '/dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ]

  const isWatchPage = pathname.startsWith('/courses/') && pathname.endsWith('/watch')

  const shouldExclude = excludePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  ) || isWatchPage

  if (shouldExclude) {
    return <>{children}</>
  }

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col relative">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  )
}
