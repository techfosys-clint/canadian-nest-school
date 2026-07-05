'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { FiSearch, FiShoppingBag, FiBookOpen, FiX } from 'react-icons/fi'

interface ShopProduct {
  id: string
  title: string
  slug: string
  shortDescription: string
  price: number
  comparePrice: number | null
  thumbnail: string
  productType: 'book' | 'merchandise' | 'other'
  author: string
  category: string
  inStock: boolean
}

function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-BD')}`
}

export default function ShopPageClient({
  products,
  categories,
}: {
  products: ShopProduct[]
  categories: string[]
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.author.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, activeCategory])

  return (
    <div className="min-h-screen">
      {/* Hero band */}
      <section className="w-full bg-[#0A163A] pt-32 pb-16">
        <div className="container mx-auto px-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-5">
            <FiShoppingBag className="h-4 w-4" /> Canadian Nest Shop
          </span>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-3 leading-tight">
            Books &amp; Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D55] to-white">Materials</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg font-semibold leading-relaxed max-w-2xl">
            Physical books, guides, and other learning materials to support your study journey — delivered right to your door.
          </p>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="w-full bg-[#f8fafc] py-12">
        <div className="container mx-auto px-6 space-y-8">
          {/* Search + category chips */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <div className="flex items-center gap-2 bg-white border border-zinc-200/80 rounded-lg px-4 py-3 w-full md:max-w-sm focus-within:border-[#E61C24]/60 transition-colors">
              <FiSearch className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books, authors..."
                className="bg-transparent border-none outline-none w-full text-base font-semibold text-zinc-800 placeholder-zinc-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer border ${
                    activeCategory === 'all'
                      ? 'bg-[#E61C24] border-[#E61C24] text-white'
                      : 'bg-white border-zinc-200/80 text-zinc-600 hover:border-[#E61C24]/40'
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer border ${
                      activeCategory === cat
                        ? 'bg-[#E61C24] border-[#E61C24] text-white'
                        : 'bg-white border-zinc-200/80 text-zinc-600 hover:border-[#E61C24]/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-lg p-16 text-center">
              <FiBookOpen className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-base font-semibold text-zinc-500">
                {products.length === 0 ? 'No items are available in the shop yet.' : 'No items match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="bg-white rounded-lg border border-[#E61C24]/15 hover:border-[#E61C24]/50 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(230,28,36,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  <div className="aspect-[3/4] bg-zinc-50 overflow-hidden relative">
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiBookOpen className="h-10 w-10 text-zinc-300" />
                      </div>
                    )}
                    {!product.inStock && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 text-white text-sm font-bold uppercase tracking-wide">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <h3 className="text-base font-bold text-zinc-800 leading-snug line-clamp-2 group-hover:text-[#E61C24] transition-colors">
                      {product.title}
                    </h3>
                    {product.author && (
                      <p className="text-sm font-semibold text-zinc-450">by {product.author}</p>
                    )}
                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-[#E61C24]">{formatPrice(product.price)}</span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-sm font-semibold text-zinc-400 line-through">
                          {formatPrice(product.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
