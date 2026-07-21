# FLO-013 — Product & Inventory Catalog Module

**Phase:** 3 — Core Business Modules

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Implement the product side of the assignment's Product and Inventory module: product CRUD (add/edit — no delete, per the assignment's listed features) with all required fields, search/pagination/filtering, and a low-stock indicator. This spec deliberately does **not** include the stock movement log itself (that's FLO-014, built on top of the product catalog this spec establishes) — it owns the product entity's own data and screens.

## User Story

As a Warehouse or Admin user, I want to add and edit products with their pricing, category, and stock-alert threshold, and quickly see which products are low on stock, so that I can keep the catalog accurate and know what needs reordering.

## Scope

**Included:**
- Backend REST endpoints: `POST /products`, `GET /products` (paginated, searchable by name/SKU, filterable by category and by low-stock status), `GET /products/:id`, `PATCH /products/:id`.
- All fields from the assignment: product name, SKU/code (unique), category, unit price, current stock, minimum stock alert quantity, location/warehouse.
- Zod schemas (`product.schema.ts`) in `packages/shared`, following FLO-012's established pattern.
- A derived `isLowStock` indicator (current stock ≤ minimum stock alert quantity), computed server-side and included in both list and detail responses, so the frontend never re-implements that comparison.
- Role access matrix (following FLO-012's precedent): read access broadly available; create/edit restricted appropriately (e.g., Admin and Warehouse) — decided and documented here.
- Frontend: `ProductsListPage` (`DataTable` with a low-stock visual indicator via the `Badge` atom, search, category filter, low-stock-only filter), `ProductFormPage` (add/edit, client-side validated via the shared schema and the form pattern established in FLO-012), `ProductDetailPage` (all fields; the stock-movement history table itself is added to this page by FLO-014, not this spec).

**Excluded:**
- Product deletion (not in the assignment's required feature list — only add/edit).
- The stock movement log/ledger itself, and any endpoint that changes `currentStock` directly (FLO-014 owns all stock mutation — this spec's `PATCH /products/:id` explicitly must **not** allow changing `currentStock`, to keep "what changes stock" a single, auditable code path).
- Product image upload (bonus — FLO-024, Phase 5).

## Acceptance Criteria

- [ ] `POST /products` creates a product with all required fields and returns `201`; a duplicate SKU returns `409 Conflict` via the FLO-007 error pattern.
- [ ] `GET /products?search=...` matches name/SKU; `GET /products?category=...` and `GET /products?lowStock=true` filter correctly; results are paginated per the FLO-008 envelope.
- [ ] `GET /products/:id` returns full product detail including the computed `isLowStock` field.
- [ ] `PATCH /products/:id` updates editable fields (name, category, unit price, minimum stock alert quantity, location) but rejects (or silently ignores, documented choice either way) any attempt to set `currentStock` directly through this endpoint.
- [ ] A user whose role isn't permitted to create/edit products receives `403`, per the documented role matrix.
- [ ] Frontend list page: search, category filter, and "low stock only" filter all work against the live backend; low-stock rows are visually distinguished (e.g., a warning `Badge`).
- [ ] Frontend add/edit form: validates required fields and numeric constraints (e.g., unit price ≥ 0, minimum stock alert quantity ≥ 0) client-side before submission, mirroring the shared Zod schema.
- [ ] Frontend detail page displays all fields correctly, including a clear low-stock warning when applicable.
- [ ] Unit/integration tests cover: backend service search/filter composition, the `currentStock` immutability guard on `PATCH`, uniqueness-conflict handling, route-level role enforcement, and frontend form validation + list filtering states.

## Technical Tasks

1. Define `product.schema.ts` (create/update/query schemas — update schema explicitly omits `currentStock`) in `packages/shared`.
2. Implement `ProductService` (create, paginated+searched+filtered list with `isLowStock` computed in the query/mapping layer, findById, update-excluding-stock) in `backend/src/services`.
3. Implement `ProductController` + `src/routes/products.route.ts` with `authenticate`/`authorize`/`validateRequest` per established patterns.
4. Document the role-access matrix for this module.
5. Build `ProductsListPage`, `ProductFormPage`, `ProductDetailPage` following FLO-012's frontend pattern (same `DataTable`/form-library/query approach).
6. Write backend and frontend tests per FLO-006 conventions, with explicit coverage of the "PATCH cannot mutate currentStock" guard.

## Dependencies

FLO-011.

## Implementation Notes

- The hard boundary — no endpoint in this spec ever mutates `currentStock` — is the single most important architectural decision in this module. It's what makes FLO-014's stock ledger the sole source of truth for stock changes, which in turn is what makes the Sales Challan (FLO-015) and Purchase Order (FLO-017) stock effects auditable and consistent instead of two different modules independently poking the same counter.
- `currentStock` still lives on the `Product` row (per FLO-004's schema) as a denormalized running total for fast reads (list/detail pages shouldn't have to sum the entire movement ledger on every request) — FLO-014 is responsible for keeping it consistent with the ledger, atomically, whenever a movement is recorded.
- Follow FLO-012's precedent for form library, query-state approach, and role-matrix documentation format so the codebase reads as one system, not four independently-styled modules.
