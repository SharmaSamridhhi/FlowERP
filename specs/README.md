# FlowERP Implementation Roadmap

Source assignment: "Full Stack Developer Case Study — Mini ERP + CRM Operations Portal" (business context: customers, products, stock, purchase orders, sales challans, invoices, CRM follow-ups for a wholesale/distribution company).

This document is the index for every specification under `/specs`. It is not itself a spec. For the Git process that governs how these specs get implemented, see [`/steering/git-workflow.md`](../steering/git-workflow.md).

## How to read a spec

Every spec is self-contained: a developer (or agent) assigned only that file should be able to implement it without reading any other spec, except to satisfy the listed `Dependencies`. Each spec has a stable ID (`FLO-XXX`) used as the branch name suffix and in commit scopes.

## Architectural decisions baked into this roadmap

The assignment leaves some technology choices open ("Express.js or NestJS", "PostgreSQL or MySQL") and some scope gaps (no field list for Purchase Orders or Invoices, despite both being named in the Business Context). These decisions are made once, here, so every downstream spec is consistent:

- **Backend framework:** Express.js. Chosen over NestJS because the mandatory validation layer uses Zod, and Express + Zod middleware is more direct than retrofitting Zod into Nest's `class-validator`-oriented pipe system. Express also keeps the learning surface small for a project of this size.
- **Database + ORM:** PostgreSQL + Prisma. Prisma gives typed models, a migration workflow, and pairs cleanly with a Postgres container in Docker Compose.
- **Monorepo layout:** npm workspaces with three packages — `backend/`, `frontend/`, `packages/shared/`. `packages/shared` holds Zod schemas and inferred TypeScript types that both apps import, so request/response shapes can never drift between client and server (see FLO-008).
- **Frontend stack:** React + TypeScript via Vite, React Router, TanStack Query for server state, Tailwind CSS for styling, component tree organized by Atomic Design (atoms/molecules/organisms/templates/pages) per FLO-009.
- **Auth transport:** JWT bearer token, issued on login, sent via `Authorization: Bearer <token>` header, held in frontend memory (React context), short expiry (see FLO-011). This satisfies the assignment's "simple JWT-based authentication is acceptable" and avoids the added complexity of refresh-token rotation for a project of this scope.
- **Purchase Orders:** the assignment names purchase orders in the Business Context but never specifies fields or flows the way it does for Customers, Products, and Sales Challans. FLO-017 defines a deliberately lean Purchase Order module (no supplier CRM — supplier is a plain text field) whose sole job is to be the "stock IN" counterpart to the Sales Challan's "stock OUT", both settling through the shared Stock Movement Ledger (FLO-014). This is an explicit scope decision, not an oversight.
- **Invoices:** likewise named in Business Context but not detailed, and "Export invoice as PDF" is listed only as a bonus. FLO-023 (Phase 5) models an Invoice as a document generated from a Confirmed Sales Challan (challan → invoice is the standard distribution-business flow), rather than a parallel CRUD module with independent line-item entry. This keeps Phase 3 focused on the modules the assignment actually specifies in detail, while still covering every entity mentioned anywhere in the document.
- **Docker:** mandatory per project instructions regardless of the assignment listing it as bonus. A root `docker-compose.yml` orchestrates frontend, backend, and Postgres (FLO-019), building on the env var strategy from FLO-018.

## Phases

1. **Project Foundation** — repo, apps, database schema exist and boot.
2. **Engineering Foundations (Good Practices I)** — lint, format, tests, validation, shared contracts, design system, CI all exist *before* the first business feature is written.
3. **Core Business Modules** — the actual ERP/CRM features.
4. **Deployment & Release Readiness** — env config, Docker, hosting, documentation/submission package.
5. **Engineering Improvements (Good Practices II)** — bonus items and automation that are safe to defer without harming earlier phases: CD automation, invoice PDF export, S3 product images.

## Spec index and dependency graph

