import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    method: { type: String, enum: ['paystack'], default: 'paystack' },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },

    reference: { type: String, required: true, unique: true, index: true },

    paidAt: { type: Date },

    // Paystack metadata
    accessCode: { type: String },
    authorizationUrl: { type: String },

    // Idempotency: store the Paystack event id so we don't process duplicates
    processedEventIds: [{ type: String }],
  },
  { timestamps: true }
);

export type IPayment = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId };
export type IPaymentDocument = Document & {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  user: Types.ObjectId;
  method: 'paystack';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  reference: string;
  paidAt?: Date;
  accessCode?: string;
  authorizationUrl?: string;
  processedEventIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export default mongoose.model<IPaymentDocument>('Payment', paymentSchema);
