import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../utils/errors.js";

export interface RequestSchema {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

// Parses req.body/query/params against the given Zod schema(s) and attaches
// the result to req.validated. Controllers read from req.validated, fully
// typed, instead of re-parsing req.body/query/params themselves.
export function validateRequest(schema: RequestSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = {
        body: schema.body ? schema.body.parse(req.body) : undefined,
        query: schema.query ? schema.query.parse(req.query) : undefined,
        params: schema.params ? schema.params.parse(req.params) : undefined,
      };
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new ValidationError("Validation failed", err.issues));
      } else {
        next(err);
      }
    }
  };
}
