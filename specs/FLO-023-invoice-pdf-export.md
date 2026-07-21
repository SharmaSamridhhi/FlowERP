# FLO-023 — Invoice Generation & PDF Export

**Phase:** 5 — Engineering Improvements (Good Practices II)

**Status:**
- [ ] Not Started
- [ ] Completed

## Description

Implement the "invoices" entity named in the assignment's Business Context and the "Export invoice as PDF" bonus point, modeled as a document generated from a Confirmed Sales Challan — the standard wholesale/distribution flow (challan is the delivery record, invoice is the billing record derived from it). This is placed in Phase 5 because it's explicitly a bonus feature, and because Sales Challan (FLO-015/016) is fully functional as the assignment's actual required deliverable without it — deferring invoicing doesn't block or compromise any earlier phase.

## User Story

As an Accounts user, I want to generate an invoice from a confirmed challan and download it as a PDF, so that I have a billing document I can send to the customer.

## Scope

**Included:**
- Backend: `Invoice` Prisma model (added now, not in FLO-004, per the scope decision recorded in [specs/README.md](README.md)) — invoice number (auto-generated, same generation approach as challans/POs for consistency), relation to its source `SalesChallan` (one invoice per challan; generating twice for the same challan is rejected), line items and totals **copied from the challan's own snapshotted line items** at generation time (not re-fetched from live product data), generated-by/generated-at fields.
- `POST /challans/:id/invoice` (generates the invoice; only valid for a Confirmed challan), `GET /invoices` (paginated, searchable/filterable), `GET /invoices/:id`, `GET /invoices/:id/pdf` (streams a generated PDF).
- PDF generation via a lightweight PDF library (e.g., `pdfkit` or `@react-pdf/renderer`) producing a clean, readable invoice document: company/customer details, line items with quantities/prices/line totals, grand total, invoice number, date.
- Zod schema (`invoice.schema.ts`) in `packages/shared`.
- Frontend: an "Generate Invoice" action on `ChallanDetailPage` (FLO-016) visible only for Confirmed challans that don't already have one; an `InvoicesListPage` and `InvoiceDetailPage` with a "Download PDF" action.
- Role access: Accounts and Admin can generate invoices; broader read access, following the established role-matrix precedent.

**Excluded:**
- Editing an invoice after generation (an invoice is a generated snapshot of a confirmed challan at a point in time — corrections happen by addressing the underlying challan/business process, not by mutating a billing document after the fact).
- Payment tracking/status (paid/unpaid, partial payments) — not mentioned anywhere in the assignment; out of scope for this bonus feature.
- Emailing the invoice to the customer — the assignment's bonus is specifically "Export invoice as PDF," which this spec satisfies via download; sending it is a further feature not requested.

## Acceptance Criteria

- [ ] `POST /challans/:id/invoice` on a Confirmed challan without an existing invoice creates one, with line items and totals matching the challan's snapshotted data exactly.
- [ ] Attempting to generate an invoice for a Draft or Cancelled challan is rejected with a clear error.
- [ ] Attempting to generate a second invoice for a challan that already has one is rejected (`409`), not silently creating a duplicate.
- [ ] `GET /invoices/:id/pdf` returns a valid PDF file (correct content-type, opens correctly in a PDF viewer) containing the invoice number, customer details, all line items with correct quantities/prices/totals, and the grand total.
- [ ] A user without the required role receives `403` on invoice generation; read/download access follows the documented matrix.
- [ ] Frontend: the "Generate Invoice" action appears only on eligible (Confirmed, not-yet-invoiced) challans; after generation, `ChallanDetailPage` reflects the linked invoice (e.g., a link to view/download it) without requiring a manual refresh.
- [ ] Tests cover: invoice generation state guards (wrong challan status, duplicate generation), PDF content correctness at a structural level (e.g., the generated PDF's extracted text includes the expected invoice number and totals), and role enforcement.

## Technical Tasks

1. Add the `Invoice`/`InvoiceItem` Prisma models and migration (extending the schema FLO-004 established, now that this feature is actually being built).
2. Define `invoice.schema.ts` in `packages/shared`.
3. Implement `InvoiceService.generateFromChallan(challanId)` (validates challan status and no existing invoice, copies snapshotted line-item data, assigns an invoice number via the same generation utility introduced/extracted in FLO-015/FLO-017).
4. Implement the PDF-rendering function (challan/invoice data → PDF buffer/stream) using the chosen PDF library.
5. Implement controllers/routes (`generate`, `list`, `detail`, `pdf`) with `authenticate`/`authorize`/`validateRequest`.
6. Build the frontend action on `ChallanDetailPage`, plus `InvoicesListPage`/`InvoiceDetailPage` with the download action.
7. Write backend tests (state guards, duplicate prevention, PDF structural correctness) and frontend tests (conditional action visibility) per FLO-006 conventions.

## Dependencies

FLO-015, FLO-016.

## Implementation Notes

- Deliberately not modeling invoices as an independently editable document with their own line-item entry UI — that would duplicate the Sales Challan's entire line-item-builder complexity (FLO-016) for a feature the assignment only asks for as a PDF export bonus. Deriving strictly from a confirmed challan is the leanest design that satisfies both the Business Context's mention of "invoices" and the bonus's specific ask.
- Reuse the document-number-generation utility already established/extracted by FLO-015/FLO-017 rather than writing a third implementation of the same race-safe sequence logic.
