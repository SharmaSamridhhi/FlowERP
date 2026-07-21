# FLO-020 — Hosting Deployment (Frontend, Backend, Database)

**Phase:** 4 — Deployment & Release Readiness

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Deploy the application to live, free-tier hosting: frontend to a static host (Vercel/Netlify/Render Static Site), backend to a Node host (Render/Railway/Fly.io), and database to a managed free-tier Postgres (Supabase/Neon/Render Postgres) — per the assignment's explicitly acceptable options. AWS is preferred but optional/bonus per the assignment ("AWS deployment is optional and will be treated as a bonus... candidate is not expected to spend money"); this spec targets the assignment's actual required bar (a working live deployment on any free platform) and documents AWS as a possible future upgrade rather than a requirement.

## User Story

As an evaluator or user of this system, I want to reach a live, working frontend and backend without running anything locally, so that I can verify the application works exactly as demonstrated.

## Scope

**Included:**
- Backend deployed to a free-tier Node host, configured with the production environment variables per FLO-018's contract (set in the host's dashboard, not committed), connected to the managed Postgres instance, migrations applied against the live database (`prisma migrate deploy`, run as a one-off release step or command per the chosen host's mechanism).
- Managed Postgres instance provisioned (Supabase/Neon/Render Postgres or equivalent), with the connection string set as the backend's `DATABASE_URL`.
- Frontend deployed to a free-tier static host, built with `VITE_API_BASE_URL` pointed at the live backend URL, and the live backend's `CORS_ORIGIN` updated to allow the live frontend's origin (closing the loop FLO-018 set up).
- Live login flow verified end-to-end in a real browser against the deployed stack for all four seeded roles.
- Deployment documented step-by-step (exact host used, exact steps taken, where env vars were set) — feeds directly into FLO-021.
- A documented, safe seeding step for the production database (the four demo role accounts from FLO-011, at minimum) — run once, deliberately, not on every deploy.

**Excluded:**
- AWS deployment itself (explicitly optional/bonus per the assignment; not required by this roadmap either — if pursued, it would be a Phase 5 addition, but is not scheduled as its own spec since the assignment doesn't require it and doing so isn't necessary to satisfy any mandatory project instruction).
- Automated redeploy-on-merge (FLO-022, Phase 5) — this spec is the first, manually-triggered deployment proving the target hosting setup works at all; automating it is a deliberately separate, deferrable concern.

## Acceptance Criteria

- [ ] The deployed frontend URL loads in a browser with no console errors and no broken asset references.
- [ ] The deployed backend URL responds correctly to `GET /health` and to real API calls (e.g., a login request) with correct CORS headers allowing the deployed frontend's origin.
- [ ] Logging in against the live deployment succeeds for each of the four seeded role accounts, and each role sees the correct role-filtered navigation (proving FLO-011 works identically in production as it did locally).
- [ ] At least one full business flow is verified live end-to-end (e.g., create a customer, add a product, build and confirm a challan, observe stock decrease) — not just that pages load, but that the core assignment scenario actually works in production.
- [ ] Database migrations on the live database match the current schema (`prisma migrate status` against the production `DATABASE_URL` shows no pending migrations).
- [ ] No secret (JWT secret, DB password) appears in any committed file, deployed frontend bundle, or public log — spot-checked per FLO-018's boundary.
- [ ] The exact deployment steps taken (host names used, where each env var was configured, how migrations were run) are written down clearly enough that someone else could reproduce the deployment from scratch.

## Technical Tasks

1. Provision the managed Postgres instance; obtain its connection string.
2. Provision the backend host; configure it to build/run `backend/` (via its Dockerfile from FLO-019 if the host supports container deploys, or its native Node buildpack otherwise — either is acceptable, document which was used and why); set all required env vars from FLO-018's `backend/.env.example` with real production values.
3. Run `prisma migrate deploy` against the production database (via the host's one-off command mechanism, a manual local run pointed at the prod `DATABASE_URL`, or a deploy hook — document the exact mechanism used).
4. Run the production seed step for the four demo role accounts (document that this is a deliberate one-time action, not part of the normal deploy path, to avoid accidentally reseeding/overwriting data on every deploy).
5. Provision the frontend host; configure the build to set `VITE_API_BASE_URL` to the live backend URL; deploy.
6. Update the backend's `CORS_ORIGIN` to the live frontend URL and redeploy/restart the backend.
7. Manually verify the full acceptance criteria list above in a real browser against the live URLs.
8. Write the deployment runbook (exact steps, exact hosts, where each variable was set) for FLO-021.

## Dependencies

FLO-018, FLO-019.

## Implementation Notes

- If, when this spec is actually implemented, no free hosting account/credentials are available to the implementer (a real possibility for an agent working autonomously), the fallback explicitly sanctioned by the assignment is: a working local setup (already proven by FLO-019's Docker Compose flow), a screen recording of the full flow, a Postman collection, and clear README instructions — all of which land in FLO-021 regardless of whether live deployment happens. Do not treat live hosting as a hard blocker for calling Phase 4 substantively complete; treat it as the preferred outcome with a legitimate, assignment-sanctioned fallback.
- Keep the chosen hosting stack's specific quirks (e.g., a host's particular way of running one-off commands, sleep/cold-start behavior on free tiers) documented in the runbook rather than assumed — a future re-deployment (or FLO-022's automation) needs these details written down, not rediscovered.
