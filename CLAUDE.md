# FlowERP

Mini ERP + CRM Operations Portal for a wholesale/distribution company — customers, products, stock, purchase orders, sales challans, invoices, and CRM follow-ups, used internally by sales, warehouse, and accounts teams.

## Repo map

- `backend/` — Node.js + TypeScript + Express REST API, PostgreSQL via Prisma.
- `frontend/` — React + TypeScript SPA (Vite, Tailwind CSS), components organized by Atomic Design.
- `packages/shared/` — Zod schemas and inferred TypeScript types shared between `backend` and `frontend`, so request/response contracts can't drift between the two.
- `specs/` — the full implementation roadmap. Start at [specs/README.md](specs/README.md) for the phase breakdown and dependency graph. Every spec (`FLO-XXX`) is self-contained.
- `steering/git-workflow.md` — the mandatory Git process for implementing a spec: branch naming, commit conventions, and exactly what does and doesn't require explicit user approval.

This repo is an npm workspaces monorepo (`backend`, `frontend`, `packages/*`) — run `npm install` at the root, not inside individual packages.

## Conventions

- Folders: kebab-case.
- React components: PascalCase filenames (`CustomerCard.tsx`), colocated with their test (`CustomerCard.test.tsx`).
- Backend layers: suffix files by role — `*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts` — matching the route → controller → service layering established in [FLO-002](specs/FLO-002-backend-bootstrap.md).
- Frontend components follow Atomic Design (`src/components/{atoms,molecules,organisms,templates}`, `src/pages`), established in [FLO-009](specs/FLO-009-design-system-foundation.md) — dependencies only ever point upward (atoms → molecules → organisms → templates → pages), never sideways or down.
- Package names are scoped `@flowerp/*` (`@flowerp/backend`, `@flowerp/frontend`, `@flowerp/shared`).

## Before implementing anything

Read [steering/git-workflow.md](steering/git-workflow.md) first — it governs branch naming, commit format, and exactly what requires asking the user before it happens (pushing, PRs, merges). Then read the specific spec being implemented in [specs/](specs/README.md); each spec is self-contained and lists its own prerequisites.
