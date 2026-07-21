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

Copy `.env.example` to `.env` and fill in real (local-dev, non-secret) values — `.env` is gitignored. Every variable is parsed through a Zod schema in `src/config/env.ts` at process startup (see [FLO-018](../specs/FLO-018-env-config-secrets.md)): a missing or malformed required variable fails immediately with a message naming exactly which one, instead of a confusing error later.

| Variable             | Required                                 | Purpose                                                                                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | No — defaults to `4000`                  | Port the server listens on.                                                                                                                                                                                                                                                                                    |
| `NODE_ENV`           | No — defaults to `development`           | `development` \| `test` \| `production`.                                                                                                                                                                                                                                                                       |
| `DATABASE_URL`       | **Yes**                                  | PostgreSQL connection string, read by both Prisma (`prisma.config.ts`) and the app's own config. **Must be set before running `npm install`**, not just before migrating — `postinstall` runs `prisma generate`, which needs a syntactically valid value even though `generate` never actually connects to it. |
| `TEST_DATABASE_URL`  | Only to run tests                        | Separate database used exclusively by the test suite (see [TESTING.md](TESTING.md)) — never the same as `DATABASE_URL`.                                                                                                                                                                                        |
| `JWT_SECRET`         | **Yes**                                  | Signs/verifies auth JWTs. Must be at least 16 characters. Never share or commit the real value — anyone with it can forge valid auth tokens.                                                                                                                                                                   |
| `JWT_EXPIRES_IN`     | No — defaults to `8h`                    | How long an issued JWT stays valid.                                                                                                                                                                                                                                                                            |
| `CORS_ORIGIN`        | No — defaults to `http://localhost:5173` | The single origin allowed to make cross-origin requests to this API (the frontend's dev/deployed URL). Set to the real frontend origin in any deployed environment.                                                                                                                                            |
| `SEED_USER_PASSWORD` | No — defaults to a publishable value     | Password for all demo users created by `prisma/seed.ts`. The default (`FlowERP123!`) is deliberately safe to publish (see [FLO-021](../specs/FLO-021-documentation-submission.md)) — never treat it as a real secret.                                                                                          |

Backend secrets (`JWT_SECRET`, `DATABASE_URL`) never have a `VITE_`-prefixed equivalent — anything prefixed `VITE_` is, by Vite's own design, bundled into client-shipped code (see `frontend/.env.example`).

## Database (Prisma + PostgreSQL)

Schema is split by business domain under `prisma/schema/` (`base.prisma` holds the `generator`/`datasource` blocks; one file per domain — `user`, `customer`, `product`, `stock-movement`, `sales-challan`, `purchase-order` — Prisma merges them into one logical schema, and cross-file relations work without any import syntax). Prisma CLI config (schema path, migrations path, seed command) lives in `prisma.config.ts`, per Prisma's current config-as-code convention.

- `npx prisma migrate dev --name <name>` (run from `backend/`) — create and apply a migration.
- `npx prisma db seed` — run `prisma/seed.ts`.
- `npx prisma generate` — regenerate the typed client into `src/generated/prisma` (gitignored; regenerated on install/migrate, not committed).
- `npx prisma studio` — browse the local database.

**Version note:** pinned to `prisma`/`@prisma/client` `6.19.3` rather than the current `7.x` latest, because Prisma 7 requires Node ≥22 and this project is pinned to Node 20.19.0 (see [FLO-001](../specs/FLO-001-monorepo-foundation.md)'s `.nvmrc`). 6.19.3 is the newest release supporting Node ≥18.18.

Full entity model, relation/`onDelete` rationale, and the snapshot-on-line-items design are documented in [FLO-004](../specs/FLO-004-database-schema-foundation.md).

## Testing

See [TESTING.md](TESTING.md) for conventions, how to run tests, and the coverage threshold.
