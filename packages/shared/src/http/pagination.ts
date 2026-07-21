import { z } from "zod";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Shared by every list endpoint's query schema, e.g.:
//   z.object({ ...PaginationQuery.shape, status: CustomerStatusSchema.optional() })
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof PaginationQuery>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
