# @flowerp/frontend

React + TypeScript SPA (Vite, Tailwind CSS). See [FLO-003](../specs/FLO-003-frontend-bootstrap.md).

## Environment variables

Copy `.env.example` to `.env` and fill in real (local-dev, non-secret) values — `.env` is gitignored. Every variable is parsed through a Zod schema in `src/config/env.ts` when the app boots (see [FLO-018](../specs/FLO-018-env-config-secrets.md)); a malformed value renders a visible configuration-error screen instead of silently falling back to a wrong one — a Vite app can't refuse to boot the way a Node process can, so this is the closest equivalent.

| Variable            | Required                                 | Purpose                                                                          |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | No — defaults to `http://localhost:4000` | Base URL of the backend API this app talks to. Must be a well-formed URL if set. |

Every variable read by frontend code **must** be prefixed `VITE_` — that's the only prefix Vite exposes to client code — and, by the same rule, must **never** hold a secret: anything prefixed `VITE_` is bundled into the JavaScript shipped to the browser. Backend secrets (`JWT_SECRET`, `DATABASE_URL`) are never given a `VITE_`-prefixed equivalent (see `backend/.env.example`).

## Testing

See [TESTING.md](TESTING.md) for conventions, how to run tests, and the coverage threshold.
