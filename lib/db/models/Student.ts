import mongoose, { Schema, Document } from 'mongoose'

export interface IStudent extends Document {
  email: string
  password?: string
  name: string
  phone: string
  /** Lifelong permanent roll number, e.g. CNS-2026-0001 */
  studentId?: string
  profilePic?: mongoose.Types.ObjectId | string
  status: 'active' | 'suspended'
  resetPasswordToken?: string
  resetPasswordExpiration?: Date
  createdAt?: Date
  updatedAt?: Date
}

const StudentSchema = new Schema<IStudent>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Hashed password
    name: { type: String, required: true },
    phone: { type: String, required: true },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    profilePic: { type: Schema.Types.ObjectId, ref: 'Media' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpiration: { type: Date },
  },
  { collection: 'students', timestamps: true }
)

// Clear cached model in dev if studentId path is missing
if (
  mongoose.models.Student &&
  !mongoose.models.Student.schema.paths.studentId
) {
  delete mongoose.models.Student
}

export const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema)
