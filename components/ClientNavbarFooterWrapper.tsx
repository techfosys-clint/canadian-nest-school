'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CartProvider } from '@/context/CartContext'
import { LocaleProvider } from '@/context/LocaleContext'
import Navbar from './Navbar'
import Footer from './Footer'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'
import type { Locale } from '@/lib/i18n/config'
import { stripLocalePrefix } from '@/lib/i18n/path'

export default function ClientNavbarFooterWrapper({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: Locale
}) {
  const pathname = usePathname()
  const barePath = stripLocalePrefix(pathname || '/')

  useEffect(() => {
    let pageType = 'Other'
    if (barePath === '/') pageType = 'Home'
    else if (barePath.startsWith('/courses')) pageType = 'Course'
    else if (
      barePath.startsWith('/checkout') ||
      barePath.startsWith('/shop-checkout')
    )
      pageType = 'Checkout'
    else if (barePath.startsWith('/dashboard')) pageType = 'Dashboard'
    else if (barePath.startsWith('/admin')) pageType = 'Admin'
    else if (barePath === '/login' || barePath === '/register') pageType = 'Auth'

    pushToDataLayer({
      event: 'page_view',
      event_id: generateEventId(),
      page_type: pageType,
      page_title: document.title || 'Canadian Nest School',
      page_url: window.location.href,
      page_path: pathname,
      locale,
    })
  }, [pathname, barePath, locale])

  const excludePrefixes = [
    '/admin',
    '/admin-report',
    '/dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ]

  const isWatchPage =
    barePath.startsWith('/courses/') && barePath.endsWith('/watch')

  const shouldExclude =
    excludePrefixes.some(
      (prefix) => barePath === prefix || barePath.startsWith(prefix + '/'),
    ) || isWatchPage

  if (shouldExclude) {
    return <>{children}</>
  }

  return (
    <LocaleProvider initialLocale={locale}>
      <CartProvider>
        <div className='min-h-screen flex flex-col relative'>
          <Navbar />
          <main className='flex-1 flex flex-col'>{children}</main>
          <Footer />
        </div>
      </CartProvider>
    </LocaleProvider>
  )
}
