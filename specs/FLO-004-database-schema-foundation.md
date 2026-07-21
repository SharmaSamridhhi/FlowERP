# FLO-004 — Database Schema & ORM Migration Foundation

**Phase:** 1 — Project Foundation

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Introduce PostgreSQL and Prisma into the backend, and define the complete initial data model for the whole application in one place: users/roles, customers and follow-ups, products, stock movements, sales challans and their line items, and purchase orders and their line items. Defining the full schema now — even though most modules aren't built until Phase 3 — is what lets every later business spec proceed without ad hoc migrations that fight each other. This spec creates and migrates the schema; it does not build any API around it.

## User Story

As a backend developer, I want the complete relational schema for the application defined and migrated up front, so that every business module I build later reads and writes a schema that was designed holistically, not bolted on module-by-module.

## Scope

**Included:**

- Prisma installed in `backend/`, connected to a local PostgreSQL instance via `DATABASE_URL`.
- Prisma schema, split by business domain under `prisma/schema/` (multi-file schema, stable as of the Prisma version this project uses — see Implementation Notes), modeling:
  - `User` (id, name, email, password hash, role enum: `ADMIN | SALES | WAREHOUSE | ACCOUNTS`, timestamps).
  - `Customer` (name, mobile, email, business name, GST number optional, type enum `RETAIL | WHOLESALE | DISTRIBUTOR`, address, status enum `LEAD | ACTIVE | INACTIVE`, follow-up date, notes, timestamps, `createdBy` relation to `User`).
  - `CustomerFollowUp` (customer relation, note text, author relation to `User`, timestamp) — models "add follow-up notes" as an append-only sub-resource rather than overwriting the customer's single `notes` field.
  - `Product` (name, SKU/code unique, category, unit price, current stock, minimum stock alert quantity, location/warehouse, timestamps).
  - `StockMovement` (product relation, quantity changed, type enum `IN | OUT`, reason, `createdBy` relation to `User`, timestamp, optional polymorphic-ish reference fields — a nullable `sourceType` enum and `sourceId` — so a movement can be traced back to the challan or purchase order that caused it).
  - `SalesChallan` (auto-generated challan number unique, customer relation, status enum `DRAFT | CONFIRMED | CANCELLED`, total quantity, `createdBy` relation to `User`, timestamps).
  - `SalesChallanItem` (challan relation, product relation, **snapshotted** product name/SKU/unit price at time of add, quantity).
  - `PurchaseOrder` (auto-generated PO number unique, supplier name text field, status enum `DRAFT | RECEIVED | CANCELLED`, `createdBy` relation to `User`, timestamps).
  - `PurchaseOrderItem` (PO relation, product relation, snapshotted product name/SKU, quantity, unit cost).
- Initial migration generated and applied.
- A seed script stub (`prisma/seed.ts`) that, for now, only proves the seeding pipeline runs — actual seed data (demo users per role, sample customers/products) is added incrementally by the specs that own that data (FLO-011 seeds users, etc.) so seeding stays coupled to the module that understands the data's shape.
- Indexes on frequently-filtered/searched columns (customer name/mobile/email, product SKU/name, challan number, PO number).

**Excluded:**

- Any repository/service code that queries these models (each Phase 3 module writes its own data-access layer).
- Zod validation schemas for these entities (FLO-007/FLO-008) — this spec is the persistence layer only.
- Invoice table — deferred to FLO-023, where the Invoice model and its relation to `SalesChallan` are defined alongside the feature that uses it, keeping this foundational migration focused on what Phase 3 actually needs.

## Acceptance Criteria

- [ ] `npx prisma migrate dev` runs clean against a local Postgres instance and produces the full schema described above.
- [ ] `npx prisma generate` produces a typed Prisma client with no schema errors.
- [ ] Every model has appropriate `@relation` foreign keys and `onDelete` behavior considered explicitly (e.g., prevent deleting a `Product` referenced by existing `StockMovement`/challan/PO rows — document the chosen restrict/cascade policy per relation).
- [ ] Enum fields (`role`, customer `type`/`status`, movement `type`, challan/PO `status`) are modeled as Prisma enums, not free-text strings.
- [ ] `SalesChallanItem` and `PurchaseOrderItem` store snapshot fields (name/SKU/price) independent of the live `Product` row, verified by inspecting the generated schema/client types.
- [ ] Unique constraints exist on `Product.sku`, `SalesChallan.challanNumber`, `PurchaseOrder.poNumber`, `User.email`.
- [ ] `npx prisma migrate reset` (local only) tears down and rebuilds the schema from migrations without manual intervention, confirming migrations are reproducible.

## Technical Tasks

1. Add Prisma + `@prisma/client` to `backend/`; run `prisma init`.
2. Model each entity listed above under `prisma/schema/` (one file per domain — `user`, `customer`, `product`, `stock-movement`, `sales-challan`, `purchase-order` — plus a `base.prisma` holding the `generator`/`datasource` blocks), including enums and relations. Cross-file model relations work without any import syntax; Prisma merges the folder into one logical schema.
3. Decide and annotate `onDelete` behavior per relation (favor `Restrict` for anything that would silently orphan financial/audit data, e.g., don't let a `Product` with stock history be hard-deleted).
4. Add the indexes called out in acceptance criteria.
5. Generate and commit the initial migration (`prisma/migrations/...`).
6. Add a `prisma/seed.ts` stub wired into `package.json`'s `prisma.seed` config, doing nothing more than connecting and logging — later specs extend it.
7. Document the local Postgres connection setup (how `DATABASE_URL` is expected to look for local dev) — brief, full env doc is FLO-018.

## Dependencies

FLO-001, FLO-002.

## Implementation Notes

- `StockMovement.sourceType`/`sourceId` is a deliberate light-touch traceability mechanism (not a full polymorphic association pattern) so FLO-014/015/017 can record _why_ a movement happened without redesigning the ledger later. Keep it simple: an enum (`CHALLAN | PURCHASE_ORDER | MANUAL`) plus a nullable UUID.
- Snapshotting on challan/PO line items is a hard requirement from the assignment ("Challan should store product snapshot data, not only product ID") — do not model `SalesChallanItem`/`PurchaseOrderItem` as a bare foreign key to `Product` with no duplicated fields.
- Money/price fields should use a `Decimal` (Prisma `Decimal` type / Postgres `numeric`), never a float, to avoid rounding errors in totals.
- This spec intentionally does not create a `Supplier` model — Purchase Orders (FLO-017) use a plain `supplierName` text field per the scope decision recorded in [specs/README.md](README.md).
- `prisma`/`@prisma/client` are pinned to `6.19.3`, not the `7.x` latest at implementation time, because Prisma 7 requires Node ≥22 while this project targets Node 20.19.0 per [FLO-001](FLO-001-monorepo-foundation.md)'s `.nvmrc`. Re-evaluate this pin if/when the project's Node baseline moves.
- The schema is split into `prisma/schema/*.prisma` (one file per domain) rather than a single `schema.prisma`, using Prisma's multi-file schema support — a preview feature at one point in Prisma's history, stable with no flag required by the version pinned here. Verify this is still the CLI's default expectation before assuming it for a future Prisma upgrade.
