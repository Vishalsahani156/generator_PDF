import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid ${err.path}` });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ error: messages.join(', ') });
    return;
  }

  if (err && typeof err === 'object' && (err as MongoDuplicateKeyError).code === 11000) {
    res.status(409).json({ error: 'Duplicate value' });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  console.error('[api] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
}
