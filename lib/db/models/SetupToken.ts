import mongoose, { Schema, Document } from 'mongoose'

export interface ISetupToken extends Document {
  token: string
}

const SetupTokenSchema = new Schema<ISetupToken>(
  {
    token: { type: String, required: true },
  },
  { collection: 'setup_tokens', timestamps: true }
)

export const SetupToken =
  mongoose.models.SetupToken || mongoose.model<ISetupToken>('SetupToken', SetupTokenSchema)
