# Conventions

## Response envelope

Every API response is one of two shapes:

- Success: `{ "data": T, "meta"?: { "pagination"?: PaginationMeta } }` — see [`src/http/envelope.ts`](src/http/envelope.ts).
- Error: `{ "error": { "code": string, "message": string, "details"?: unknown } }` — see [`src/http/envelope.ts`](src/http/envelope.ts) and the backend's centralized handler in [FLO-007](../../specs/FLO-007-validation-error-handling.md).

There is no other response shape. A route never returns a bare array, a bare object, or a bare error string.

## Pagination

List endpoints accept `page`/`limit` via the shared `PaginationQuery` Zod schema (`src/http/pagination.ts`), extended per-endpoint with that entity's own filters:

```ts
const listCustomersQuery = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
  type: CustomerTypeSchema.optional(),
  status: CustomerStatusSchema.optional(),
});
```

The backend computes `meta.pagination` from a Prisma `count()` plus the validated `page`/`limit` (see `backend/src/utils/pagination.ts`'s `buildPaginationMeta` — a backend-only helper; the frontend only ever reads `PaginationMeta`, never builds one).

## Search and filtering

No generic filter-builder abstraction — the project doesn't need one, and building one would be solving a problem this project doesn't have. Instead, each list endpoint follows the same shape directly:

- `search` (optional) — free-text, matched case-insensitively against that entity's most relevant text fields (name, code, etc.) via Prisma `OR` + `contains` + `mode: "insensitive"`.
- Per-entity filter keys (e.g. Customer's `type`/`status`, Product's `category`) — documented by that entity's own spec, translated directly to Prisma `where` equality clauses in the service layer.

A controller's service-layer query composes `where` directly from the validated query object — there's no intermediate query-builder layer to learn. If a future list endpoint needs something this pattern doesn't cover, extend that endpoint's own query schema and `where` composition; don't generalize the pattern preemptively.

## Entity schemas

Placed in `src/schemas/`, one file per entity, authored by that entity's owning Phase 3 spec (not this one — see [`src/schemas/README.md`](src/schemas/README.md)). Both backend and frontend import the same schema/inferred type from here, which is what prevents the two sides from silently drifting apart on what an entity looks like.
