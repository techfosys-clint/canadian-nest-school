import mongoose, { Schema, Document } from 'mongoose'

export interface ICategory extends Document {
  name: string
  nameBn?: string
  slug: string
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    nameBn: { type: String, default: '', trim: true },
    slug: { type: String, required: true, unique: true },
  },
  { collection: 'categories', timestamps: true }
)

// In dev, hot reload keeps the previously registered model, whose schema may be
// missing newly added fields (Mongoose then silently drops them on save).
// Re-register the model when its schema is out of date.
const existing = mongoose.models.Category as mongoose.Model<ICategory> | undefined
if (existing && !existing.schema.path('nameBn')) {
  mongoose.deleteModel('Category')
}

export const Category: mongoose.Model<ICategory> =
  (mongoose.models.Category as mongoose.Model<ICategory> | undefined) ||
  mongoose.model<ICategory>('Category', CategorySchema)
