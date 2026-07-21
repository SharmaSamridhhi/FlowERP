# FLO-011 — Authentication & Role-Based Access Control

**Phase:** 3 — Core Business Modules

**Status:**

- [ ] Not Started
- [ ] Completed

## Description

Implement the assignment's first required core module: login with JWT-based authentication and four roles (Admin, Sales, Warehouse, Accounts). This spec delivers the `User` data access layer, password hashing, login/me endpoints, a backend RBAC middleware (route-level role guards), and the frontend login screen, auth context, protected-route wrapper, and role-aware sidebar navigation. Every subsequent Phase 3 module depends on this — it's the first spec allowed to touch real business data end-to-end, and it's what makes "protected" meaningful for every module after it.

## User Story

As an internal employee (Admin, Sales, Warehouse, or Accounts), I want to log in and see only the parts of the system my role permits, so that the portal enforces the same access boundaries the business actually has.

## Scope

**Included:**

- Backend: `POST /auth/login` (email + password → JWT + basic user profile), `GET /auth/me` (returns the current user from a valid token). Password hashing with `bcrypt`. JWT signed with a secret from env (FLO-018 formalizes env management; for now, reads `process.env.JWT_SECRET` directly per FLO-002's config module pattern), reasonable expiry (e.g., 8h, documented).
- Backend: `authenticate` middleware (verifies JWT, attaches `req.user`) and `authorize(...roles)` middleware factory (403s if `req.user.role` isn't in the allowed list) — both live in `src/middlewares` per FLO-002's layout and are what every later module's routes import.
- Backend: seed script (extending FLO-004's `prisma/seed.ts` stub) creating one demo user per role with known credentials, documented in this module's implementation notes and later surfaced in FLO-021's submission package.
- Zod schemas for login request/response in `packages/shared` per FLO-008's convention.
- Frontend: `LoginPage` (using `AuthLayoutTemplate` from FLO-009), an `AuthContext`/hook storing the current user + token in memory, a `ProtectedRoute` wrapper redirecting unauthenticated users to `/login`, and wiring the FLO-008 API client's `getAuthToken()` hook point to this context.
- Frontend: `AppSidebar` (from FLO-009) now receives real, role-filtered nav items and a working logout action.
- Route-level role restrictions matching the assignment's role list are decided and documented per module as those modules are built (e.g., "who can confirm a challan" is FLO-015's decision) — this spec provides the _mechanism_ (`authorize(...)`), not every future policy decision.

**Excluded:**

- User self-registration or password reset flows (not required by the assignment; Admin-created/seeded users are sufficient for an internal tool).
- Per-field/per-action fine-grained permissions beyond role-level route guarding (the assignment asks for role-based access, not a full permissions matrix).
- Refresh-token rotation (a single reasonably-short-lived access token is the documented, deliberate choice — see Implementation Notes).

## Acceptance Criteria

- [ ] `POST /auth/login` with valid seeded credentials for each of the four roles returns `200` with a JWT and user profile (id, name, email, role) — no password hash in the response.
- [ ] `POST /auth/login` with wrong credentials returns `401` with a clear error message via the FLO-007 error pattern, not a generic 500.
- [ ] `GET /auth/me` with a valid token returns the current user; with no/invalid/expired token returns `401`.
- [ ] A route protected by `authorize("ADMIN")` returns `403` for a valid but wrong-role token, and succeeds for an Admin token — proven with a dedicated test route or the first real protected route this spec introduces.
- [ ] Passwords are stored hashed (`bcrypt`), never in plaintext — verified by inspecting a seeded user row.
- [ ] Frontend: submitting the login form with valid credentials redirects to the app shell and the sidebar shows nav items appropriate to that user's role; invalid credentials show an inline error without navigating away.
- [ ] Frontend: navigating directly to a protected route while logged out redirects to `/login`; after login, the user lands back on (or reasonably near) the originally requested route.
- [ ] Logout clears the in-memory session and subsequent navigation to a protected route redirects to `/login`.
- [ ] Backend and frontend both build and pass lint/type-check/tests per the FLO-010 CI pipeline.

## Technical Tasks

1. Add `bcrypt` and `jsonwebtoken` to `backend`.
2. Implement `UserService` (find by email, verify password) and `AuthService` (issue JWT, verify JWT) in `src/services`.
3. Implement `POST /auth/login` and `GET /auth/me` controllers/routes, validated via FLO-007's `validateRequest` with a Zod schema from `packages/shared`.
4. Implement `authenticate` and `authorize(...roles: Role[])` middlewares; throw `UnauthorizedError`/`ForbiddenError` (FLO-007) rather than hand-rolling responses.
5. Extend `prisma/seed.ts` to upsert one user per role with a documented seed password (e.g., via an env-overridable default, never a hardcoded production secret).
6. Add login/user Zod schemas to `packages/shared/src/schemas/auth.schema.ts` and `user.schema.ts`.
7. Build `LoginPage`, `AuthContext`/`useAuth` hook, `ProtectedRoute`, wire logout, connect `AppSidebar`'s role-filtered nav items to the real authenticated user.
8. Wire the FLO-008 API client's `getAuthToken()` hook point to read the token from `AuthContext`/its backing store.
9. Write backend tests (login success/failure, `/me`, middleware 401/403 behavior) and frontend tests (login form validation/submit, protected-route redirect behavior).

## Dependencies

FLO-004, FLO-007, FLO-008, FLO-009, FLO-010.

## Implementation Notes

- Token storage: kept in memory (React context/state), not `localStorage`, to avoid persistent XSS-exfiltrable tokens; the tradeoff is the session doesn't survive a hard page refresh without a re-login. This is an acceptable, documented tradeoff for an internal tool at this scope — call it out explicitly in FLO-021's "known limitations" section rather than solving it with refresh-token infrastructure the assignment doesn't ask for.
- This is the first spec to write real integration tests against the Prisma-backed database; decide here (and document in `backend/TESTING.md` per FLO-006) whether integration tests run against a real local/CI Postgres instance or a test-specific schema — do not mock Prisma for these tests, since auth correctness (hashing, token issuance) is exactly the kind of logic that's dangerous to test only against mocks.
- Seed credentials must be safe to publish (per FLO-021's submission requirement for "test login credentials for all roles") — don't reuse them as anything resembling a real production secret.
