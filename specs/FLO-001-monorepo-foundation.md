# FLO-001 — Monorepo Structure & Repository Conventions

**Phase:** 1 — Project Foundation

## Description

Establish the repository's top-level structure before any application code exists: the npm workspace layout that will hold the backend, frontend, and shared packages, root-level tooling config, Node version pinning, and the baseline conventions (folder naming, `.gitignore`, editor config) every later spec builds on. This spec produces no running application — it produces the skeleton and rules that make every subsequent spec's location and setup unambiguous.

## User Story

As a developer joining this repository, I want a predictable, documented root structure and workspace configuration, so that I know exactly where new code belongs and can run tooling consistently across every package.

## Scope

**Included:**
- Root `package.json` configured as an npm workspaces root (`workspaces: ["backend", "frontend", "packages/*"]`).
- Empty placeholder packages: `backend/`, `frontend/`, `packages/shared/`, each with a minimal `package.json` (name, version, `private: true`) so the workspace resolves — actual app code is out of scope (FLO-002, FLO-003).
- `.nvmrc` (or `engines` field) pinning the Node.js major version.
- Root `.gitignore` covering `node_modules`, build output, `.env*` (except `.env.example`), editor/OS artifacts, and coverage reports.
- `.editorconfig` for consistent indentation/line endings across editors.
- A root `CLAUDE.md` (or equivalent) documenting the repo layout for future contributors/agents — this is a short "map of the repo," not full documentation (full docs are FLO-021).
- Directory-naming and module-naming conventions written down (e.g., kebab-case folders, PascalCase React components, `*.service.ts` / `*.controller.ts` suffixes on the backend).

**Excluded:**
- Any actual backend or frontend runtime code (FLO-002, FLO-003).
- Database schema (FLO-004).
- Lint/format tool configuration itself (FLO-005) — this spec only creates the folders those configs will later live in.

## Acceptance Criteria

- [ ] `npm install` at the repo root succeeds and resolves `backend`, `frontend`, and `packages/shared` as workspaces (verify with `npm ls --workspaces`).
- [ ] Root `.gitignore` prevents `node_modules/`, `dist/`, `.env`, and OS/editor files from being tracked; committing a throwaway `.env` file and running `git status` shows it ignored.
- [ ] `.nvmrc` exists and `nvm use` (or equivalent) selects the pinned Node version without error.
- [ ] `.editorconfig` exists at root with rules for indentation (2 spaces), charset (utf-8), and final newline.
- [ ] A root markdown file documents: the three workspaces and their purpose, naming conventions, and a pointer to `/specs` and `/steering` for anyone continuing the work.
- [ ] No workspace package contains application logic — each `package.json` is minimal and the folder otherwise empty (or contains only a placeholder `.gitkeep`/stub entry file if npm requires one to resolve the workspace).

## Technical Tasks

1. Initialize root `package.json` with `"private": true`, `"workspaces": ["backend", "frontend", "packages/shared"]`, and root-level scripts stubbed for now (`"lint"`, `"test"`, `"build"` can be no-ops or `"echo 'not yet configured'"` until FLO-005/006 wire them up).
2. Create `backend/package.json`, `frontend/package.json`, `packages/shared/package.json` with just `name`, `version: 0.0.0`, `private: true`.
3. Add `.nvmrc` with the target LTS Node version.
4. Add `.editorconfig`.
5. Write root `.gitignore` (Node/React/TS-oriented; include `.env`, `.env.*` with an explicit `!.env.example` negation).
6. Write the repo map document describing folder purpose and conventions, referencing `/specs/README.md` for the roadmap and `/steering/git-workflow.md` for process.
7. Commit the skeleton on a `FLO-001-monorepo-foundation` branch per [git-workflow.md](../steering/git-workflow.md).

## Dependencies

None.

## Implementation Notes

- Use npm workspaces, not Yarn/pnpm workspaces or a tool like Turborepo/Nx — the project is small enough that a build-orchestration tool would add configuration overhead without payoff. Revisit only if a future spec surfaces a concrete pain point.
- `packages/shared` exists from this spec onward because FLO-008 (shared API contracts) depends on the workspace already being resolvable; don't defer creating it.
- Keep the root `CLAUDE.md`/repo-map short — it is a map, not a manual. Deep setup instructions belong in FLO-021's README.
