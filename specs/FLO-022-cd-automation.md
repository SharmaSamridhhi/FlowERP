# FLO-022 — Automated CD via GitHub Actions

**Phase:** 5 — Engineering Improvements (Good Practices II)

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Extend the FLO-010 CI workflow (or add a companion workflow) so that a merge to `main` automatically deploys the backend and frontend to the hosting targets FLO-020 already proved out manually. This directly satisfies the assignment's "GitHub Actions deployment" bonus point. It's placed in Phase 5 deliberately: manual deployment (FLO-020) already satisfies the assignment's actual deployment requirement, so automating the redeploy step is a safe-to-defer improvement, not a blocker for anything earlier.

## User Story

As a developer merging an approved change to `main`, I want the live frontend and backend to redeploy automatically, so that I don't have to manually repeat FLO-020's deployment steps after every merge.

## Scope

**Included:**
- A `deploy` job/workflow triggered on `push` to `main` (after FLO-010's checks would have already passed as part of the PR that merged), running only once CI is green — either as a second job in the same workflow gated on the test job succeeding, or a separate workflow scoped to `main` pushes.
- Deployment steps appropriate to whatever hosting targets FLO-020 actually used (e.g., triggering a Render/Railway deploy hook, or pushing to Vercel/Netlify via their GitHub integration/CLI) — using the specific mechanism documented in FLO-020's runbook, not a generic/hypothetical one.
- Database migrations run as an explicit, ordered step before the backend redeploy completes serving traffic (`prisma migrate deploy` against production), not left to happen implicitly.
- Secrets required for deployment (hosting API tokens/deploy hook URLs) stored as GitHub Actions repository secrets, never committed.
- Deployment status visible in the Actions run (clear success/failure, with failure not silently leaving the live app on a broken build).

**Excluded:**
- Rollback automation (if a deploy fails or introduces a regression, rolling back is a manual action using the hosting provider's own tools — building automated rollback is disproportionate to this project's scope).
- Any change to the CI checks themselves (FLO-010's lint/test/build gate is reused as-is, not modified).

## Acceptance Criteria

- [ ] Merging a PR to `main` triggers the deploy workflow automatically, with no manual step required.
- [ ] The deploy workflow only proceeds if FLO-010's lint/test/build checks pass — a merge that somehow bypassed branch protection with failing checks does not deploy.
- [ ] After a successful workflow run, the live frontend and backend reflect the newly merged change (verified by checking a small, identifiable change actually appears live).
- [ ] Production database migrations run automatically as part of the deploy and complete before the workflow reports success.
- [ ] No deployment credential/token appears in the workflow YAML in plaintext — all sourced from GitHub Actions secrets.
- [ ] A deliberately failing deploy step (e.g., a temporarily invalid deploy hook URL) causes the workflow to fail visibly rather than reporting false success.

## Technical Tasks

1. Confirm the exact hosting mechanism from FLO-020's runbook (deploy hook URL, CLI-based deploy, or native Git-integration auto-deploy that might make part of this spec redundant — document if the chosen host already auto-deploys on push and this spec only needs to add the migration step and the CI-gating).
2. Add the required deployment secrets (API tokens/deploy hook URLs) to the GitHub repository's Actions secrets (a user action — the agent documents exactly which secrets are needed and asks the user to add them, per the git-workflow steering doc's boundary on what the agent can do to shared/external systems).
3. Extend `.github/workflows/ci.yml` with a `deploy` job gated on the test/build job (`needs:`), scoped to `on: push: branches: [main]` only, or add `.github/workflows/deploy.yml` if keeping CD fully separate from CI reads more clearly.
4. Add the `prisma migrate deploy` step against production, ordered before/as part of the backend redeploy.
5. Trigger a real merge to `main` with a small, verifiable change and confirm the full pipeline (checks → deploy → migration → live update) works end-to-end.
6. Update FLO-021's README to note that deployment is now automated on merge, superseding the manual runbook as the day-to-day process (while keeping the manual runbook for reference/disaster-recovery purposes).

## Dependencies

FLO-010, FLO-020.

## Implementation Notes

- This spec cannot be fully implemented by an agent alone — it requires the user to provision and share hosting deploy credentials/secrets into the GitHub repository, which is exactly the kind of action the [git-workflow steering doc](../steering/git-workflow.md) and this roadmap's broader operating rules reserve for explicit user action (pushing, external-system credentials). The agent's job here is to build the workflow and clearly specify what secrets it needs; provisioning them is the user's step.
- If the chosen hosting provider already auto-deploys on push to `main` via its own native GitHub integration (common for Vercel/Netlify/Render), a meaningful chunk of this spec may already be satisfied by configuration rather than a workflow file — in that case, this spec's real remaining work is adding the CI-gate (don't deploy on a red build) and the migration step, and documenting that the provider's native integration handles the rest.
