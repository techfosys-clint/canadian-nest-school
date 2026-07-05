import type { CartItem } from './types';

const PREFIX = 'cns-shop-cart';

export function cartStorageKey(userId: string): string {
  return `${PREFIX}-${userId}`;
}

export function readCart(userId: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(cartStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(userId: string, items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(cartStorageKey(userId), JSON.stringify(items));
}

export function countCartItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
