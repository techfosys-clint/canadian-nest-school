/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthorizedUser } from '@/lib/auth/auth';
import { Product } from '@/lib/db/models/Product';
import { connectToDatabase } from '@/lib/db/mongodb';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getAuthorizedUser(['admin', 'staff'], 'products');
    if (!user)
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const user = await getAuthorizedUser(['admin', 'staff'], 'products');
    if (!user)
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await request.json();
    const {
      title,
      slug,
      shortDescription,
      description,
      price,
      comparePrice,
      thumbnail,
      images,
      productType,
      author,
      sku,
      category,
      stock,
      status,
      seo,
    } = body;

    if (!title || !slug || price === undefined) {
      return NextResponse.json(
        { error: 'title, slug and price are required.' },
        { status: 400 },
      );
    }

    const existing = await Product.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'A product with this slug already exists.' },
        { status: 400 },
      );
    }

    const product = new Product({
      title,
      slug,
      shortDescription,
      description,
      price,
      comparePrice: comparePrice || undefined,
      thumbnail: thumbnail || '',
      images: images || [],
      productType: productType || 'book',
      author,
      sku,
      category,
      stock: stock === '' || stock === undefined ? null : Number(stock),
      status: status || 'draft',
      seo: seo || {},
    });

    await product.save();

    try {
      revalidatePath('/shop');
    } catch {
      console.error('Error revalidating path /shop');
    }

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
