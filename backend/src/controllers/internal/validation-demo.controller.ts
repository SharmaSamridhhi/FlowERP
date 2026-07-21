import { PaginationQuery, type SuccessEnvelope } from "@flowerp/shared";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { NotFoundError } from "../../utils/errors.js";
import { buildPaginationMeta } from "../../utils/pagination.js";

// Reference implementation of the validateRequest + AppError pattern for
// Phase 3 modules to model their own routes on. Mounted only outside
// production (see app.ts). See specs/FLO-007-validation-error-handling.md
// and specs/FLO-008-shared-contracts.md.

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100),
});

export function list(req: Request, res: Response): void {
  const { limit } = req.validated?.query as z.infer<typeof listQuerySchema>;
  const body: SuccessEnvelope<{ limit: number }> = { data: { limit } };
  res.status(200).json(body);
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError("Demo resource not found"));
}

export function boom(): void {
  throw new Error("Deliberate unhandled error for the error-handler demo route");
}

// In-memory fake dataset — proves the { data, meta: { pagination } }
// envelope end-to-end without depending on any real business table.
const DEMO_ITEMS = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Demo item ${i + 1}`,
}));

export const paginatedListQuerySchema = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
});

export function paginatedList(req: Request, res: Response): void {
  const { page, limit, search } = req.validated?.query as z.infer<typeof paginatedListQuerySchema>;

  const filtered = search
    ? DEMO_ITEMS.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : DEMO_ITEMS;

  const start = (page - 1) * limit;
  const pageItems = filtered.slice(start, start + limit);

  const body: SuccessEnvelope<(typeof DEMO_ITEMS)[number][]> = {
    data: pageItems,
    meta: { pagination: buildPaginationMeta(filtered.length, page, limit) },
  };
  res.status(200).json(body);
}
