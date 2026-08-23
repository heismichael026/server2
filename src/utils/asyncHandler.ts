import { NextFunction, Request, Response } from 'express';
import { ApiError } from './ApiError';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err instanceof ApiError) return next(err);
      next(err);
    });
  };
}
