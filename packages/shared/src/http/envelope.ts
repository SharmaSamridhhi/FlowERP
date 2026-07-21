import type { PaginationMeta } from "./pagination.js";

// Every successful API response shares this shape. Paired with
// ErrorEnvelope below (mirroring the backend's centralized error handler
// from specs/FLO-007-validation-error-handling.md) so a response is
// always one of these two shapes, never a bare, ad hoc JSON body.
export interface SuccessEnvelope<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

// Mirrors backend/src/middlewares/error-handler.middleware.ts's response
// body. Kept as a plain type here (not the AppError class itself, which
// is backend-only) so the frontend can type-check against the same shape
// without depending on server-side error classes.
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
