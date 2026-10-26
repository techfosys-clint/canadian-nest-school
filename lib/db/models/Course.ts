import mongoose, { Schema, Document } from 'mongoose'

export interface ICourse extends Document {
  title: string
  slug: string
  summary?: string
  description?: any // Lexical JSON
  price?: number
  thumbnail?: mongoose.Types.ObjectId | string
  category?: mongoose.Types.ObjectId | string
  categories?: (mongoose.Types.ObjectId | string)[]
  instructor?: mongoose.Types.ObjectId | string
  instructors?: (mongoose.Types.ObjectId | string)[]
  status: 'draft' | 'published'
  duration?: string
  level?: 'all' | 'beginner' | 'intermediate' | 'advanced'
  meetingLink?: string
  whatYouWillLearn?: Array<{ outcome: string }>
  requirements?: Array<{ requirement: string }>
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string
  }
  studyMaterials?: Array<{
    title: string
    url: string
    materialType: 'pdf' | 'epub' | 'link' | 'other'
    coverImage?: string
  }>
  modules?: string[]
  /** one_time = lifetime purchase; monthly = 30-day subscription */
  billingType?: 'one_time' | 'monthly'
  monthlyFee?: number
  lateFeeEnabled?: boolean
  lateFeeAmount?: number
  /** Days before paidUntil when red dashboard notice starts. */
  noticeStartOffsetDays?: number
  /** Days after paidUntil when red notice ends (usually <= blockOffsetDays). */
  noticeEndOffsetDays?: number
  /** Days after paidUntil when course access is blocked. */
  blockOffsetDays?: number
  /** Optional YouTube/Vimeo trailer URL for the public course page. */
  trailerVideoUrl?: string
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String },
    description: { type: Schema.Types.Mixed }, // Lexical JSON structure
    price: { type: Number, min: 0 },
    thumbnail: { type: Schema.Types.ObjectId, ref: 'Media' },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    instructor: { type: Schema.Types.ObjectId, ref: 'User' },
    instructors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    duration: { type: String },
    level: { type: String, enum: ['all', 'beginner', 'intermediate', 'advanced'], default: 'all' },
    meetingLink: { type: String },
    whatYouWillLearn: [
      {
        outcome: { type: String, required: true },
      },
    ],
    requirements: [
      {
        requirement: { type: String, required: true },
      },
    ],
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: String,
    },
    studyMaterials: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        materialType: { type: String, enum: ['pdf', 'epub', 'link', 'other'], default: 'pdf', required: true },
        coverImage: { type: String, default: '' },
      },
    ],
    modules: { type: [String], default: [] },
    billingType: {
      type: String,
      enum: ['one_time', 'monthly'],
      default: 'one_time',
    },
    monthlyFee: { type: Number, min: 0 },
    lateFeeEnabled: { type: Boolean, default: false },
    lateFeeAmount: { type: Number, min: 0, default: 0 },
    noticeStartOffsetDays: { type: Number, min: 0, default: 5 },
    noticeEndOffsetDays: { type: Number, min: 0, default: 2 },
    blockOffsetDays: { type: Number, min: 0, default: 2 },
    trailerVideoUrl: { type: String, default: '' },
  },
  { collection: 'courses', timestamps: true }
)

// Clear old model cache in development if newer fields are not registered in the compiled schema paths
if (
  mongoose.models.Course &&
  (!mongoose.models.Course.schema.paths.modules ||
    !mongoose.models.Course.schema.paths.category ||
    !mongoose.models.Course.schema.paths['studyMaterials.coverImage'] ||
    !mongoose.models.Course.schema.paths.billingType ||
    !mongoose.models.Course.schema.paths.trailerVideoUrl)
) {
  delete mongoose.models.Course
}

export const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema)
