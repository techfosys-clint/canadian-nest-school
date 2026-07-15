export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  price: number;
  thumbnail: string;
  quantity: number;
  maxQty: number;
  inStock: boolean;
}

export type CartItemInput = Omit<CartItem, 'quantity'> & { quantity?: number };
