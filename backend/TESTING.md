# Testing (backend)

Vitest, run against a real Node environment (not jsdom).

## Conventions

- Test files are colocated with the source they test, named `*.test.ts` — e.g. `src/controllers/health.controller.test.ts` sits next to `src/controllers/health.controller.ts`. No parallel `__tests__` tree.
- **Unit tests** exercise a single function/module in isolation (e.g. `src/config/env.test.ts`, `src/middlewares/error-handler.middleware.test.ts`). Once the service layer exists (starting [FLO-011](../specs/FLO-011-auth-rbac.md)), unit tests for services mock the Prisma client rather than hitting a real database.
- **Integration tests** exercise the app end-to-end through Supertest against the exported `app` from `src/app.ts` (never a real `.listen()`'d server) — e.g. `src/controllers/health.controller.test.ts`. Once real data-backed routes exist, these run against a real test database; that strategy (ephemeral test DB vs. schema-per-run, etc.) is decided in FLO-011, the first spec that needs it — this file doesn't prescribe it ahead of time.

## Running tests

- `npm run test -w backend` — run once, exit (CI-safe, no watch mode).
- `npm run test:watch -w backend` — watch mode for local development.
- `npm run test:coverage -w backend` — run with coverage; fails if any metric drops below the threshold below.

## Coverage

`v8` provider, threshold: 70% lines/statements/functions/branches. This is a floor, not a target — write tests because they verify real behavior (a fallback actually falls back, a guard actually guards), not to chase the percentage. See [FLO-006](../specs/FLO-006-testing-infrastructure.md) for the full rationale.
