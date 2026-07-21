import type { PaginationMeta } from "@flowerp/shared";

// Backend-only: turns a Prisma count() + the validated page/limit into the
// meta.pagination object. The frontend only ever reads a PaginationMeta,
// never builds one — see packages/shared/CONVENTIONS.md.
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
