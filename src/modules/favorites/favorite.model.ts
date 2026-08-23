import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const favoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

// Ensure a user cannot favorite the same product twice
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

export type IFavorite = InferSchemaType<typeof favoriteSchema> & { _id: Types.ObjectId };
export type IFavoriteDocument = Document & IFavorite;

export default mongoose.model<IFavoriteDocument>('Favorite', favoriteSchema);
