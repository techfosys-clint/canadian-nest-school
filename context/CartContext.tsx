'use client';

import {
  countCartItems,
  readCart,
  writeCart,
} from '@/lib/cart/storage';
import type { CartItem, CartItemInput } from '@/lib/cart/types';
import { usePathname, useRouter } from 'next/navigation';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  userId: string | null;
  authLoading: boolean;
  addItem: (item: CartItemInput) => void;
  replaceCart: (items: CartItem[]) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  requireLogin: (returnPath?: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function mergeItem(existing: CartItem[], incoming: CartItemInput): CartItem[] {
  const quantity = Math.max(1, incoming.quantity ?? 1);
  const nextItem: CartItem = {
    productId: incoming.productId,
    title: incoming.title,
    slug: incoming.slug,
    price: incoming.price,
    thumbnail: incoming.thumbnail,
    maxQty: incoming.maxQty,
    inStock: incoming.inStock,
    quantity: Math.min(quantity, incoming.maxQty),
  };

  const idx = existing.findIndex((i) => i.productId === incoming.productId);
  if (idx === -1) {
    return [...existing, nextItem];
  }

  const updated = [...existing];
  updated[idx] = {
    ...updated[idx],
    ...nextItem,
    quantity: Math.min(
      updated[idx].quantity + nextItem.quantity,
      incoming.maxQty,
    ),
  };
  return updated;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);

  const persist = useCallback((uid: string, next: CartItem[]) => {
    writeCart(uid, next);
    setItems(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.authenticated && data.user?.id) {
          const uid = data.user.id as string;
          setUserId(uid);
          setItems(readCart(uid));
        } else {
          setUserId(null);
          setItems([]);
        }
      } catch {
        if (!cancelled) {
          setUserId(null);
          setItems([]);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadAuth();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const requireLogin = useCallback(
    (returnPath?: string) => {
      if (userId) return true;
      const path =
        returnPath ||
        (typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/shop');
      router.push(`/login?redirect=${encodeURIComponent(path)}`);
      return false;
    },
    [router, userId],
  );

  const addItem = useCallback(
    (item: CartItemInput) => {
      if (!userId) return;
      persist(userId, mergeItem(items, item));
    },
    [items, persist, userId],
  );

  const replaceCart = useCallback(
    (nextItems: CartItem[]) => {
      if (!userId) return;
      persist(userId, nextItems);
    },
    [persist, userId],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (!userId) return;
      if (quantity <= 0) {
        persist(
          userId,
          items.filter((i) => i.productId !== productId),
        );
        return;
      }
      persist(
        userId,
        items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(quantity, i.maxQty) }
            : i,
        ),
      );
    },
    [items, persist, userId],
  );

  const removeItem = useCallback(
    (productId: string) => {
      if (!userId) return;
      persist(
        userId,
        items.filter((i) => i.productId !== productId),
      );
    },
    [items, persist, userId],
  );

  const clearCart = useCallback(() => {
    if (!userId) return;
    persist(userId, []);
  }, [persist, userId]);

  const value = useMemo(
    () => ({
      items,
      itemCount: countCartItems(items),
      userId,
      authLoading,
      addItem,
      replaceCart,
      updateQuantity,
      removeItem,
      clearCart,
      requireLogin,
    }),
    [
      items,
      userId,
      authLoading,
      addItem,
      replaceCart,
      updateQuantity,
      removeItem,
      clearCart,
      requireLogin,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
