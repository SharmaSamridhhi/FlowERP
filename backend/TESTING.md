# Testing (backend)

Vitest, run against a real Node environment (not jsdom).

## Conventions

- Test files are colocated with the source they test, named `*.test.ts` — e.g. `src/controllers/health.controller.test.ts` sits next to `src/controllers/health.controller.ts`. No parallel `__tests__` tree.
- **Unit tests** exercise a single function/module in isolation with mocked `req`/`res`/`next` (e.g. `src/config/env.test.ts`, `src/middlewares/authenticate.middleware.test.ts`, `src/middlewares/authorize.middleware.test.ts`). Prisma itself is never mocked (see below) — a unit test for a service that queries the database is really an integration test and belongs with the others.
- **Integration tests** exercise the app end-to-end through Supertest against the exported `app` from `src/app.ts` (never a real `.listen()`'d server) — e.g. `src/routes/auth.route.test.ts`. Routes that touch the database run against a **real, separate Postgres database** (`flowerp_test` locally, an ephemeral service container in CI), never mocked and never the dev database — decided in [FLO-011](../specs/FLO-011-auth-rbac.md), the first spec with data-backed routes to test. Auth correctness (hashing, token issuance) is exactly the kind of logic a mock would hide bugs in.
  - Local setup: `createdb flowerp_test` (or `psql -c "CREATE DATABASE flowerp_test;"`), then `DATABASE_URL=<flowerp_test connection string> npx prisma migrate deploy` to apply the schema. Set `TEST_DATABASE_URL` in `backend/.env` — `vitest.config.ts` overrides `DATABASE_URL` to this value for the test process only, so `npm run dev` and `npm run test` never touch the same database.
  - Tests that need seeded rows create and clean up their own data (`beforeAll`/`afterAll` in the test file, not a shared fixture) — this keeps each test file reproducible without depending on `prisma/seed.ts` having been run first, and keeps `flowerp_test` empty between runs.
  - CI provisions a `postgres:16` service container and runs `prisma migrate deploy` against it before tests — see `.github/workflows/ci.yml`.

## Running tests

- `npm run test -w backend` — run once, exit (CI-safe, no watch mode).
- `npm run test:watch -w backend` — watch mode for local development.
- `npm run test:coverage -w backend` — run with coverage; fails if any metric drops below the threshold below.

## Coverage

`v8` provider, threshold: 70% lines/statements/functions/branches. This is a floor, not a target — write tests because they verify real behavior (a fallback actually falls back, a guard actually guards), not to chase the percentage. See [FLO-006](../specs/FLO-006-testing-infrastructure.md) for the full rationale.
