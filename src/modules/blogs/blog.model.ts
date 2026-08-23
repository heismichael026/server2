import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, trim: true },
    content: { type: String, required: true },
    image: { type: String },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export type IBlog = InferSchemaType<typeof blogSchema> & { _id: Types.ObjectId };
export type IBlogDocument = Document & IBlog;

export default mongoose.model<IBlogDocument>('Blog', blogSchema);
