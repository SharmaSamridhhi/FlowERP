# FLO-021 — Documentation & Submission Package

**Phase:** 4 — Deployment & Release Readiness

## Description

Assemble everything the assignment's Submission Requirements section asks for into a coherent, reviewable package: a comprehensive root README, a Postman collection (or equivalent API documentation), an architecture explanation, and an honest known-limitations section. This spec doesn't build anything new — it consolidates and writes up decisions and setup steps already made by every prior spec, so it depends on effectively all of Phase 3 plus the deployment specs being done.

## User Story

As an evaluator reviewing this submission, I want a single README that tells me exactly how to run the project (locally and via Docker), how it's deployed, how it's architected, what the test credentials are, and what's known to be incomplete, so that I can assess the work without having to reverse-engineer any of that from the code.

## Scope

**Included:**
- Root `README.md` covering, per the assignment's explicit documentation requirements: how the server was set up, how environment variables are managed (referencing FLO-018), how to run the project locally (both native `npm` workflow and `docker compose up`, referencing FLO-019), how to deploy the project (referencing FLO-020's runbook), and any assumptions made (the scope decisions this roadmap recorded along the way — Purchase Orders, Invoices, cancel-after-confirm/receive policies, role matrices, etc., pulled from each spec's Implementation Notes into one consolidated place).
- Test login credentials for all four roles, clearly presented (matching FLO-011's seed data).
- Live frontend URL and live backend API URL (if FLO-020 completed live deployment) or, per the assignment's sanctioned fallback, a clear statement that local/Docker setup plus a screen recording stand in for live URLs.
- A Postman collection (`docs/postman_collection.json` or similar, exported and committed) covering every endpoint built across FLO-011–FLO-017, organized by module, including example requests for both success and key error cases (e.g., insufficient stock, validation failure, 403).
- A short architecture explanation section: the monorepo layout, the Express/Prisma/Postgres backend, the React/Atomic-Design frontend, the shared-contracts approach (FLO-008), and the key business-logic decisions (stock ledger as single source of truth, snapshot line items, all-or-nothing challan confirmation).
- A "Known Limitations / Incomplete Parts" section, written honestly — pulling directly from each spec's documented scope exclusions (no customer/product delete, no partial PO receiving, no refresh tokens, Phase 5 items not yet built if this spec is written before Phase 5 completes, etc.) rather than omitting them.
- If a full live deployment wasn't completed per FLO-020's sanctioned fallback: a screen recording of the full flow (this spec covers writing the README section describing/linking it; actually producing the recording is a manual step the user performs, noted here as a task this spec's implementer should flag to the user rather than silently skip).

**Excluded:**
- Any new application feature or bug fix discovered while writing documentation — if writing this spec surfaces a real defect against an earlier spec, that's a follow-up task against that spec, not something patched inline here.
- API documentation generated via an in-code tool (e.g., Swagger/OpenAPI autogeneration) — the Postman collection satisfies the assignment's explicit requirement ("Postman collection or API documentation") without adding a new documentation-generation dependency; if OpenAPI is preferred instead, that's a valid substitution, but the two are not both required.

## Acceptance Criteria

- [ ] Root `README.md` includes every element listed in the assignment's "You must document" list, each as its own clearly-labeled section: server setup, environment variable management, local run instructions, deployment instructions, assumptions made.
- [ ] Root `README.md` includes every element listed in the assignment's "Submission Requirements" list that is documentation-shaped: test login credentials for all roles, Postman collection/API docs reference, architecture explanation, known limitations. (GitHub repo link and live URLs are filled in as actual values, not placeholders, once available.)
- [ ] A fresh reader with no prior context can follow the README's local setup section and get the app running (native or Docker) without needing to ask a clarifying question — validated by literally following the steps as written.
- [ ] The Postman collection imports cleanly into Postman (or an equivalent tool) and includes at least one request per endpoint across every Phase 3 module, with the auth token flow documented (how to obtain and use the JWT for authenticated requests).
- [ ] The known-limitations section is specific and honest (names actual gaps: e.g., "no refresh-token rotation — session requires re-login after token expiry or a hard refresh," "purchase orders have no partial-receiving support") rather than a vague disclaimer.
- [ ] All internal links in the README (to `/specs`, `/steering/git-workflow.md`, the Postman collection file, any screen recording) resolve correctly.

## Technical Tasks

1. Draft the root README structure: Overview, Architecture, Tech Stack, Local Setup (native), Local Setup (Docker), Environment Variables, Deployment, Test Credentials, API Documentation, Known Limitations & Assumptions, Roadmap/Specs pointer.
2. Pull setup/env/deploy details verbatim from FLO-018/FLO-019/FLO-020's own documentation rather than re-deriving them, to avoid drift between what those specs actually did and what the README claims.
3. Export a Postman collection covering every endpoint from FLO-011–FLO-017 (auth, customers, products, stock movements, challans, purchase orders), including a pre-request/environment setup for the JWT bearer token; commit it under `docs/`.
4. Write the architecture explanation section, referencing the real decisions recorded in `/specs/README.md` and each spec's Implementation Notes.
5. Compile the known-limitations section by reviewing every prior spec's "Excluded" scope section and Implementation Notes for explicitly-deferred or explicitly-cut functionality.
6. Fill in live URLs and test credentials once FLO-020 has concrete values; if live deployment wasn't completed, write the fallback section per the assignment's sanctioned alternative and flag to the user that a screen recording still needs to be produced manually.

## Dependencies

FLO-011, FLO-012, FLO-013, FLO-014, FLO-015, FLO-016, FLO-017, FLO-019, FLO-020.

## Implementation Notes

- This spec depends on essentially all of Phase 3 plus Docker/deployment specifically because it's a documentation *consolidation* spec — writing it earlier would mean documenting features that don't exist yet or re-writing sections repeatedly as modules land. Sequencing it last in Phase 4 (after Phase 3 and after FLO-019/020) means it's written once, accurately.
- Producing an actual screen recording is outside what a coding-focused implementation can do autonomously — this spec's job is to prepare the README section that references it and to explicitly flag to the user that the recording itself is a manual step they need to perform, not to silently mark that submission requirement as satisfied without it.
