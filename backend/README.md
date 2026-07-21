# @flowerp/backend

Node.js + TypeScript + Express REST API. PostgreSQL via Prisma arrives in [FLO-004](../specs/FLO-004-database-schema-foundation.md).

## Layering

Requests flow one direction: `routes` → `controllers` → `services`.

- `src/routes/` — Express `Router` instances. Map an HTTP method + path to a controller function. No logic beyond wiring.
- `src/controllers/` — Read the request, call into a service, shape the HTTP response (status code, body). No business logic and no direct database access.
- `src/services/` — Business logic and data access. Framework-agnostic (no `Request`/`Response` types in here). Populated starting with [FLO-011](../specs/FLO-011-auth-rbac.md), once there's real data to operate on.
- `src/middlewares/` — Express middleware (auth guards, validation, error handling).
- `src/config/` — Environment/config loading.
- `src/utils/` — Small framework-agnostic helpers shared across services/controllers. Populated as modules need it.
- `src/types/` — Shared TypeScript types that don't belong in `@flowerp/shared` (i.e., backend-internal only). Populated as modules need it.

`src/app.ts` builds and exports the configured Express app (middleware, routes, error handling) without starting a server. `src/server.ts` imports that app and calls `.listen()`. This split exists so integration tests (FLO-006) can import `app` directly with Supertest, without binding a real port.

## Scripts

- `npm run dev -w backend` — start the server in watch mode.
- `npm run build -w backend` — type-check and compile to `dist/`.
- `npm run start -w backend` — run the compiled server from `dist/`.
- `npm run type-check -w backend` — type-check without emitting output.

## Environment variables

- `PORT` — port the server listens on. Defaults to `4000`.
- `NODE_ENV` — `development` | `production` | `test`. Defaults to `development`.

Formal validation and `.env` file conventions arrive in [FLO-018](../specs/FLO-018-env-config-secrets.md).
