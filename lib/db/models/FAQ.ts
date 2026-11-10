import mongoose, { Schema, Document } from 'mongoose'

export interface IFAQ extends Document {
  question: string
  answer: string
  questionBn?: string
  answerBn?: string
  order: number
  isActive: boolean
}

const FAQSchema = new Schema<IFAQ>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    questionBn: { type: String, default: '' },
    answerBn: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'faqs', timestamps: true }
)

if (mongoose.models.FAQ && !mongoose.models.FAQ.schema.paths.questionBn) {
  delete mongoose.models.FAQ
}

export const FAQ = mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema)
