'use client';

import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/lib/cart/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LegacyCheckoutRedirect({
  product,
  initialQuantity,
}: {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    thumbnail: string;
    inStock: boolean;
    maxQty: number;
  };
  initialQuantity: number;
}) {
  const router = useRouter();
  const { replaceCart, requireLogin, authLoading, userId } = useCart();

  useEffect(() => {
    if (authLoading) return;
    if (!requireLogin(`/shop-checkout/${product.id}?quantity=${initialQuantity}`)) {
      return;
    }

    const line: CartItem = {
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      thumbnail: product.thumbnail,
      maxQty: product.maxQty,
      inStock: product.inStock,
      quantity: Math.min(initialQuantity, product.maxQty),
    };

    replaceCart([line]);
    router.replace('/shop-checkout');
  }, [
    authLoading,
    userId,
    product,
    initialQuantity,
    replaceCart,
    requireLogin,
    router,
  ]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-zinc-50'>
      <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
    </div>
  );
}
