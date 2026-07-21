# FLO-005 — Linting, Formatting & Pre-Commit Standards

**Phase:** 2 — Engineering Foundations (Good Practices I)

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Introduce ESLint and Prettier across all three workspaces (`backend`, `frontend`, `packages/shared`) with a shared base configuration, plus a Husky + lint-staged pre-commit hook so violations are caught before they enter history. This must land before Phase 3 feature work begins so every business-module commit from FLO-011 onward is already held to the standard, instead of being retrofitted later.

## User Story

As any developer working in this repo, I want linting and formatting enforced automatically and consistently across every package, so that code style is never a point of debate or a source of drift between the backend and frontend.

## Scope

**Included:**
- Root-level ESLint config (flat config) with a base ruleset (`@typescript-eslint`, `eslint-config-prettier` to disable stylistic conflicts) extended by package-specific overrides (React hooks/JSX rules for `frontend` only).
- Root-level Prettier config (`.prettierrc`) and `.prettierignore`, shared by all packages — one formatting standard, not per-package variants.
- `npm run lint` / `npm run lint:fix` / `npm run format` scripts at the root that fan out across workspaces.
- Husky installed, with a `pre-commit` hook running `lint-staged`.
- `lint-staged` config: staged `.ts`/`.tsx` files get ESLint `--fix` and Prettier `--write`; staged `.json`/`.md` get Prettier only.
- ESLint rule enforcing no unused vars/imports and no explicit `any` (warn-level minimum) — TypeScript strictness matters for a codebase multiple specs will extend.

**Excluded:**
- Test runner configuration (FLO-006).
- CI wiring that runs lint on every PR (FLO-010) — this spec makes lint *runnable and enforced locally*; CI is a separate concern layered on top.

## Acceptance Criteria

- [ ] `npm run lint` at the root lints `backend`, `frontend`, and `packages/shared` and exits non-zero on a deliberately introduced violation (e.g., an unused variable).
- [ ] `npm run format` reformats a deliberately misformatted file to match `.prettierrc`.
- [ ] Attempting to commit a file with a lint error that `--fix` cannot auto-resolve is blocked by the pre-commit hook; committing a clean file succeeds.
- [ ] ESLint config for `frontend` includes React/JSX-aware rules (e.g., `eslint-plugin-react-hooks`) that `backend` does not need and does not load.
- [ ] Running lint/format twice in a row on an already-clean tree produces no diff and no errors (idempotent).
- [ ] `.prettierignore` excludes `dist`, `node_modules`, and generated Prisma client output.

## Technical Tasks

1. Install ESLint (flat config), `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` (frontend only) at appropriate workspace levels or root with per-package overrides.
2. Author `eslint.config.js` at root with a shared base block plus a `frontend/**` override block for React-specific rules.
3. Install and configure Prettier (`.prettierrc`, `.prettierignore`) at root, shared by all packages.
4. Add root scripts: `lint`, `lint:fix`, `format`, `format:check`, each targeting all workspaces (`npm run lint --workspaces --if-present` or an explicit fan-out).
5. Install Husky, run its init, add a `pre-commit` hook invoking `npx lint-staged`.
6. Configure `lint-staged` in root `package.json` (or `.lintstagedrc`) mapping file globs to ESLint/Prettier commands.
7. Verify the full loop manually: introduce a violation, attempt commit, confirm block; fix it, confirm commit succeeds.

## Dependencies

FLO-002, FLO-003.

## Implementation Notes

- One shared Prettier config for the whole repo is intentional — formatting is not a place for per-package opinions, and a single config avoids merge noise from inconsistent rules.
- ESLint's flat config format is used (not the legacy `.eslintrc`) since it's the current standard and composes overrides more predictably across a multi-package repo.
- Keep the `no-explicit-any` rule at `warn`, not `error`, initially — some Prisma/Express edge cases legitimately need an escape hatch during Phase 3, and a hard block would invite `// eslint-disable` sprawl instead of genuinely better types. Revisit tightening this in Phase 5 if warnings stay low.
