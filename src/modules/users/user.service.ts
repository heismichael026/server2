import UserModel, { IUser, IUserDocument } from './user.model';
import { ApiError } from '../../utils/ApiError';
import { normalizeNigerianPhone } from '../../utils/phone';
import mongoose from 'mongoose';

export interface CreateUserData {
  clerkUserId: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
}

class UserService {
  async findByClerkId(clerkUserId: string): Promise<IUser | null> {
    return UserModel.findOne({ clerkUserId }).lean() as unknown as Promise<IUser | null>;
  }

  async findById(id: string): Promise<IUser | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findById(id).lean() as unknown as Promise<IUser | null>;
  }

  async create(data: CreateUserData): Promise<IUser> {
    try {
      const doc = await UserModel.create({
        clerkUserId: data.clerkUserId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp ?? data.phone,
      });
      return doc.toObject() as unknown as IUser;
    } catch (err: unknown) {
      const e = err as { code?: number; keyValue?: Record<string, unknown> };
      if (e.code === 11000 && e.keyValue) {
        const field = Object.keys(e.keyValue)[0];
        throw ApiError.conflict(`A user with this ${field} already exists`);
      }
      throw err;
    }
  }

  async findOrCreate(data: CreateUserData): Promise<IUser> {
    const existing = await this.findByClerkId(data.clerkUserId);
    if (existing) return existing;
    return this.create(data);
  }

  async updateProfile(
    userId: string,
    update: {
      fullName?: string;
      phone?: string;
      whatsapp?: string;
      address?: {
        street: string;
        city: string;
        state: string;
        additionalInfo?: string;
      };
    }
  ): Promise<IUser> {
    const setRecord: Record<string, unknown> = {};
    if (update.fullName !== undefined) setRecord.fullName = update.fullName;
    if (update.phone !== undefined) setRecord.phone = normalizeNigerianPhone(update.phone);
    if (update.whatsapp !== undefined) setRecord.whatsapp = normalizeNigerianPhone(update.whatsapp);
    if (update.address !== undefined) setRecord.address = update.address;

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $set: setRecord },
      { new: true, runValidators: true }
    ).lean() as unknown as IUser | null;

    if (!updated) throw ApiError.notFound('User not found');
    return updated;
  }
}

export default new UserService();
