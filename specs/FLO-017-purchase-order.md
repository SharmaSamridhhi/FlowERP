# FLO-017 — Purchase Order Module

**Phase:** 3 — Core Business Modules

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Implement a purchase order module covering the "purchase orders" entity named in the assignment's Business Context but never detailed with fields or flows. This spec deliberately mirrors the Sales Challan's shape (multi-line document, auto-numbered, Draft/lifecycle status, snapshot line items, stock-affecting on completion) but on the inbound side: receiving a PO increases stock via FLO-014's ledger, the inverse of a confirmed challan. Scope is kept intentionally lean — no supplier CRM — since the assignment gives no basis to size this module any larger than "the thing that explains where IN stock movements come from."

## User Story

As a Warehouse or Admin user, I want to record a purchase order for incoming stock from a supplier and mark it received, so that receiving goods increases the correct products' stock with a clear audit trail, the same way a confirmed sales challan decreases it.

## Scope

**Included:**

- Backend REST endpoints: `POST /purchase-orders` (create as Draft; supplier name as a plain text field, no supplier entity/CRUD; line items with product id + quantity + unit cost), `GET /purchase-orders` (paginated, filterable by status, searchable by PO number/supplier name), `GET /purchase-orders/:id`, `PATCH /purchase-orders/:id` (edit a Draft), `POST /purchase-orders/:id/receive`, `POST /purchase-orders/:id/cancel`.
- Auto-generated, unique PO number (same race-safe generation approach decided in FLO-015, applied here for consistency — not reinvented).
- Line items store a product snapshot (name, SKU) alongside `productId`, plus unit cost as entered on the PO (a purchase cost, distinct from and not overwriting the product's sale `unitPrice`).
- Receive flow: within a transaction, for each line item calls `StockMovementService.recordMovement({ type: "IN", sourceType: "PURCHASE_ORDER", sourceId: po.id, ... })`, transitions status to Received. Unlike a challan confirm, a receive can never fail on a stock check (`IN` movements have no negative-stock constraint) — the only failure modes are state guards (already Received/Cancelled) and validation.
- Cancel flow: a Draft cancels with no stock effect; cancelling after Receive follows the same reversal policy decided in FLO-015 (compensating `OUT` movements), for consistency across both documents — document explicitly if this module's real-world stock/accounting implications make full symmetry inappropriate (e.g., cancelling a receive that already fed a confirmed sale would create negative stock — in that specific case, define the correct, safe error behavior rather than blindly mirroring the challan's policy).
- Zod schemas (`purchase-order.schema.ts`) in `packages/shared`.
- Frontend: `PurchaseOrdersListPage`, `PurchaseOrderBuilderPage` (supplier name field instead of a customer selector, otherwise structurally identical to FLO-016's line-item builder), `PurchaseOrderDetailPage` — reusing as much of FLO-016's line-item-table component/pattern as practical rather than rebuilding it.
- Role access: Warehouse and Admin can create/edit/receive/cancel; Sales/Accounts have read access (documented matrix).

**Excluded:**

- Any Supplier entity, supplier management screen, or supplier contact data beyond a free-text name — an explicit, documented scope cut given the assignment's silence on this entity (see [specs/README.md](README.md)).
- Partial receiving (receiving only some line items/quantities of a PO) — this spec models receive as all-or-nothing per PO, matching the assignment's level of detail (which gives none for this module) rather than inventing a more complex partial-fulfillment flow the assignment never asked for.

## Acceptance Criteria

- [x] `POST /purchase-orders` creates a Draft PO with an auto-generated unique PO number, correct line-item snapshots, and no stock effect.
- [x] `PATCH /purchase-orders/:id` edits a Draft's line items/supplier name; is rejected on a Received/Cancelled PO.
- [x] `POST /purchase-orders/:id/receive` on a Draft: transitions to Received and increases stock for every line item via `StockMovementService`, atomically; on an already-Received/Cancelled PO, is rejected with a clear state-guard error.
- [x] `POST /purchase-orders/:id/cancel` on a Draft succeeds with no stock effect; on a Received PO, follows the documented reversal policy, including the explicitly-defined behavior for the edge case where reversal would drive a product's stock negative (must not silently create negative stock — must error clearly, consistent with FLO-014's core guarantee).
- [x] `GET /purchase-orders` supports status filtering and PO-number/supplier-name search, paginated per the FLO-008 envelope.
- [x] Role checks: a Sales/Accounts-authenticated request to create/receive/cancel a PO returns `403`; read access works for all roles.
- [x] Frontend: the PO builder correctly composes multi-line items with per-line unit cost and a computed total cost; the list/detail pages mirror FLO-016's UX conventions (status badges, role-conditional actions, confirmation dialog before a stock-affecting cancel).
- [x] Unit/integration tests cover: PO-number generation uniqueness under concurrency, the receive flow's stock effect, the cancel-after-receive edge case (including the negative-stock guard), and role enforcement.

