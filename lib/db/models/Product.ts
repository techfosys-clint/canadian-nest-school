import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  title: string
  slug: string
  shortDescription?: string
  description?: any // Lexical RichText JSON
  price: number
  comparePrice?: number
  thumbnail?: string
  images?: string[]
  productType: 'book' | 'merchandise' | 'other'
  author?: string
  sku?: string
  category?: string
  stock?: number | null // null/undefined = unlimited stock
  status: 'draft' | 'published'
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string
  }
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String },
    description: { type: Schema.Types.Mixed },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 },
    thumbnail: { type: String, default: '' },
    images: { type: [String], default: [] },
    productType: { type: String, enum: ['book', 'merchandise', 'other'], default: 'book', required: true },
    author: { type: String },
    sku: { type: String },
    category: { type: String },
    stock: { type: Number, default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: String,
    },
  },
  { collection: 'products', timestamps: true }
)

if (mongoose.models.Product && !mongoose.models.Product.schema.paths.productType) {
  delete mongoose.models.Product
}

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
