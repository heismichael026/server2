import mongoose, { Schema, Document, InferSchemaType } from 'mongoose';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export type IContactMessage = InferSchemaType<typeof contactMessageSchema>;
export type IContactMessageDocument = Document & IContactMessage;

export default mongoose.model<IContactMessageDocument>('ContactMessage', contactMessageSchema);
