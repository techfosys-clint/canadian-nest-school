'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  FiBookOpen,
  FiCheckCircle,
  FiChevronLeft,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
} from 'react-icons/fi';

interface ProductData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  comparePrice: number | null;
  thumbnail: string;
  images: string[];
  productType: 'book' | 'merchandise' | 'other';
  author: string;
  sku: string;
  category: string;
  inStock: boolean;
  stock: number | null;
}

function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-BD')}`;
}

export default function ProductDetailClient({
  product,
}: {
  product: ProductData;
}) {
  const router = useRouter();
  const { addItem, replaceCart, requireLogin } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.thumbnail);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const maxQty = product.stock === null ? 99 : Math.max(1, product.stock);
  const gallery = [product.thumbnail, ...product.images].filter(Boolean);

  const toCartLine = () => ({
    productId: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price,
    thumbnail: product.thumbnail,
    maxQty,
    inStock: product.inStock,
    quantity,
  });

  const handleAddToCart = () => {
    if (!requireLogin(`/shop/${product.slug}`)) return;
    addItem(toCartLine());
    setCartMessage('Added to cart!');
    setTimeout(() => setCartMessage(null), 2500);
  };

  const handleBuyNow = () => {
    if (!requireLogin(`/shop/${product.slug}`)) return;
    replaceCart([
      {
        ...toCartLine(),
        quantity: Math.min(quantity, maxQty),
      },
    ]);
    router.push('/shop-checkout');
  };

  return (
    <div className='container mx-auto px-6'>
      <Link
        href='/shop'
        className='inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group'
      >
        <FiChevronLeft className='h-5 w-5 transition-transform group-hover:-translate-x-0.5' />
        <span>Back to Shop</span>
      </Link>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-10 items-start'>
        {/* Gallery */}
        <div className='lg:col-span-5 space-y-3'>
          <div className='aspect-3/4 bg-white border border-zinc-200/80 rounded-lg overflow-hidden flex items-center justify-center'>
            {activeImage ? (
              <Image
                src={
                  typeof activeImage === 'object' && (activeImage as any).url
                    ? (activeImage as any).url
                    : activeImage
                }
                alt={product.title}
                className='w-full h-full object-cover'
                width={700}
                height={900}
              />
            ) : (
              <FiBookOpen className='h-16 w-16 text-zinc-300' />
            )}
          </div>
          {gallery.length > 1 && (
            <div className='grid grid-cols-4 gap-2'>
              {gallery.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImage === url
                      ? 'border-[#E61C24]'
                      : 'border-transparent hover:border-zinc-200'
                  }`}
                >
                  <Image
                    src={
                      typeof url === 'object' && (url as any).url
                        ? (url as any).url
                        : url
                    }
                    alt={`${product.title} ${idx + 1}`}
                    className='w-full h-full object-cover'
                    width={100}
                    height={100}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className='lg:col-span-7 space-y-6'>
          <div className='space-y-2'>
            {product.category && (
              <span className='inline-flex px-3 py-1 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] text-sm font-bold uppercase tracking-wide'>
                {product.category}
              </span>
            )}
            <h1 className='text-3xl font-bold text-zinc-900 leading-tight'>
              {product.title}
            </h1>
            {product.author && (
              <p className='text-base font-semibold text-zinc-500'>
                by {product.author}
              </p>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <span className='text-3xl font-bold text-[#E61C24]'>
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className='text-lg font-semibold text-zinc-400 line-through'>
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className='text-base font-semibold text-zinc-600 leading-relaxed'>
              {product.shortDescription}
            </p>
          )}

          {/* Buy box */}
          <div className='bg-white border border-zinc-200/80 rounded-lg p-6 space-y-5'>
            {!product.inStock ? (
              <div className='px-4 py-3 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-600 font-bold text-base text-center'>
                This item is currently out of stock.
              </div>
            ) : (
              <>
                <div className='flex items-center gap-4'>
                  <span className='text-base font-bold text-zinc-700'>
                    Quantity
                  </span>
                  <div className='flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5'>
                    <button
                      type='button'
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className='h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer'
                    >
                      <FiMinus className='h-4 w-4' />
                    </button>
                    <span className='w-8 text-center font-bold text-zinc-800'>
                      {quantity}
                    </span>
                    <button
                      type='button'
                      onClick={() =>
                        setQuantity((q) => Math.min(maxQty, q + 1))
                      }
                      className='h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer'
                    >
                      <FiPlus className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                <div className='flex flex-col sm:flex-row gap-3'>
                  <button
                    type='button'
                    onClick={handleAddToCart}
                    className='flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white border border-[#E61C24]/40 hover:border-[#E61C24] text-[#E61C24] font-bold text-base transition-all duration-300 cursor-pointer'
                  >
                    <FiShoppingCart className='h-5 w-5' />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    type='button'
                    onClick={handleBuyNow}
                    className='flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5'
                  >
                    <FiShoppingBag className='h-5 w-5' />
                    <span>
                      Buy Now — {formatPrice(product.price * quantity)}
                    </span>
                  </button>
                </div>
                {cartMessage && (
                  <div className='flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-base'>
                    <FiCheckCircle className='h-5 w-5 shrink-0' />
                    {cartMessage}
                  </div>
                )}
              </>
            )}

            <div className='flex items-center gap-6 pt-3 border-t border-zinc-100'>
              <div className='flex items-center gap-2 text-sm font-semibold text-zinc-500'>
                <FiTruck className='h-4 w-4 text-[#E61C24]' />
                <span>Home Delivery</span>
              </div>
              <div className='flex items-center gap-2 text-sm font-semibold text-zinc-500'>
                <FiShield className='h-4 w-4 text-[#E61C24]' />
                <span>Secure Payment</span>
              </div>
            </div>
          </div>

          {product.description && (
            <div className='bg-white border border-zinc-200/80 rounded-lg p-6'>
              <h2 className='text-xl font-bold text-zinc-800 mb-3 border-b border-zinc-100 pb-3'>
                Description
              </h2>
              <div
                className='prose max-w-none text-base font-semibold text-zinc-600 leading-relaxed'
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
