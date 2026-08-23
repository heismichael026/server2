import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

type ValidationSchemas = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
        req.body = parsed.data;
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
        req.query = parsed.data as Record<string, string>;
      }
      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
        req.params = parsed.data as Record<string, string>;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
