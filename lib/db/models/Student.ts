import mongoose, { Schema, Document } from 'mongoose'

export interface IStudent extends Document {
  email: string
  password?: string
  name: string
  phone: string
  profilePic?: mongoose.Types.ObjectId | string
  status: 'active' | 'suspended'
  resetPasswordToken?: string
  resetPasswordExpiration?: Date
}

const StudentSchema = new Schema<IStudent>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Hashed password
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    profilePic: { type: Schema.Types.ObjectId, ref: 'Media' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpiration: { type: Date },
  },
  { collection: 'students', timestamps: true }
)

export const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema)
