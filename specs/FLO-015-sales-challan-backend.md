# FLO-015 — Sales Challan Module — Backend

**Phase:** 3 — Core Business Modules

## Description

Implement the backend for the assignment's Sales Challan module: multi-line challan creation, auto-generated challan numbers, Draft/Confirmed/Cancelled lifecycle, product-snapshot line items, and the stock-deduction business rule enforced through FLO-014's `StockMovementService`. This is the most business-logic-dense module in the assignment and is split from its frontend (FLO-016) because the transactional correctness here — confirm-time stock deduction, snapshotting, negative-stock rejection — deserves focused implementation and testing before any UI is built against it.

## User Story

As a Sales user, I want to build a challan for a customer with multiple products and quantities, save it as a draft or confirm it immediately, so that confirmed challans reliably and safely reduce stock while drafts don't affect inventory at all.

## Scope

**Included:**
- Backend REST endpoints: `POST /challans` (create as Draft; body includes customer id and line items with product id + quantity), `GET /challans` (paginated, filterable by status/customer, searchable by challan number), `GET /challans/:id`, `PATCH /challans/:id` (edit a Draft's customer/line items — Confirmed/Cancelled challans are immutable except for status transitions), `POST /challans/:id/confirm`, `POST /challans/:id/cancel`.
- Auto-generated, human-readable, unique challan number (e.g., a date-scoped sequence like `CH-2026-000123`) assigned at creation.
- Line items store a **product snapshot** (name, SKU, unit price at time of add) alongside the live `productId` reference, per the assignment's explicit requirement — snapshot is captured at line-item creation/edit time, not re-derived later.
- Confirm flow: within a single transaction, for each line item calls `StockMovementService.recordMovement({ type: "OUT", sourceType: "CHALLAN", sourceId: challan.id, ... })`; if **any** line item has insufficient stock, the entire confirmation is rejected (`409`, clear message naming the offending product) and no line item's stock is touched — an all-or-nothing confirm, not a partial one.
- Cancel flow: a Draft can be cancelled with no stock effect; a Confirmed challan being cancelled reverses its stock effect (records compensating `IN` movements with `reason: "Challan cancelled"`) — decide and document this explicitly, since the assignment doesn't specify cancel-after-confirm behavior and it's a real gap requiring a judgment call.
- Total quantity computed and stored/returned per the assignment's field list.
- Zod schemas (`sales-challan.schema.ts`) in `packages/shared`.
- Role access: Sales and Admin can create/edit/confirm/cancel; Warehouse/Accounts have read access (documented matrix, following FLO-012's precedent).

**Excluded:**
- Any UI (FLO-016).
- Invoice generation from a confirmed challan (FLO-023, Phase 5, per the scope decision in [specs/README.md](README.md)).
- Editing a Confirmed challan's line items (only Draft challans are editable; a Confirmed challan can only transition to Cancelled).

## Acceptance Criteria

- [ ] `POST /challans` creates a Draft challan with an auto-generated, unique challan number, correct total quantity, and snapshotted line-item data (name/SKU/price) independent of the live product row, without affecting any product's `currentStock`.
- [ ] `PATCH /challans/:id` on a Draft can add/remove/update line items and re-snapshots changed items; the same operation on a Confirmed or Cancelled challan is rejected (`409` or `400`, documented choice).
- [ ] `POST /challans/:id/confirm` on a Draft with sufficient stock for every line item: transitions status to Confirmed, deducts stock for every line item via `StockMovementService`, and is atomic — verified by a test.
- [ ] `POST /challans/:id/confirm` where at least one line item has insufficient stock: returns `409` naming the specific product(s) short on stock, transitions **no** stock and leaves the challan status as Draft (not partially confirmed) — verified by a test asserting zero stock movements were created.
- [ ] `POST /challans/:id/confirm` on an already-Confirmed or Cancelled challan is rejected with a clear error (idempotency/state-guard, not a silent no-op or duplicate stock deduction).
- [ ] `POST /challans/:id/cancel` on a Draft succeeds with no stock effect; on a Confirmed challan succeeds and reverses stock via compensating `IN` movements, per the documented cancel-after-confirm policy.
- [ ] `GET /challans` supports filtering by status and customer, and searching by challan number, paginated per the FLO-008 envelope.
- [ ] Role checks: a Warehouse/Accounts-authenticated request to create/confirm/cancel a challan returns `403`.
- [ ] Concurrency: confirming two challans that together over-commit the same product's stock — one succeeds, the other correctly fails with the insufficient-stock error (this follows directly from FLO-014's guarantees but must be proven again at this module's integration level, since it's the assignment's headline business rule).

## Technical Tasks

1. Define `sales-challan.schema.ts` (create/update/query schemas, line-item schema) in `packages/shared`.
2. Implement challan-number generation (e.g., a small `ChallanNumberService` or a Postgres sequence/counter table — pick one approach and document it; avoid a naive `count()+1` which races under concurrent creation).
3. Implement `SalesChallanService`: create (with snapshotting), update-draft, confirm (transactional, all-or-nothing, calling `StockMovementService.recordMovement` per line item), cancel (with the documented reversal policy), paginated/filtered/searched list, findById.
4. Implement controllers/routes with `authenticate`/`authorize`/`validateRequest`, per established patterns.
5. Write the insufficient-stock test asserting **zero** side effects on partial failure — this is the single most important test in this spec.
6. Write the concurrent-confirm test.
7. Write role-enforcement and CRUD-lifecycle tests (draft-editable, confirmed-immutable, cancel behavior for both states).

## Dependencies

FLO-012, FLO-013, FLO-014.

## Implementation Notes

- The confirm flow's all-or-nothing guarantee is the module's core contract: never call `recordMovement` line-by-line outside a single enclosing transaction that can still roll back everything if a later line item fails. Wrap the whole confirm operation (status transition + every line item's `recordMovement` call) in one Prisma `$transaction`.
- The cancel-after-confirm stock-reversal policy is an explicit scope decision this spec makes because the assignment is silent on it — document the choice made (reverse via compensating IN movements) directly in this file so it's not rediscovered as an ambiguity mid-implementation.
- Challan-number generation must be race-safe under concurrent creates — a `SELECT MAX + 1` pattern without a DB-level guarantee (unique constraint + retry, or an atomic sequence) will produce duplicate numbers under load; the unique constraint from FLO-004 on `challanNumber` should be treated as a safety net that a test can deliberately trigger (via forced concurrency) to confirm the generation strategy actually holds up, not just as documentation.
