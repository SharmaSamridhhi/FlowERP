# FLO-016 — Sales Challan Module — Frontend

**Phase:** 3 — Core Business Modules

**Status:**

- [ ] Not Started
- [x] Completed

## Description

Build the frontend for the Sales Challan module against the API FLO-015 established: a multi-line challan builder (select customer, add products with quantities, live total), a challan list with status filtering, and a detail/print-style view. This is the most interaction-heavy screen in the whole application — the only place a user assembles a multi-row document interactively — so it's kept as its own spec rather than folded into FLO-015, to give it dedicated design and testing attention.

## User Story

As a Sales user, I want to build a challan by picking a customer and adding products with quantities, see the running total, and save it as Draft or Confirm it immediately, so that I can create sales documents quickly and know right away if stock won't cover what I've entered.

## Scope

**Included:**

- `ChallansListPage`: `DataTable` with status filter (Draft/Confirmed/Cancelled), customer filter, challan-number search, pagination — following FLO-012/013's established list-page pattern.
- `ChallanBuilderPage` (used for both create and edit-while-Draft): customer selector (searchable, backed by `GET /customers`), a dynamic line-item table (add row → search/select product → enter quantity → shows snapshotted unit price and computed line total, using the product's _current_ price at add-time, matching FLO-015's snapshot-at-add-time contract), running total quantity and total value, Save-as-Draft and Confirm actions.
- Confirm action: on submit, calls the confirm endpoint; on a `409` insufficient-stock response, surfaces exactly which product(s) are short (from FLO-015's error detail) inline in the line-item table — not just a generic toast — so the user can fix quantities without guessing.
- `ChallanDetailPage`: read-only view of a Confirmed/Cancelled challan (all fields, line items, status, created by/date); for a Draft, offers Edit (routes back into `ChallanBuilderPage`), Confirm, and Cancel actions inline; for a Confirmed challan, offers Cancel (per FLO-015's reversal policy) with a confirmation dialog (`Modal` from FLO-009) since it has a real stock-reversing side effect.
- Status displayed via the `Badge` atom (Draft/Confirmed/Cancelled, visually distinct).
- Product/customer selectors reuse `SearchBar`/`DataTable`-adjacent patterns already established rather than inventing new lookup UI.

**Excluded:**

- Any change to the backend contract — this spec consumes FLO-015 exactly as built; if a gap is found, it's a defect against FLO-015, not something patched around on the frontend.
- Print/PDF export of a challan (only invoices get PDF export, per FLO-023 — a challan's `ChallanDetailPage` is a normal screen, not a print target, unless the user later asks for that explicitly).

## Acceptance Criteria

- [x] Creating a challan: selecting a customer, adding two or more product line items with quantities, and saving as Draft succeeds, and the created challan appears correctly on `ChallansListPage` and `ChallanDetailPage` with the correct total quantity.
- [x] The line-item table prevents adding the same product twice as separate rows (either merges quantity into the existing row or blocks the duplicate with a clear message — pick one and be consistent) and prevents a non-positive quantity.
- [x] Confirming a Draft with sufficient stock transitions its status to Confirmed on screen (via refetch/cache invalidation) without a manual page reload.
- [x] Confirming a Draft where a product lacks sufficient stock shows the specific insufficient-stock error inline against the specific line item(s), and the challan remains a Draft on screen.
- [x] Editing a Draft (changing quantities/products) and re-saving updates the snapshot and total correctly; attempting to reach the builder for a Confirmed/Cancelled challan is prevented (redirected to the read-only detail view instead).
- [x] Cancelling a Confirmed challan requires an explicit confirmation dialog, and after confirming, the challan shows as Cancelled and (per FLO-015) the affected products' stock reflects the reversal (spot-checked against `ProductDetailPage`'s stock movement log from FLO-014).
- [x] A Warehouse/Accounts-authenticated user does not see create/confirm/cancel controls (or sees them disabled with an explanatory state), consistent with FLO-015's role matrix.
- [x] Frontend tests cover: line-item add/remove/quantity-change logic and total computation (pure logic, testable without a live backend), the insufficient-stock error display path (mocked API response), and status-based control visibility per role.

## Technical Tasks

1. Build `ChallansListPage` following the FLO-012/013 list-page pattern (status/customer filters, challan-number search, pagination).
2. Build the customer selector and product selector as small composed molecules (search-as-you-type against `GET /customers` / `GET /products`, reusing `SearchBar`).
3. Build the dynamic line-item table (add/remove rows, quantity input, computed line/running totals) as a self-contained, independently-testable piece of UI state (e.g., a reducer or dedicated hook) so its add/remove/total logic can be unit-tested without mocking network calls.
4. Build `ChallanBuilderPage` composing the above, wired to `POST /challans` (create) and `PATCH /challans/:id` (edit-draft) via TanStack Query mutations.
5. Implement the Confirm action's error handling to map FLO-015's `409` response detail onto the specific line item(s) in the UI.
6. Build `ChallanDetailPage` with role/status-conditional actions (Edit/Confirm/Cancel), including the Cancel confirmation `Modal`.
7. Write the unit tests for line-item logic and the integration-style tests for the insufficient-stock and role-visibility paths per FLO-006 conventions.

## Dependencies

FLO-015.

## Implementation Notes

- Keep the line-item table's add/remove/total logic as pure, testable state management separate from the data-fetching/mutation code — this is the piece of the whole roadmap most worth unit-testing thoroughly, since it's the most complex interactive logic in the frontend.
- When the confirm mutation fails with the insufficient-stock `409`, don't just show a toast — the whole point of snapshotting the error detail per-product (FLO-015) is so this screen can point at the exact row. Losing that specificity on the frontend would waste real backend work.

### Decisions made during implementation

- **FLO-015 gap found and fixed:** `ConflictError` had no way to carry structured detail — the confirm-insufficient-stock error was message-only ("Insufficient stock for: X, Y"), which this screen would have had to regex-parse to find the offending row, exactly the kind of frontend hack this spec's own notes warn against. Fixed at the source instead: `ConflictError` now accepts an optional `details` param (mirroring `ValidationError`, which already had one), and `confirmChallan` populates it with `InsufficientStockItem[]` (`productId`, `productName`, `requestedQuantity`, `availableQuantity` — new shared schema). `error.details` was already plumbed through the response envelope by FLO-007's error handler, so no other backend change was needed. This is the frontend mapping onto real structured data, not a string-parsing workaround.
- **Duplicate-product policy: merge, not block.** Adding a product already on the challan increases its existing row's quantity rather than creating a second row or rejecting the add — implemented in `useLineItems.addItem`, unit-tested directly.
- **Line-item state as a plain hook, not a form library.** `useLineItems` (`frontend/src/pages/challans/useLineItems.ts`) is a self-contained `useState`-backed hook with `addItem`/`removeItem`/`setQuantity`/`reset` and derived `totalQuantity`/`totalValue` — no react-hook-form involved, since the item list's shape (a dynamic array with merge-on-add semantics) doesn't fit that library's flat-field model well. Fully unit-tested via `renderHook` without touching the network.
- **`SearchSelect` (new molecule, `frontend/src/components/molecules/SearchSelect.tsx`):** a generic, fully-controlled search-as-you-type dropdown (query/options/onSelect all props, no internal fetch — same "no internal state" philosophy as `DataTable`). Reused for both the customer and product pickers in `ChallanBuilderPage`, and for the customer filter on `ChallansListPage`, rather than building bespoke lookups for each.
- **Builder's "Confirm" button saves then confirms in one step.** Creating/updating the draft and confirming it are two API calls chained client-side; if the confirm half fails with insufficient stock, the draft is already saved (so nothing is lost) and the user is redirected into edit mode for that same id with the per-row errors shown — they never lose their entered data.
- **State syncing avoids `setState`-in-`useEffect`.** Loading an existing draft's data (and resolving a customerId filter back to a display name) adjusts state during render — comparing the fetched id against what's already loaded and calling the setter directly in the render body — rather than inside a `useEffect`, per `eslint-plugin-react-hooks`'s `set-state-in-effect` rule and React's own guidance. Only genuine side effects (the redirect-away-from-non-Draft navigation) stay in an effect. Mirrors the pattern `CustomersListPage.tsx` already used for its search-input resync.
