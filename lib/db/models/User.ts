import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password?: string
  name: string
  phone?: string
  profilePic?: mongoose.Types.ObjectId | string
  role: 'admin' | 'staff' | 'instructor'
  designation?: string
  resetPasswordToken?: string
  resetPasswordExpiration?: Date
  permissions?: string[]
  isSuperAdmin?: boolean
  status: 'active' | 'suspended'
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Hashed password
    name: { type: String, required: true },
    phone: { type: String },
    profilePic: { type: Schema.Types.ObjectId, ref: 'Media' },
    role: { type: String, enum: ['admin', 'staff', 'instructor'], default: 'staff', required: true },
    designation: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpiration: { type: Date },
    permissions: { type: [String], default: [] },
    // The root account created via the first-time setup wizard. No one —
    // not even another admin — may delete a super admin account, protecting
    // the root account from being removed by a compromised or rogue admin.
    isSuperAdmin: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', required: true },
  },
  { collection: 'users', timestamps: true }
)

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
