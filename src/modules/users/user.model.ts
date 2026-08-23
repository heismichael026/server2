import mongoose, { Schema, Document, InferSchemaType, Types } from 'mongoose';
import { normalizeNigerianPhone } from '../../utils/phone';

const addressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    additionalInfo: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    whatsapp: { type: String, trim: true },
    address: addressSchema,
  },
  { timestamps: true }
);

userSchema.pre('validate', function (next) {
  if (this.phone) {
    this.phone = normalizeNigerianPhone(this.phone);
  }
  if (this.whatsapp) {
    this.whatsapp = normalizeNigerianPhone(this.whatsapp);
  }
  next();
});

export type IUser = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export type IUserDocument = Document & InferSchemaType<typeof userSchema>;

export default mongoose.model<IUserDocument>('User', userSchema);
