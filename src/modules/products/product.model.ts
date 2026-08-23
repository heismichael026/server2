import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    category: { type: String, trim: true, index: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type IProduct = InferSchemaType<typeof productSchema> & { _id: Types.ObjectId };
export type IProductDocument = Document & IProduct;

export default mongoose.model<IProductDocument>('Product', productSchema);
