# FLO-014 — Stock Movement Ledger

**Phase:** 3 — Core Business Modules

**Status:**

- [ ] Not Started
- [ ] Completed

## Description

Implement the stock movement log required by the assignment's Product and Inventory module as a standalone, reusable backend service plus its read-only frontend view. This is the single, atomic, auditable code path through which `Product.currentStock` is ever allowed to change — FLO-013 explicitly forbids direct mutation, and FLO-015 (Sales Challan) and FLO-017 (Purchase Order) both call into this service rather than touching `currentStock` themselves. Isolating it here, before either of those modules exists, is what lets both depend on one correct, tested implementation instead of each reimplementing stock arithmetic.

## User Story

As a Warehouse or Accounts user, I want every stock change — in or out, and why — recorded with who made it and when, so that current stock levels are always traceable back to a specific cause.

## Scope

**Included:**

- Backend `StockMovementService.recordMovement({ productId, quantity, type: IN|OUT, reason, createdBy, sourceType?, sourceId? })`: inside a single Prisma transaction, creates the `StockMovement` row and atomically increments/decrements `Product.currentStock`; for `OUT` movements, enforces stock cannot go negative (throws a `ConflictError` if the requested quantity exceeds current stock) — this is the shared enforcement point FLO-015's "stock should not go negative" and "insufficient stock returns a proper error" requirements are actually implemented against.
- A manual-adjustment endpoint: `POST /products/:id/stock-movements` (reason required, e.g., "damaged goods", "stock count correction"), restricted to Warehouse/Admin, so the assignment's "IN or OUT" movement types are usable outside the challan/PO flows too (not every stock change traces back to a sale or purchase).
- `GET /products/:id/stock-movements` (paginated, most-recent-first) — the log view itself, listing product, quantity changed, type, reason, created by, timestamp exactly as the assignment specifies.
- Zod schema (`stock-movement.schema.ts`) in `packages/shared`.
- Frontend: a `StockMovementLog` organism (a read-only, paginated table — reusing `DataTable`/`Pagination` from FLO-009) embedded into `ProductDetailPage` (extending the page FLO-013 created) and a small manual-adjustment form/modal for Warehouse/Admin users.

**Excluded:**

- Any logic for _when_ a movement should be recorded from a business event — FLO-015 and FLO-017 own deciding _that_ a challan confirmation or PO receipt should call `recordMovement`; this spec only owns making that call safe, atomic, and correctly enforced once invoked.
- Editing or deleting past stock movements (an audit log is append-only by definition; corrections happen via a new offsetting movement with a clear reason, not by mutating history).

## Acceptance Criteria

- [ ] `recordMovement` with an `IN` type always succeeds (given a valid product) and increases `Product.currentStock` by the exact quantity, with a corresponding `StockMovement` row created in the same transaction.
- [ ] `recordMovement` with an `OUT` type that would take `currentStock` below zero throws a `ConflictError` (`409`), and neither the `Product.currentStock` nor a `StockMovement` row is modified/created — verified with a test asserting no partial state change (transaction rollback works).
- [ ] `recordMovement` with an `OUT` type within available stock succeeds and decreases `currentStock` by the exact quantity.
- [ ] Two concurrent `OUT` movements against the same product that would together exceed available stock cannot both succeed (only one succeeds, the other receives the insufficient-stock error) — verified with a test that issues them concurrently, proving the transaction actually serializes/guards correctly rather than racing.
- [ ] `POST /products/:id/stock-movements` (manual adjustment) is rejected with `403` for roles outside the documented allowed set, and requires a non-empty `reason`.
- [ ] `GET /products/:id/stock-movements` returns entries ordered most-recent-first, paginated per the FLO-008 envelope, with all required fields (product, quantity changed, type, reason, created by, timestamp) present.
- [ ] Frontend: `ProductDetailPage` shows the movement log with correct pagination; the manual-adjustment form is visible only to permitted roles and a successful submission refreshes the log without a full page reload.
- [ ] Unit tests directly exercise `StockMovementService.recordMovement`'s transactional and negative-stock-guard behavior in isolation (not only through the manual-adjustment HTTP endpoint), since FLO-015/FLO-017 will call this service directly, not through HTTP.

## Technical Tasks

1. Define `stock-movement.schema.ts` (manual-adjustment request schema, query schema) in `packages/shared`.
2. Implement `StockMovementService.recordMovement(...)` in `backend/src/services`, using a Prisma `$transaction` covering both the `StockMovement` insert and the `Product.currentStock` update, with the negative-stock guard evaluated inside the transaction (not as a separate pre-check subject to a race).
3. Implement the manual-adjustment controller/route and the list/log controller/route, both applying `authenticate`/`authorize`/`validateRequest`.
4. Write the concurrency test (e.g., firing two overlapping `recordMovement` calls against a product with limited stock via `Promise.all` and asserting exactly one throws).
5. Build the `StockMovementLog` organism and embed it in `ProductDetailPage`; build the manual-adjustment form/modal.
6. Write backend and frontend tests per FLO-006 conventions.

## Dependencies

FLO-013.

## Implementation Notes

- This is the module where correctness matters most in the entire backend: two other modules' core business rules ("stock should not go negative," "if stock is insufficient, API should return a proper error") are only as correct as this service's transaction handling. Prioritize the concurrency test over anything else in this spec's acceptance criteria if time-constrained.
- `sourceType`/`sourceId` (from FLO-004's schema) get populated by callers — FLO-015 passes `sourceType: "CHALLAN", sourceId: challan.id`; FLO-017 passes `sourceType: "PURCHASE_ORDER", sourceId: po.id`; the manual-adjustment endpoint in this spec passes `sourceType: "MANUAL", sourceId: null`. Keep `recordMovement`'s signature accepting these as optional parameters now so FLO-015/017 don't need to modify this service later — they only need to call it correctly.
- Exposed as a service method (not only reachable via this spec's own HTTP endpoint) specifically so FLO-015 and FLO-017 import and call `StockMovementService` directly from within their own request-handling transactions, rather than making an internal HTTP call to this module — keep it a plain importable service class/function, not something that assumes it's always invoked over HTTP.
