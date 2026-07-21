# FLO-010 — Continuous Integration Pipeline

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Add a GitHub Actions workflow that runs on every push/PR: install dependencies, lint, type-check, run tests with coverage, and build both `backend` and `frontend`. This is the automated quality gate that watches every Phase 3 PR from the very first one (FLO-011 onward) — required per project instructions to be treated as a first-class practice from the beginning, not bolted on once features exist. CD (actually deploying) is explicitly out of scope here — see FLO-022.

## User Story

As anyone reviewing a pull request against this repository, I want an automated check confirming lint, type-check, tests, and build all pass, so that I never have to manually re-run the whole quality gate locally to trust a PR is safe to merge.

## Scope

**Included:**

- `.github/workflows/ci.yml` triggered on `pull_request` (any branch) and `push` to `main`.
- Job steps: checkout, Node setup (version pinned to `.nvmrc` from FLO-001), `npm ci` at root (installing all workspaces), `npm run lint`, `tsc --noEmit` (or equivalent type-check script) per package, `npm run test:coverage`, `npm run build` for `backend` and `frontend`.
- Dependency caching (`actions/setup-node`'s built-in npm cache, keyed on `package-lock.json`) so CI runs stay fast as the repo grows through Phase 3.
- A required-status-check posture documented (branch protection itself is a GitHub repo setting the user configures, not something committed to the repo — this spec documents that it _should_ be turned on, but doesn't assume the agent can or should change GitHub repository settings).
- Job fails fast and clearly: a lint failure, type error, test failure, or build failure each produce a visibly failed CI run with the offending step identifiable from the workflow logs.

**Excluded:**

- Any deployment or environment-specific step (build artifacts are not published anywhere) — that's FLO-022.
- Database provisioning inside CI for integration tests — if FLO-006/FLO-011's test strategy ends up needing a real Postgres for integration tests, this workflow adds a Postgres service container at that point; until then, this spec only wires up what the test scripts already need to run headlessly.
- Enabling GitHub branch-protection rules themselves (a repo-admin action outside this codebase's scope, left to the user).

## Acceptance Criteria

- [ ] Opening a PR against this repository triggers the workflow and it completes (pass or fail) without manual intervention.
- [ ] A PR with a lint violation fails the workflow at the lint step, with the failure clearly attributable in the Actions log.
- [ ] A PR with a TypeScript error fails at the type-check step.
- [ ] A PR with a failing test fails at the test step.
- [ ] A clean PR (no violations) passes every step and shows a green check.
- [ ] Workflow run time benefits from dependency caching — a second run with no dependency changes reuses the npm cache (visible in the Actions log as a cache hit).
- [ ] The workflow file itself passes `actionlint` or is otherwise free of obvious YAML/syntax errors (verified by a successful trigger, since that's the practical proof).

## Technical Tasks

1. Create `.github/workflows/ci.yml` with `on: [pull_request, push: { branches: [main] }]`.
2. Add a single `build-and-test` job (splitting into a matrix/multiple jobs is unnecessary at this project's size) running on `ubuntu-latest`.
3. Steps: `actions/checkout@v4` → `actions/setup-node@v4` (with `node-version-file: .nvmrc`, `cache: npm`) → `npm ci` → `npm run lint` → per-package `tsc --noEmit` → `npm run test:coverage` → `npm run build -w backend` → `npm run build -w frontend`.
4. Ensure root `package.json` scripts referenced here (`lint`, `test:coverage`, `build`) exist and behave as FLO-005/006 defined them — add any missing root fan-out script rather than duplicating logic in the workflow YAML.
5. Push a deliberately broken commit to a scratch branch to confirm each failure mode is caught, then a clean commit to confirm the green path, before finalizing.
6. Document (in the repo-map doc from FLO-001 or a short note in this workflow file's header comment) that branch protection requiring this check to pass is a recommended GitHub setting, left for the user to enable.

## Dependencies

FLO-005, FLO-006.

## Implementation Notes

- No deploy step lives in this workflow — mixing CI (verify) and CD (ship) into one workflow file tends to create exactly the kind of coupling this roadmap's phased approach is designed to avoid. FLO-022 either extends this workflow with a gated deploy job or adds a second workflow file triggered only on `main`, decided at that point once real hosting targets (FLO-020) exist.
- This spec's job runs against every Phase 3 PR from FLO-011 onward, which is precisely why it's sequenced in Phase 2 rather than Phase 4 — establishing the gate before feature work starts is what keeps quality from eroding across seven-plus business-module PRs.
- A genuinely fresh checkout has no `backend/src/generated/prisma` (gitignored) and nothing was generating it — every local dev session up to this point had it because `prisma generate` was run once, manually, back in FLO-004, and just never needed regenerating since. This only surfaced by actually simulating CI locally (`act`, driven by a real Docker daemon) against a clean checkout, not from reading the code. Fixed by adding `"postinstall": "prisma generate"` to `backend/package.json`, which also fixes the same gap for any new developer's first `npm install`. Since `prisma generate` (unlike `migrate`) never connects to a database but still needs `DATABASE_URL` to be syntactically present to load `prisma.config.ts`, the workflow sets a job-level placeholder `DATABASE_URL` that's never actually connected to.
- Verified locally end-to-end with `act` (a local GitHub Actions runner, using a real Docker daemon) rather than only `actionlint` — confirmed a full clean run passes, a lint violation fails the workflow at the right step, and a second run restores from the npm cache (`cache-hit=true`). This is stronger verification than reading the YAML, since `act` executes the actual workflow file against a real container, not a simulation of one.
