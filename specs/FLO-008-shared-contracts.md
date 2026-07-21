# FLO-008 — Shared API Contracts, Response Envelope & Query Utilities

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Turn `packages/shared` into the single source of truth for request/response shapes shared between frontend and backend: a standard success-response envelope, pagination/filter/search query-param helpers, and the convention that every entity's Zod schema (once authored by its owning Phase 3 spec) lives in `packages/shared` so both apps import the _same_ schema and the _same_ inferred TypeScript type. This spec also builds the frontend's base API client (fetch wrapper + TanStack Query setup) that consumes this envelope. Without this in place before Phase 3, backend and frontend types for the same entity would inevitably drift.

## User Story

As a developer working across the stack, I want one shared definition of API response shapes, pagination, and per-entity validation schemas, so that the frontend and backend can never disagree about what a `Customer` (or any other entity) looks like over the wire.

## Scope

**Included:**

- `packages/shared` structured as: `src/schemas/` (empty now, populated per-entity by Phase 3 specs, e.g. `customer.schema.ts` added by FLO-012), `src/http/` (envelope + pagination types), `src/index.ts` barrel export. Built as a TypeScript library consumable by both `backend` and `frontend` (project references or a simple `tsc` build step, whichever keeps dev-mode hot-reload working in both apps).
- Success envelope type/helper: `{ data: T, meta?: { pagination?: {...} } }`, paired with FLO-007's error envelope so every response — success or failure — has one predictable top-level shape.
- Pagination contract: shared `PaginationQuery` Zod schema (`page`, `limit` with sane bounds/defaults) and a backend helper that turns a Prisma `count` + page/limit into the `meta.pagination` object (`page`, `limit`, `total`, `totalPages`).
- Search/filter query convention: a documented pattern for how list endpoints accept `search` and per-entity filter query params, and how the backend composes them into a Prisma `where` clause — a pattern each Phase 3 module follows, not a generic query-builder abstraction (avoid over-engineering a filter DSL nothing but this project will use).
- Frontend API client: a thin `fetch`-based wrapper (`src/lib/api-client.ts`) that prefixes `VITE_API_BASE_URL`, attaches the auth header once FLO-011 exists (a hook point left ready, not implemented here), parses the shared envelope, and throws a typed error the UI can catch — paired with TanStack Query installed and a `QueryClientProvider` wired into the app root.
- Demonstrated end-to-end against the `/health` route: frontend calls it through the API client and renders the result, proving the envelope/client work together before any real entity exists.

**Excluded:**

- Any entity-specific schema (customer, product, challan, PO, user) — each is authored inside its owning Phase 3 spec, but _placed in_ `packages/shared` and following the conventions this spec defines.
- Auth token attachment logic itself (FLO-011) — this spec leaves the extension point (a single function the client calls to get the current token) but does not implement auth.

## Acceptance Criteria

- [ ] Both `backend` and `frontend` import the same `PaginationQuery` schema and envelope types from `packages/shared` with no duplicated type definitions.
- [ ] A backend list-style demo endpoint (can reuse/extend the FLO-007 throwaway route) returns the exact envelope shape `{ data: [...], meta: { pagination: {...} } }`, validated by a backend test asserting the shape.
- [ ] The frontend API client successfully calls the backend `/health` endpoint (through the full envelope) and the returned data renders on screen, confirmed manually in the browser and via a frontend test mocking the fetch call.
- [ ] Changing a shared schema's shape in `packages/shared` and running `tsc` in both `backend` and `frontend` immediately surfaces a type error in any code that assumed the old shape — proving the type-sharing is real, not just structurally coincidental.
- [ ] The documented search/filter convention is written down clearly enough that FLO-012 (the first module to need customer search) can follow it without inventing a new pattern.
- [ ] API client errors (a simulated 4xx/5xx from the backend) surface as a typed, catchable error on the frontend rather than an unhandled promise rejection.

## Technical Tasks

1. Set up `packages/shared` as a proper TypeScript package: `src/index.ts`, build config, and confirm both `backend` and `frontend` can `import { ... } from "@flowerp/shared"` (or the chosen package name) in dev mode without a manual build step blocking hot reload (TS project references or a watch build, whichever fits the Vite/ts-node-dev setup already in place).
2. Define envelope types/helpers in `src/http/envelope.ts` (success) — pairs conceptually with FLO-007's error shape, which can also be re-exported from here for a single import path on the frontend.
3. Define `PaginationQuery` Zod schema and a backend `paginate()`/`buildPaginationMeta()` helper in `src/http/pagination.ts` (or split shared type + backend-only helper appropriately if the helper needs Prisma-aware logic that shouldn't ship to the frontend bundle).
4. Write the short search/filter convention doc (e.g., `packages/shared/CONVENTIONS.md`): how list endpoints name filter params, how backend controllers translate them to a Prisma `where`.
5. Build the frontend `api-client.ts`: base URL from env, JSON handling, envelope unwrapping, typed error throwing, an exposed (currently no-op) `getAuthToken()` hook point.
6. Install and wire TanStack Query (`QueryClientProvider`) at the frontend app root.
7. Extend the demo route/page from FLO-007 to prove the full loop (paginated demo list → envelope → client → render), then remove or clearly mark demo-only code before merge.

## Dependencies

FLO-002, FLO-003, FLO-007.

## Implementation Notes

- Resist building a generic, reusable "filter builder" abstraction — the assignment needs search/filter on a handful of list endpoints, not a query DSL. Document the pattern (e.g., "list endpoints accept `search`, plus documented filter keys per entity, translated directly to a Prisma `where` in the service layer") and let each module apply it directly.
- The reason entity schemas live in `packages/shared` rather than only in `backend`: the frontend needs the _same_ Zod schema (or its inferred type) for client-side form validation in Phase 3, so authoring it once, in the shared package, and importing it from both sides is what actually prevents drift — duplicating a "backend schema" and a "frontend type" would recreate the exact problem this spec exists to prevent.
- TanStack Query is introduced here (not FLO-003) specifically because it needs something real to fetch — introducing it before the API client and envelope existed would mean configuring it against nothing.