## Technical Tasks

1. Define `purchase-order.schema.ts` (create/update/query, line-item schema including unit cost) in `packages/shared`.
2. Reuse/extract the challan-number generation approach from FLO-015 into a shared, entity-agnostic sequence helper if that keeps both call sites consistent without duplicating logic (e.g., a `generateDocumentNumber(prefix)` utility) — a light, justified refactor of FLO-015's mechanism, not a rebuild.
3. Implement `PurchaseOrderService`: create (with snapshotting), update-draft, receive (transactional, calling `StockMovementService.recordMovement` per line item), cancel (with the documented policy and negative-stock edge-case handling), paginated/filtered/searched list, findById.
4. Implement controllers/routes with `authenticate`/`authorize`/`validateRequest`.
5. Build the frontend pages, extracting/reusing FLO-016's line-item-table component if its API is generic enough (product + quantity [+ optional unit cost/price field]) — otherwise, a close sibling implementation is acceptable rather than forcing a premature abstraction.
6. Write backend tests (receive stock effect, cancel-after-receive negative-stock guard, PO-number concurrency, role enforcement) and frontend tests (line-item logic, role-conditional UI) per FLO-006 conventions.

## Dependencies

FLO-013, FLO-014.

## Implementation Notes

- This module's biggest actual design risk is the cancel-after-receive-would-go-negative case — don't leave it undecided. The documented resolution (block the cancellation with a clear `409` explaining the product(s) that would go negative, rather than allowing negative stock or silently clamping to zero) must be written down here once decided and treated as this spec's answer to an assignment gap, the same way FLO-015 documents its own judgment calls.
- Deliberately does not depend on FLO-012 (Customer module) since a PO has no customer relation — only on FLO-013/FLO-014 (Product + Stock Ledger), which is what actually lets this spec be implemented in parallel with FLO-015/FLO-016 once FLO-014 is merged, rather than strictly after the Sales Challan work.
- If FLO-015 already exists by the time this spec is implemented, prefer reusing its challan-number generation and line-item-table UI patterns over reinventing them — but do not block this spec on FLO-015 being merged first if only FLO-013/FLO-014 are ready; the dependency list above is the real constraint, FLO-015 is a reuse opportunity, not a hard prerequisite.

### Decisions made during implementation

- **Cancel-after-receive negative-stock resolution (the module's core judgment call):** blocked with a `409`, never silently clamped or allowed to go negative. `cancelPurchaseOrder` pre-checks every line item's current stock against the quantity that would be reversed; if any would go negative, the whole cancel is rejected before any `recordMovement` call, with a structured `InsufficientStockItem[]` detail (reused from FLO-015/016 — same shape: `productId`, `productName`, `requestedQuantity`, `availableQuantity`) naming every offending product. `recordMovement`'s own atomic per-row `OUT` guard (FLO-014) remains the final race-safety net underneath this pre-check, exactly as `confirmChallan`'s insufficient-stock pre-check relies on it. Proven by a test that receives a PO, manually reduces the product's stock below the received quantity (simulating it being sold elsewhere via a challan), and asserts the cancel is rejected with the PO remaining Received and stock untouched.
- **FLO-015's number-generation mechanism was extracted, not reimplemented**, per Technical Task #2: `backend/src/utils/document-number.ts` now holds the entity-agnostic `createWithUniqueDocumentNumber` (the retry-on-`P2002` loop) and `generateNextDocumentNumber` (the date-scoped-sequence read). `sales-challan.service.ts`'s `createChallan` was refactored to use it too — a net simplification, not a behavior change (its 23 existing tests still pass unchanged). `createPurchaseOrder` uses the same helper with prefix `PO-{year}-`.
- **`usePurchaseOrderLineItems` is a close sibling of FLO-016's `useLineItems`, not a shared hook** — per Technical Task #5's explicit allowance. A PO line item carries a per-unit _cost_ entered by the user on each line (and editable via `setUnitCost`), not a _price_ snapshot looked up from the product; the two hooks' shapes only coincidentally overlap, and forcing one abstraction over both would have meant a generic "amount" field name that reads confusingly at both call sites.
- **Receive has no insufficient-... failure mode to map onto the UI.** Unlike a challan confirm, an `IN` movement can't fail on a stock check, so `PurchaseOrderBuilderPage`'s "Save & Receive" needs no per-row error mapping — only the cancel-after-receive path (on `PurchaseOrderDetailPage`) can produce the structured stock-block error, shown the same way FLO-016 shows insufficient-stock: a dismissible alert box listing every affected product.
