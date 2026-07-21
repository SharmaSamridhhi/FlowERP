# FLO-019 — Docker Containerization & Compose Orchestration

**Phase:** 4 — Deployment & Release Readiness

## Description

Containerize the entire application: a `Dockerfile` for `backend`, a `Dockerfile` for `frontend`, and a root-level `docker-compose.yml` that orchestrates backend, frontend, and a PostgreSQL service so the whole system runs with a single command. This is treated as mandatory for this project regardless of the assignment listing Docker as a bonus. It's sequenced after FLO-018 specifically because a correct Compose setup needs a settled, validated environment-variable contract to wire into each service.

## User Story

As a developer (or reviewer) setting up this project, I want to run the entire stack — frontend, backend, and database — with one `docker compose up`, so that I don't need to manually install Node, PostgreSQL, or configure anything by hand to see the system working.

## Scope

**Included:**
- `backend/Dockerfile`: multi-stage build (a `build` stage running `npm ci` + `tsc`, a slim `runtime` stage copying only `dist/` and production `node_modules`), running as a non-root user, exposing the configured port, running Prisma migrations on container start (via an entrypoint script or a documented Compose `command` override) before starting the server.
- `frontend/Dockerfile`: multi-stage build (a `build` stage running `npm ci` + `vite build`, a slim `runtime` stage serving the static `dist/` output via a minimal static server such as `nginx` or `serve`).
- Root `docker-compose.yml` defining three services: `db` (official `postgres` image, named volume for data persistence, health check), `backend` (built from `backend/Dockerfile`, depends on `db` health check passing, reads env vars per FLO-018's contract — supplied via a root `.env` file referenced by Compose, consistent with `.env.example`), `frontend` (built from `frontend/Dockerfile`, depends on `backend`, `VITE_API_BASE_URL` pointed at the backend service).
- A root `.env.example` for Compose-level variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, ports), distinct from but consistent with `backend/.env.example`/`frontend/.env.example`.
- `docker-compose.yml` is usable for local development end-to-end: a fresh clone with only Docker installed can run `docker compose up --build` and reach a working, migrated, seeded (or seedable via a documented one-off command) application.
- `.dockerignore` for both `backend` and `frontend` (excluding `node_modules`, `.git`, `dist`, test files) to keep build contexts small and build cache effective.

**Excluded:**
- Any production-specific orchestration (Kubernetes, ECS task definitions, etc.) — Compose is the full extent of the containerization requirement for this project, per project instructions ("designed to run entirely through a root-level docker-compose.yml").
- Pushing built images to a registry (that's part of FLO-020/FLO-022 if the chosen hosting path uses container images at all — many of the assignment's suggested free hosts don't require it).

## Acceptance Criteria

- [ ] `docker compose up --build` from a clean checkout (only Docker installed, no local Node/Postgres) starts all three services successfully.
- [ ] After startup, database migrations have been applied automatically (verified by connecting to the `frontend` URL and confirming the login screen works against the containerized backend/DB, or via `docker compose exec backend npx prisma migrate status`).
- [ ] The frontend container serves the built app and successfully calls the backend container over the Compose network (not `localhost`, since these are separate containers) — verified by logging in through the browser against the fully containerized stack.
- [ ] Stopping and restarting the stack (`docker compose down` then `docker compose up`, without `-v`) preserves database data via the named volume.
- [ ] `backend/Dockerfile`'s runtime stage does not include dev dependencies, TypeScript source, or the build toolchain — verified by checking the final image's size/contents are meaningfully smaller than a naive single-stage build.
- [ ] Both Dockerfiles run their process as a non-root user.
- [ ] Root `docker-compose.yml` and both `.dockerignore` files are present and a build does not accidentally include `node_modules` or `.git` in its context (verified via `docker build` output showing a small context size, or inspecting the built image).

## Technical Tasks

1. Write `backend/Dockerfile` (multi-stage: `deps`/`build`/`runtime`), including a migration step at container start (e.g., `npx prisma migrate deploy && node dist/server.js` as the container command, or a small `entrypoint.sh`).
2. Write `frontend/Dockerfile` (multi-stage: `build` running Vite, `runtime` serving `dist/` via `nginx`/`serve`), with the build-time `VITE_API_BASE_URL` correctly passed as a Docker build arg (Vite env vars are baked in at build time, not read at container runtime — this distinction must be handled correctly, see Implementation Notes).
3. Write root `docker-compose.yml` wiring the three services, health checks, named volume for Postgres, and a Compose network so services address each other by service name.
4. Write root `.env.example` for Compose-level variables.
5. Write `backend/.dockerignore` and `frontend/.dockerignore`.
6. Test the full `docker compose up --build` flow from a clean state, including the persistence-across-restart check.
7. Document the Docker workflow (how to run it, how to seed, how to view logs, how to tear down) — feeds into FLO-021's README.

## Dependencies

FLO-002, FLO-003, FLO-004, FLO-018.

## Implementation Notes

- Vite bakes `VITE_*` variables into the static build at *build time*, not runtime — meaning `docker-compose.yml` must pass `VITE_API_BASE_URL` as a Docker build `arg` to the frontend service (`build.args` in Compose), not as a plain runtime `environment` entry, or the built static files will silently ignore it. This is a common Docker+Vite pitfall; get it right here so FLO-020 doesn't inherit a broken assumption.
- Running Prisma migrations automatically on backend container start is convenient for this project's scale (a single-instance local/demo deployment) but would be unsafe for a multi-instance production rollout (concurrent migration races). That tradeoff is acceptable and worth documenting explicitly, not silently accepting — this system is not being deployed at a scale where that matters.
- Keep the Postgres service's credentials in Compose's `.env.example` clearly marked as local-development-only defaults, never suggesting they're safe for a real deployment.
