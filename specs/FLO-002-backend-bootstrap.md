# FLO-002 — Backend Service Bootstrap

**Phase:** 1 — Project Foundation

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Stand up the backend application skeleton in the `backend/` workspace: Express.js on Node.js with TypeScript, a layered folder structure (routes/controllers/services), strict TS compiler config, a config-loading module, and a single working health-check endpoint. This is plumbing only — no business entities, no auth, no validation framework (those are later specs) — the goal is a backend that boots, responds to one request, and has a folder structure every later module slots into without restructuring.

## User Story

As a backend developer, I want a running Express + TypeScript server with a clear layered structure, so that I can add real modules (auth, customers, products, etc.) into an established pattern instead of inventing structure per-feature.

## Scope

**Included:**

- Express.js + TypeScript project in `backend/`, with `tsconfig.json` (strict mode on).
- Folder structure: `src/config`, `src/routes`, `src/controllers`, `src/services`, `src/middlewares`, `src/utils`, `src/types`, with a short README comment or doc explaining the layering (route → controller → service).
- A config module that loads environment variables (via `process.env`, no validation yet — validation arrives in FLO-007) with sane local defaults for `PORT`, `NODE_ENV`.
- `GET /health` endpoint returning `{ status: "ok" }` with 200.
- Dev script (`ts-node-dev` or `tsx` watch mode) and a `build`/`start` script (`tsc` → `node dist/...`).
- Base Express app wiring: JSON body parsing, CORS (permissive for local dev), a request logger (e.g., `morgan` in dev mode), and a not-found (404) fallback handler.

**Excluded:**

- Database connection (FLO-004).
- Any validation middleware or Zod usage (FLO-007).
- Any real route beyond `/health` (all business modules are Phase 3).
- Centralized error-handling middleware design (FLO-007) — a minimal Express default error handler is enough for now.

## Acceptance Criteria

- [ ] `npm run dev -w backend` starts the server and `GET /health` returns `200 { "status": "ok" }`.
- [ ] `npm run build -w backend && npm run start -w backend` produces and runs compiled JS from `dist/`.
- [ ] `tsconfig.json` has `"strict": true`; a deliberately introduced type error fails `tsc --noEmit`.
- [ ] Folder structure matches the layered convention (`config/routes/controllers/services/middlewares/utils/types`) and is documented in a short `backend/README.md` or inline doc comment.
- [ ] Requesting an undefined route returns a 404 JSON body, not an HTML stack trace.
- [ ] Server reads `PORT` from the environment and falls back to a documented default if unset.

## Technical Tasks

1. `npm init` the `backend` workspace, add Express, TypeScript, `@types/node`, `@types/express`, `ts-node-dev` (or `tsx`), `cors`, `morgan`.
2. Configure `tsconfig.json`: `target` ES2020+, `module` matching the runtime, `strict: true`, `outDir: dist`, `rootDir: src`.
3. Create the folder skeleton with one illustrative file per layer where useful (e.g., `src/routes/health.route.ts`, `src/controllers/health.controller.ts`) to demonstrate the pattern.
4. Implement `src/config/env.ts` reading `PORT`/`NODE_ENV` from `process.env` with defaults.
5. Wire `src/app.ts` (Express app + middleware) separately from `src/server.ts` (the `listen()` call) so the app instance is importable by tests later (FLO-006) without binding a port.
6. Implement the health route/controller and the 404 fallback.
7. Add `dev`, `build`, `start` scripts to `backend/package.json`.

## Dependencies

FLO-001.

## Implementation Notes

- Splitting `app.ts` (exportable Express instance) from `server.ts` (the thing that actually calls `.listen()`) is a deliberate choice made now so that FLO-006's Supertest-based integration tests can import `app` without starting a real network listener.
- Do not add a database client, ORM import, or `.env` file parsing library yet — those belong to FLO-004 and FLO-007/FLO-018 respectively. Keep this spec's surface area to "the server boots and answers one request."
- CORS can be wide-open (`origin: true`) for now since there's no deployed frontend origin yet; FLO-018/FLO-020 will tighten it per environment.
