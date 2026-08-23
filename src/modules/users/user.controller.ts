import { Request, Response } from 'express';
import UserService from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { updateProfileSchema, syncUserSchema } from './user.validation';
import { ApiError } from '../../utils/ApiError';

class UserController {
  /**
   * POST /api/v1/users/sync
   * Called by the frontend right after Clerk sign-up/sign-in to ensure
   * a matching MongoDB user document exists.
   */
  sync = asyncHandler(async (req: Request, res: Response) => {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) throw ApiError.unauthorized('Authentication required');

    const parsed = syncUserSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);

    const user = await UserService.findOrCreate({
      clerkUserId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
    });

    sendSuccess(res, user);
  });

  /**
   * GET /api/v1/users/me
   */
  getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const user = await UserService.findById(req.dbUser._id);
    if (!user) throw ApiError.notFound('User not found');
    sendSuccess(res, user);
  });

  /**
   * PATCH /api/v1/users/me
   */
  updateMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);

    const updated = await UserService.updateProfile(req.dbUser._id, parsed.data);
    sendSuccess(res, updated);
  });
}

export default new UserController();
