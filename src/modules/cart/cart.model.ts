import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

export type ICart = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: Array<{
    product: Types.ObjectId;
    quantity: number;
    price: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
};
export type ICartDocument = Document & ICart;

export default mongoose.model<ICartDocument>('Cart', cartSchema);