| ID | Title | Phase | Status | Depends on |
|---|---|---|---|---|
| [FLO-001](FLO-001-monorepo-foundation.md) | Monorepo Structure & Repository Conventions | 1 | ✅ Completed | None |
| [FLO-002](FLO-002-backend-bootstrap.md) | Backend Service Bootstrap | 1 | ✅ Completed | FLO-001 |
| [FLO-003](FLO-003-frontend-bootstrap.md) | Frontend Application Bootstrap | 1 | ✅ Completed | FLO-001 |
| [FLO-004](FLO-004-database-schema-foundation.md) | Database Schema & ORM Migration Foundation | 1 | ✅ Completed | FLO-001, FLO-002 |
| [FLO-005](FLO-005-lint-format-precommit.md) | Linting, Formatting & Pre-Commit Standards | 2 | ⬜ Not Started | FLO-002, FLO-003 |
| [FLO-006](FLO-006-testing-infrastructure.md) | Testing Infrastructure & Conventions | 2 | ⬜ Not Started | FLO-002, FLO-003, FLO-005 |
| [FLO-007](FLO-007-validation-error-handling.md) | Runtime Validation & Centralized Error Handling | 2 | ⬜ Not Started | FLO-002, FLO-004 |
| [FLO-008](FLO-008-shared-contracts.md) | Shared API Contracts, Response Envelope & Query Utilities | 2 | ⬜ Not Started | FLO-002, FLO-003, FLO-007 |
| [FLO-009](FLO-009-design-system-foundation.md) | Frontend Design System Foundation (Atomic Design) | 2 | ⬜ Not Started | FLO-003, FLO-005 |
| [FLO-010](FLO-010-ci-pipeline.md) | Continuous Integration Pipeline | 2 | ⬜ Not Started | FLO-005, FLO-006 |
| [FLO-011](FLO-011-auth-rbac.md) | Authentication & Role-Based Access Control | 3 | ⬜ Not Started | FLO-004, FLO-007, FLO-008, FLO-009, FLO-010 |
| [FLO-012](FLO-012-customer-crm.md) | Customer CRM Module | 3 | ⬜ Not Started | FLO-011 |
| [FLO-013](FLO-013-product-inventory-catalog.md) | Product & Inventory Catalog Module | 3 | ⬜ Not Started | FLO-011 |
| [FLO-014](FLO-014-stock-movement-ledger.md) | Stock Movement Ledger | 3 | ⬜ Not Started | FLO-013 |
| [FLO-015](FLO-015-sales-challan-backend.md) | Sales Challan Module — Backend | 3 | ⬜ Not Started | FLO-012, FLO-013, FLO-014 |
| [FLO-016](FLO-016-sales-challan-frontend.md) | Sales Challan Module — Frontend | 3 | ⬜ Not Started | FLO-015 |
| [FLO-017](FLO-017-purchase-order.md) | Purchase Order Module | 3 | ⬜ Not Started | FLO-013, FLO-014 |
| [FLO-018](FLO-018-env-config-secrets.md) | Environment Configuration & Secrets Management | 4 | ⬜ Not Started | FLO-002, FLO-003 |
| [FLO-019](FLO-019-docker-compose.md) | Docker Containerization & Compose Orchestration | 4 | ⬜ Not Started | FLO-002, FLO-003, FLO-004, FLO-018 |
| [FLO-020](FLO-020-hosting-deployment.md) | Hosting Deployment (Frontend, Backend, Database) | 4 | ⬜ Not Started | FLO-018, FLO-019 |
| [FLO-021](FLO-021-documentation-submission.md) | Documentation & Submission Package | 4 | ⬜ Not Started | FLO-011–FLO-017, FLO-019, FLO-020 |
| [FLO-022](FLO-022-cd-automation.md) | Automated CD via GitHub Actions | 5 | ⬜ Not Started | FLO-010, FLO-020 |
| [FLO-023](FLO-023-invoice-pdf-export.md) | Invoice Generation & PDF Export | 5 | ⬜ Not Started | FLO-015, FLO-016 |
| [FLO-024](FLO-024-product-image-s3.md) | Product Image Upload to AWS S3 | 5 | ⬜ Not Started | FLO-013, FLO-018 |

## Coverage check against the assignment

- Tech stack (Node/TS/Express/Postgres/REST, React/TS, responsive UI) → FLO-001–003, FLO-009.
- Auth + 4 roles → FLO-011.
- Customer CRM (all fields/features) → FLO-012.
- Product & Inventory + stock movement log → FLO-013, FLO-014.
- Sales Challan (draft/confirm, stock deduction, negative-stock guard, snapshot data, auto challan number) → FLO-015, FLO-016.
- API expectations (validation, status codes, pagination, search/filter) → FLO-007, FLO-008, applied in every Phase 3 spec's acceptance criteria.
- Deployment/DevOps (env vars, documented server setup, deployment) → FLO-018, FLO-019, FLO-020, FLO-021.
- GitHub repo with proper commits, README → [git-workflow.md](../steering/git-workflow.md), FLO-021.
- Bonus: Docker → FLO-019 (elevated to mandatory per project instructions). GitHub Actions deployment → FLO-022. Invoice PDF export → FLO-023. Product image to S3 → FLO-024.
- Submission requirements (Postman collection, architecture explanation, known limitations) → FLO-021.
