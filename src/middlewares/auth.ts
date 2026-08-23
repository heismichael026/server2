import { clerkClient } from '@clerk/express';
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import UserService from '../modules/users/user.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string | null;
        sessionClaims?: unknown;
        [key: string]: unknown;
      };
      dbUser?: {
        _id: string;
        clerkUserId: string;
        fullName: string;
        email: string;
        phone: string;
      };
    }
  }
}

/**
 * Require a valid Clerk session. The @clerk/express middleware (ClerkExpressRequireAuth)
 * runs before this in the pipeline and populates req.auth.userId.
 * This middleware additionally loads the matching MongoDB user document.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      throw ApiError.unauthorized('Authentication required');
    }

    const user = await UserService.findByClerkId(clerkUserId);
    if (!user) {
      // Auto-provision a user document if Clerk knows the user but we don't yet.
      // This handles Google sign-in and other Clerk-managed sign-ups.
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
        const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? '';
        const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'Customer';

        const created = await UserService.findOrCreate({
          clerkUserId,
          fullName,
          email,
          phone,
          whatsapp: phone,
        });
        req.dbUser = {
          _id: String(created._id),
          clerkUserId: created.clerkUserId,
          fullName: created.fullName,
          email: created.email,
          phone: created.phone,
        };
        return next();
      } catch {
        throw ApiError.unauthorized('User not found');
      }
    }

    req.dbUser = {
      _id: String(user._id),
      clerkUserId: user.clerkUserId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Optional auth — does not fail if no session, but loads dbUser if present. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (clerkUserId) {
      const user = await UserService.findByClerkId(clerkUserId);
      if (user) {
        req.dbUser = {
          _id: String(user._id),
          clerkUserId: user.clerkUserId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
        };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
