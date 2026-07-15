import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  product: mongoose.Types.ObjectId | string
  title: string
  price: number
  quantity: number
}

export interface IOrder extends Document {
  student: mongoose.Types.ObjectId | string
  items: IOrderItem[]
  totalAmount: number
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  orderStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentReference?: string
  merchantTransactionId?: string
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', required: true },
    orderStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing', required: true },
    paymentReference: String,
    merchantTransactionId: { type: String, unique: true, sparse: true },
    shippingName: { type: String, required: true },
    shippingPhone: { type: String, required: true },
    shippingAddress: { type: String, required: true },
  },
  { collection: 'orders', timestamps: true }
)

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)
