# FLO-006 — Testing Infrastructure & Conventions

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Establish the unit/integration testing stack for both `backend` and `frontend` — Vitest as the common test runner, Supertest for backend HTTP-level tests, React Testing Library for frontend component tests — plus coverage thresholds and one real example test per package proving the pipeline works end-to-end. Landing this before Phase 3 means every business-module spec writes tests against an already-working harness instead of configuring test tooling ad hoc mid-feature.

## User Story

As a developer implementing a business module, I want a working test runner and clear conventions already in place, so that I can write unit and integration tests for my module from the first commit instead of setting up test infrastructure myself.

## Scope

**Included:**

- Vitest configured in `backend` (Node environment) and `frontend` (jsdom environment), each with its own `vitest.config.ts`.
- `supertest` added to `backend` for HTTP-level route testing against the exported Express `app` (from FLO-002's `app.ts`/`server.ts` split).
- React Testing Library + `@testing-library/jest-dom` matchers added to `frontend`.
- Coverage reporting enabled (`v8` provider) with a documented minimum threshold (e.g., 70% lines) that fails the run if unmet — deliberately not 100%, to avoid incentivizing hollow tests.
- One real example test per package: a backend test hitting `GET /health` via Supertest, a frontend test rendering the app shell and asserting the not-found route renders for an unknown path.
- Root `npm run test` / `npm run test:coverage` fanning out to both workspaces.
- A short testing-conventions doc (co-located, e.g., `backend/TESTING.md` / `frontend/TESTING.md`, or a section in the root repo-map from FLO-001): file naming (`*.test.ts` / `*.test.tsx`, colocated with source), what "unit" vs "integration" means in this repo (service-layer tests mock the DB client; route-level tests use Supertest against a test database — test DB strategy is finalized when FLO-011 introduces the first real data-backed routes, this spec only proves the runner works).

**Excluded:**

- End-to-end/browser automation testing (not required by the assignment; not introduced anywhere in this roadmap unless a future need arises).
- Actual business-logic tests for auth/customers/products/etc. — those belong to their owning spec (FLO-011 onward) and must meet the coverage threshold set here.
- Test-database provisioning/seeding strategy for integration tests against Prisma — established when the first spec needing it (FLO-011) writes real data-backed tests; this spec's example tests don't touch the database.

## Acceptance Criteria

- [ ] `npm run test -w backend` runs and passes the example `/health` Supertest test.
- [ ] `npm run test -w frontend` runs and passes the example app-shell/not-found test using React Testing Library.
- [ ] `npm run test:coverage` at root produces a coverage report for both packages and fails the command if coverage drops below the configured threshold (verified by temporarily lowering it or by removing the example test and observing failure).
- [ ] Test files are colocated with the source they test (e.g., `health.controller.test.ts` next to `health.controller.ts`), not in a parallel `__tests__` tree — confirmed by the example tests' locations.
- [ ] Root `npm run test` runs both workspaces' suites with a single command and a single non-zero exit code if either fails.
- [ ] CI-friendliness: tests run headlessly with no manual interaction and exit cleanly (no hanging watch mode) when invoked via the non-watch script.

## Technical Tasks

1. Install `vitest` in `backend` and `frontend`; add `vitest.config.ts` to each (Node env for backend, jsdom + `@testing-library/jest-dom` setup file for frontend).
2. Install `supertest` + `@types/supertest` in `backend`; write the `/health` integration test importing the exported `app`.
3. Install `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` in `frontend`; write the app-shell/not-found example test.
4. Configure coverage (`test.coverage` block in each `vitest.config.ts`) with the `v8` provider and the agreed threshold; wire a `test:coverage` script.
5. Add root `test`/`test:coverage`/`test:watch` scripts fanning out across workspaces.
6. Write the short testing-conventions note covering file naming/location and the unit-vs-integration distinction for this repo.

## Dependencies

FLO-002, FLO-003, FLO-005.

## Implementation Notes

- Vitest is used for both packages (not Jest for backend, Vitest for frontend) so there's exactly one test API/config shape to learn and one coverage tool across the repo — consistency over per-package "best fit" tooling debates, since Vitest handles a plain Node Express backend perfectly well.
- The coverage threshold is a floor, not a target — don't let it become the reason a module ships thin, tautological tests. Acceptance criteria on each Phase 3 spec should drive what gets tested, not the percentage.
- Test-database strategy (a real ephemeral Postgres for integration tests vs. mocking Prisma) is explicitly deferred to FLO-011, the first spec that actually needs to test data-backed routes — deciding it here, before any real schema-backed route exists, would be guessing ahead of the need.
