# FLO-012 — Customer CRM Module

**Phase:** 3 — Core Business Modules

## Description

Implement the assignment's Customer CRM module in full: backend CRUD + search/pagination + follow-up notes API, and the corresponding frontend screens (list, add/edit form, detail page with follow-up history). This is the first fully-realized vertical slice built on every Phase 1/2 foundation — it sets the concrete pattern (Zod schema in `packages/shared` → service/controller/routes → `DataTable`-based list page → detail page) that FLO-013, FLO-015, and FLO-017 will each follow for their own entity.

## User Story

As a Sales user, I want to create, edit, search, and view customers, including logging follow-up notes over time, so that I can manage the customer relationship and know who needs a follow-up and when.

## Scope

**Included:**
- Backend REST endpoints: `POST /customers`, `GET /customers` (paginated, searchable by name/mobile/email/business name, filterable by `type` and `status`), `GET /customers/:id` (includes follow-up history), `PATCH /customers/:id`, `POST /customers/:id/follow-ups` (append a follow-up note; also updates the customer's `followUpDate` if provided).
- All fields from the assignment: name, mobile, email, business name, GST number (optional), type (Retail/Wholesale/Distributor), address, status (Lead/Active/Inactive), follow-up date, notes.
- Zod schemas (`customer.schema.ts`) in `packages/shared` for create/update/query, following FLO-008's pagination/search convention.
- Role access: all four roles can view customers (Warehouse/Accounts arguably need read access for order context); Admin and Sales can create/edit and add follow-ups — decide and document the exact matrix here (this is the first module to make that judgment call; later modules follow its precedent).
- Frontend: `CustomersListPage` (uses `DataTable`, `SearchBar`, `Pagination` from FLO-009; filter controls for type/status), `CustomerFormPage`/modal (add + edit, using `FormField` atoms, client-side validation via the shared Zod schema), `CustomerDetailPage` (all fields + chronological follow-up notes list + an add-follow-up form).
- Empty/loading/error states on every screen, using FLO-009's `DataTable` states and FLO-008's typed API errors surfaced via the `Toast` molecule.

**Excluded:**
- Customer deletion (not requested by the assignment — only add/edit/search/view/follow-up are listed).
- Any linkage to Sales Challans (a customer's challan history) — that view is added when FLO-016 (Sales Challan frontend) exists; this spec's detail page shows customer + follow-ups only.
- Bulk import/export of customers.

## Acceptance Criteria

- [ ] `POST /customers` with valid data creates a customer and returns `201`; missing required fields return `400` with field-level errors; an invalid `type`/`status` enum value is rejected.
- [ ] `GET /customers?search=...` matches against name, mobile, email, and business name (case-insensitive partial match); `GET /customers?type=WHOLESALE&status=ACTIVE` filters correctly; results are paginated per the FLO-008 envelope.
- [ ] `GET /customers/:id` returns full customer detail including an ordered (most-recent-first) list of follow-up notes; a non-existent id returns `404`.
- [ ] `PATCH /customers/:id` updates only provided fields; a partial update doesn't clobber unspecified fields.
- [ ] `POST /customers/:id/follow-ups` appends a note attributed to the authenticated user with a timestamp, and does not overwrite prior notes.
- [ ] A user whose role isn't permitted to create/edit customers receives `403` on those endpoints, per the documented role matrix; read access works for all roles per that same matrix.
- [ ] Frontend list page: searching, filtering by type/status, and paginating all work against the live backend, with the URL/query state reflecting the current search+filter+page (so a refresh doesn't lose context) — or, at minimum, in-memory state that behaves correctly across a session if URL-syncing is deferred; either choice must be documented.
- [ ] Frontend add/edit form: client-side validation errors surface per-field before submission; a successful submit navigates to the customer's detail page and shows a success toast; a server-side validation error (e.g., a race-condition duplicate) surfaces clearly, not as a silent failure.
- [ ] Frontend detail page: displays all customer fields and the full follow-up history; submitting a new follow-up note appends it to the list without a full page reload.
- [ ] Unit/integration tests cover: backend service logic (search/filter query composition, follow-up append), backend route auth (403 for disallowed roles), and frontend form validation + list rendering states.

## Technical Tasks

1. Define `customer.schema.ts` (create/update/query/follow-up schemas) in `packages/shared`.
2. Implement `CustomerService` (Prisma queries: create, paginated+searched+filtered list, findById-with-follow-ups, update, addFollowUp) in `backend/src/services`.
3. Implement `CustomerController` + `src/routes/customers.route.ts`, applying `authenticate`, `authorize(...)`, and `validateRequest` per FLO-011/FLO-007 patterns.
4. Decide and document the role-access matrix for this module (who can read/write) in this file's implementation notes and enforce it via `authorize(...)`.
5. Build `CustomersListPage` composing `DataTable`/`SearchBar`/`Pagination`/filter controls, fetching via TanStack Query + the FLO-008 API client.
6. Build `CustomerFormPage` (shared between add/edit), using `FormField` atoms and the shared Zod schema for client-side validation (e.g., via a resolver into whatever form library is chosen — see Implementation Notes).
7. Build `CustomerDetailPage` with the follow-up list and add-follow-up form.
8. Write backend tests (service + route level) and frontend tests (form validation, list states, detail page render) per FLO-006 conventions.

## Dependencies

FLO-011.

## Implementation Notes

- This spec makes the concrete choice of form-handling approach for the whole frontend going forward (e.g., `react-hook-form` with a Zod resolver is the natural fit given the shared-schema architecture from FLO-008) — pick it here, document the choice, and every later frontend spec (FLO-013, FLO-016, FLO-017) follows it rather than re-deciding.
- Follow-up notes are modeled as an append-only sub-resource (FLO-004's `CustomerFollowUp` table), not as overwrites to a single `notes` string, so history is preserved — the assignment's plain "Notes" field on the customer can still exist for a general/free-text field, distinct from the timestamped follow-up log.
- Whichever role matrix is chosen here, write it down explicitly (a small table in this file or a shared `ROLES.md`) — FLO-013/015/017 will each need to make an analogous call and should be able to point at this precedent instead of re-litigating role philosophy from scratch.
