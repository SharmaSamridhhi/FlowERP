# FLO-018 — Environment Configuration & Secrets Management

**Phase:** 4 — Deployment & Release Readiness

**Status:**

- [ ] Not Started
- [ ] Completed

## Description

Formalize environment variable management across `backend` and `frontend`: Zod-validated env schemas that fail fast on a missing/malformed variable at startup, `.env.example` files documenting every variable, and a consistent convention for what's a secret vs. what's safe to expose to the frontend bundle. Earlier specs (FLO-002, FLO-003, FLO-011) read `process.env`/`import.meta.env` directly with informal defaults — this spec replaces those informal reads with the validated pattern and is the foundation FLO-019 (Docker) and FLO-020 (hosting) both configure environments against.

## User Story

As a developer setting up or deploying this project, I want every required environment variable documented and validated at startup, so that a missing or malformed config value fails immediately and obviously instead of causing a confusing runtime error later.

## Scope

**Included:**

- Backend: `src/config/env.ts` rewritten (from FLO-002's informal version) to parse `process.env` through a Zod schema (`PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, and any variable introduced by earlier specs) at process startup; on failure, logs exactly which variable(s) are missing/invalid and exits non-zero rather than continuing with `undefined`.
- Frontend: equivalent validated read of `import.meta.env` variables (`VITE_API_BASE_URL` at minimum), failing loudly (a visible error state, since a Vite app can't literally refuse to boot the same way a Node process can) rather than silently falling back.
- `backend/.env.example` and `frontend/.env.example` committed, listing every variable with a comment explaining its purpose and an example (non-secret) value; real `.env` files remain gitignored per FLO-001.
- A documented convention: backend secrets (JWT secret, DB credentials) never have a `VITE_`-prefixed equivalent exposed to the frontend; anything prefixed `VITE_` is, by Vite's own design, bundled into client-shipped code and must never hold a secret.
- CORS origin becomes environment-driven (`CORS_ORIGIN`) rather than the FLO-002 wide-open default, with the local-dev default documented in `.env.example`.
- A short "Environment Variables" doc section (feeding directly into FLO-021's README) listing every variable, whether it's required, and its purpose.

**Excluded:**

- Actually provisioning secrets in a hosting provider's dashboard (FLO-020) — this spec defines _what_ variables exist and how they're validated, not where production values are stored.
- Any secrets-manager integration (AWS Secrets Manager, etc.) — out of scope for a project of this size; plain environment variables (as the assignment itself asks for: "Environment variables should be used") are sufficient.

## Acceptance Criteria

- [ ] Starting the backend with a required variable unset (e.g., unset `JWT_SECRET`) fails immediately at startup with a clear message naming the missing variable, not a downstream error when auth is first used.
- [ ] Starting the backend with all required variables set (matching `.env.example`'s shape) boots successfully.
- [ ] `backend/.env.example` and `frontend/.env.example` exist, are committed, and list every variable actually consumed by the respective app (cross-checked against real usage, not just aspirational).
- [ ] No secret value (JWT secret, DB connection string with credentials) is referenced anywhere with a `VITE_` prefix or otherwise reachable from frontend code — verified by grepping the frontend source and build output for the secret's env var name.
- [ ] Backend CORS now rejects (or the assignment-appropriate equivalent — reads from `CORS_ORIGIN`) requests from an origin not matching the configured value in a non-permissive environment, verified by a test or manual check with a mismatched `Origin` header.
- [ ] Existing FLO-002/FLO-011 code that previously read `process.env`/`import.meta.env` directly is updated to go through the new validated config module — no leftover direct `process.env.X` reads outside `src/config/env.ts`.

## Technical Tasks

1. Define the backend env Zod schema in `src/config/env.ts`, parsing `process.env` once at import time; export a typed, frozen config object for the rest of the app to import instead of touching `process.env` directly.
2. Define the frontend env validation in `src/config/env.ts` (or equivalent), parsing `import.meta.env` at app bootstrap; surface a clear boot-time error UI if validation fails.
3. Write `backend/.env.example` and `frontend/.env.example`, one line per variable with a comment.
4. Update `app.ts`'s CORS middleware to read `CORS_ORIGIN` from the new config module.
5. Grep the codebase for direct `process.env`/`import.meta.env` reads outside the two config modules and migrate them.
6. Grep the frontend source/build output to confirm no secret-named variable leaks into client code.
7. Draft the "Environment Variables" documentation section for later inclusion in FLO-021's README.

## Dependencies

FLO-002, FLO-003.

## Implementation Notes

- This spec is sequenced in Phase 4, not earlier, because it's specifically about _production readiness_ of configuration (fail-fast validation, documented `.env.example`, secret/non-secret boundary) — the informal env reads FLO-002/003/011 used were adequate for local development during Phase 3 and don't need to block feature work; formalizing them now, right before Docker/deployment specs need a settled env contract to configure against, is the right sequencing.
- Reuse the FLO-007 Zod-validation pattern conceptually (schema → parse → typed result) even though this is startup-time config validation, not request validation — same tool, consistent mental model.
