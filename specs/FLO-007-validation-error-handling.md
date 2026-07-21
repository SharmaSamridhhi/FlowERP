# FLO-007 — Runtime Validation & Centralized Error Handling

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Introduce Zod as the mandatory runtime validation layer on the backend, a request-validation middleware pattern that validates `body`/`query`/`params` against a Zod schema before a controller ever runs, a typed custom error hierarchy (`AppError` and subclasses like `NotFoundError`, `ValidationError`, `ConflictError`), and a single centralized Express error-handling middleware that turns any thrown error into a consistent JSON error response with the correct HTTP status code. Every Phase 3 route is built on top of this from its first commit.

## User Story

As a backend developer building a business module, I want a standard way to validate incoming requests and a standard way for errors to become HTTP responses, so that every endpoint in the system behaves consistently and I never hand-write ad hoc `res.status(400).json(...)` logic per route.

## Scope

**Included:**
- `AppError` base class (message, HTTP status code, optional machine-readable error code) and a small set of subclasses covering the cases the assignment explicitly calls out: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409) — used, for example, by the insufficient-stock case in Sales Challan (FLO-015).
- A `validateRequest(schema)` middleware factory taking a Zod schema (shaped as `{ body?, query?, params? }`) that parses the request, attaches the parsed/typed result, and calls `next(new ValidationError(...))` with field-level details on failure.
- A centralized error-handling Express middleware (registered last) that: recognizes `AppError` instances and responds with their status/message/code; recognizes raw Zod errors and Prisma known-error codes as a fallback and maps them to appropriate statuses; treats anything unrecognized as a 500 and logs it server-side without leaking internals to the client.
- A consistent error JSON shape, e.g. `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`, documented so FLO-008's shared response envelope can build on it.
- Applied and proven against the `/health` route or a small throwaway demo route with a query-param schema — not against real business routes, which don't exist yet.

**Excluded:**
- The success-response envelope shape and pagination helpers (FLO-008) — this spec owns *errors*, FLO-008 owns the *happy-path* envelope and query utilities, and they compose together.
- Any actual business validation schemas (customer, product, challan, PO) — those are authored by their owning Phase 3 spec, using the pattern this spec establishes.
- Frontend error handling/toast display — that's part of the shared API client in FLO-008 and consumed per-screen in Phase 3 frontends.

## Acceptance Criteria

- [ ] A route protected by `validateRequest` rejects a malformed request with `400` and a body listing which field(s) failed and why.
- [ ] A route protected by `validateRequest` passes a valid request through to the controller with a fully-typed, parsed object (no manual re-parsing of `req.body` needed in the controller).
- [ ] Throwing `new NotFoundError("Customer not found")` anywhere downstream of a controller results in a `404` response with that message, without the controller writing any response-handling code itself.
- [ ] An unhandled/unexpected exception (e.g., a thrown plain `Error`) is caught by the centralized handler, results in a `500` with a generic message (no stack trace or internal details in the response body), and is logged server-side.
- [ ] All error responses share one consistent JSON shape, verified across at least three different error types (validation, not-found, unhandled).
- [ ] Prisma unique-constraint violations (e.g., duplicate SKU) are recognized and surfaced as `409 Conflict` with a clear message, not a raw 500.

## Technical Tasks

1. Install `zod` in `backend` (and confirm it's also available to `packages/shared` for FLO-008 to re-export schemas from there later).
2. Implement the `AppError` hierarchy in `src/utils/errors.ts` (or `src/errors/`).
3. Implement `validateRequest(schema)` in `src/middlewares/validate.ts`, merging parsed `body`/`query`/`params` onto the request object in a typed way (e.g., augmenting `Request` via declaration merging, or attaching to `req.validated`).
4. Implement the centralized error middleware in `src/middlewares/error-handler.ts`; register it last in `app.ts`.
5. Map known Prisma error codes (e.g., `P2002` unique violation, `P2025` record not found) to the appropriate `AppError` subclass inside the handler or a small adapter function.
6. Add a structured server-side logger call (can be `console.error` with structured fields for now; a full logging library isn't required by the assignment) inside the 500 branch.
7. Write a throwaway demo route (removed before merge, or kept as a documented example route) exercising validation success, validation failure, a thrown `AppError`, and an unhandled error, with tests using FLO-006's Supertest setup.

## Dependencies

FLO-002, FLO-004.

## Implementation Notes

- Depends on FLO-004 because Prisma's client and its known error-code shapes need to exist for the Prisma-error-mapping branch of the handler to be written and tested meaningfully, even though this spec doesn't touch business tables.
- Keep `AppError` subclasses minimal and named after HTTP semantics (Not Found, Conflict, Forbidden), not business terms (`InsufficientStockError` belongs to FLO-015, which can subclass `ConflictError` or throw a `ConflictError` directly with a specific message — don't pre-invent every business error case here).
- This is the one place `any`/unchecked casts around Prisma error shapes are acceptable if narrowly scoped and commented, since Prisma's error typing for `PrismaClientKnownRequestError.meta` is intentionally loose.
