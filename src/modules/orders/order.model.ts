import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const deliveryAddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    additionalInfo: { type: String },
  },
  { _id: false }
);

const timelineEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String },
    customerPhone: { type: String },

    items: [orderItemSchema],

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
    },

    deliveryAddress: {
      type: deliveryAddressSchema,
      required: function (this: { deliveryMethod: string }) {
        return this.deliveryMethod === 'delivery';
      },
    },

    orderStatus: {
      type: String,
      enum: ['placed', 'delivered', 'cancelled'],
      default: 'placed',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    paymentReference: { type: String, index: true },

    timeline: [timelineEntrySchema],
  },
  { timestamps: true }
);

export type IOrder = InferSchemaType<typeof orderSchema> & { _id: Types.ObjectId };
export type IOrderDocument = Document & {
  _id: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    additionalInfo?: string;
  };
  orderStatus: 'placed' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
  timeline: Array<{ status: string; timestamp: Date }>;
  createdAt: Date;
  updatedAt: Date;
};

export default mongoose.model<IOrderDocument>('Order', orderSchema);
