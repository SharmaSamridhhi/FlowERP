import type { NextFunction, Request, Response } from "express";

// Minimal fallback error handler. Superseded by the centralized AppError
// hierarchy in FLO-007 (specs/FLO-007-validation-error-handling.md).
// eslint rules aren't configured yet (FLO-005), but unused params are
// still prefixed with `_` to keep this readable ahead of that spec.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  res.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
}
