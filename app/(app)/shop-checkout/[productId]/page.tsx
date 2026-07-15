import React from 'react';
import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Product } from '@/lib/db/models/Product';
import LegacyCheckoutRedirect from './LegacyCheckoutRedirect';

type Props = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ quantity?: string }>;
};

export const dynamic = 'force-dynamic';

export default async function LegacyShopCheckoutPage({
  params,
  searchParams,
}: Props) {
  const { productId } = await params;
  const { quantity } = await searchParams;
  await connectToDatabase();

  const product = (await Product.findById(productId).lean()) as any;
  if (!product || product.status !== 'published') notFound();

  const serializedProduct = {
    id: product._id.toString(),
    title: product.title,
    slug: product.slug,
    price: product.price,
    thumbnail: product.thumbnail || '',
    inStock:
      product.stock === null ||
      product.stock === undefined ||
      product.stock > 0,
    maxQty:
      product.stock === null || product.stock === undefined
        ? 99
        : Math.max(1, product.stock),
  };

  const initialQuantity = Math.max(1, parseInt(quantity || '1', 10) || 1);

  return (
    <LegacyCheckoutRedirect
      product={serializedProduct}
      initialQuantity={initialQuantity}
    />
  );
}
