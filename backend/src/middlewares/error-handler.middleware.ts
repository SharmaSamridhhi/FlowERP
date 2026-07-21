import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/errors.js";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Prisma's error `meta` shape is intentionally loose (Record<string,
// unknown> at best) — this is the one place a slightly loose read of it is
// acceptable, narrowly scoped to building a human-readable message.
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case "P2002": {
      const target = err.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "field";
      return new AppError(`A record with this ${field} already exists.`, 409, "CONFLICT");
    }
    case "P2025":
      return new AppError("Record not found", 404, "NOT_FOUND");
    default:
      return new AppError("Database error", 500, "DATABASE_ERROR");
  }
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(err);
  }
  return new AppError("Internal server error", 500, "INTERNAL_ERROR");
}

// Centralized error handler, registered last in app.ts. Every thrown or
// next()-forwarded error ends up here and becomes one consistent JSON
// shape. See specs/FLO-007-validation-error-handling.md.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(err);

  if (appError.statusCode >= 500) {
    console.error(err);
  }

  const body: ErrorResponseBody = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };

  res.status(appError.statusCode).json(body);
}
