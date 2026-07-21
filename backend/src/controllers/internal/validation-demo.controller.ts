import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { NotFoundError } from "../../utils/errors.js";

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100),
});

// Reference implementation of the validateRequest + AppError pattern for
// Phase 3 modules to model their own routes on. Mounted only outside
// production (see app.ts). See specs/FLO-007-validation-error-handling.md.
export function list(req: Request, res: Response): void {
  const { limit } = req.validated?.query as z.infer<typeof listQuerySchema>;
  res.status(200).json({ data: { limit } });
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError("Demo resource not found"));
}

export function boom(): void {
  throw new Error("Deliberate unhandled error for the error-handler demo route");
}
