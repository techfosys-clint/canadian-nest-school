import mongoose, { Schema, Document } from 'mongoose'

export interface IQuizQuestion {
  questionText: string
  options: string[]
  correctAnswerIndex: number
  image?: mongoose.Types.ObjectId | string
  imageUrl?: string
}

export interface ILesson extends Document {
  title: string
  slug: string
  course: mongoose.Types.ObjectId | string
  order: number
  moduleName?: string
  lessonType: 'recorded' | 'live' | 'quiz' | 'assignment'
  totalMarks?: number
  videoUrl?: string
  videoFile?: mongoose.Types.ObjectId | string
  livePlatform?: 'zoom' | 'meet' | 'teams' | 'other'
  autoGenerateZoom: boolean
  liveUrl?: string
  liveDate?: Date
  content?: any // Lexical rich text
  duration: number
  isPreviewable: boolean
  reminderSent?: boolean
  quizQuestions?: IQuizQuestion[]
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string
  }
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  image: { type: Schema.Types.ObjectId, ref: 'Media' },
  imageUrl: String
}, { _id: false })

const LessonSchema = new Schema<ILesson>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, required: true, min: 1 },
    moduleName: { type: String, default: 'General Module' },
    lessonType: { type: String, enum: ['recorded', 'live', 'quiz', 'assignment'], default: 'recorded', required: true },
    totalMarks: { type: Number, default: 100 },
    videoUrl: String,
    videoFile: { type: Schema.Types.ObjectId, ref: 'Video' },
    livePlatform: { type: String, enum: ['zoom', 'meet', 'teams', 'other'], default: 'zoom' },
    autoGenerateZoom: { type: Boolean, default: false },
    liveUrl: String,
    liveDate: Date,
    content: Schema.Types.Mixed, // Lexical RichText
    duration: { type: Number, required: true },
    isPreviewable: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    quizQuestions: [QuizQuestionSchema],
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: String,
    },
  },
  { collection: 'lessons', timestamps: true }
)

// Clear old model cache in development if moduleName field is not registered in compiled schema paths
if (mongoose.models.Lesson && !mongoose.models.Lesson.schema.paths.moduleName) {
  delete mongoose.models.Lesson
}

export const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema)
