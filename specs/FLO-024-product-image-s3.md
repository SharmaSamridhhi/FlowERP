# FLO-024 — Product Image Upload to AWS S3

**Phase:** 5 — Engineering Improvements (Good Practices II)

## Description

Implement the assignment's "Upload product image to AWS S3" bonus point: an image field on products, uploaded from `ProductFormPage`/`ProductDetailPage`, stored in an S3 bucket, with the resulting URL persisted on the product record. Placed in Phase 5 because the Product & Inventory module (FLO-013) is fully functional without it, and image upload introduces a new external dependency (AWS credentials, a bucket) that's reasonable to defer until the core catalog is proven.

## User Story

As a Warehouse or Admin user, I want to attach a photo to a product, so that products are easier to identify visually in the catalog and on documents that reference them.

## Scope

**Included:**
- `Product.imageUrl` (nullable) added via migration, extending FLO-004's `Product` model now that this feature is actually being built.
- Backend: an upload endpoint (`POST /products/:id/image`) accepting a multipart image upload (validated: allowed content-types, max file size), uploading it to a configured S3 bucket (via the AWS SDK), and persisting the resulting object URL on the product — or, as a documented alternative, a presigned-URL flow (`GET /products/:id/image-upload-url` returning a presigned S3 PUT URL the frontend uploads to directly, then `PATCH /products/:id` with the resulting URL) if that approach is preferred for not routing binary uploads through the Express server (pick one, document the choice).
- AWS credentials and bucket name added to the backend's env contract (extending FLO-018's schema and `.env.example`) — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`.
- Frontend: an image upload control on `ProductFormPage` (preview before/after upload) and the image displayed on `ProductDetailPage` and as a thumbnail in `ProductsListPage`'s `DataTable` (with a placeholder/fallback for products without an image).
- Basic validation: file type restricted to common image formats (jpeg/png/webp), file size capped (e.g., 5MB), rejected clearly if violated.

**Excluded:**
- Image editing/cropping/resizing (an out-of-scope enhancement beyond "upload a product image").
- Multiple images per product (the assignment's bonus is singular — "upload product image" — one image per product is sufficient).
- CDN/CloudFront fronting the bucket (a further optimization not requested; direct S3 object URLs, with the bucket's public-read policy scoped narrowly to the image path prefix, are sufficient for this project's scope).

## Acceptance Criteria

- [ ] Uploading a valid image (correct type, within size limit) via `ProductFormPage` results in the image being stored in the configured S3 bucket and `Product.imageUrl` updated to a working, publicly-accessible URL.
- [ ] Uploading an invalid file (wrong type, or oversized) is rejected client-side before upload where feasible, and rejected server-side regardless (never trust client-side validation alone), with a clear error message.
- [ ] `ProductDetailPage` and `ProductsListPage` display the uploaded image (or a clear placeholder for products without one) without layout breakage at both mobile and desktop widths.
- [ ] AWS credentials are sourced only from the validated env config (FLO-018's pattern extended), never hardcoded, and are absent from any frontend-reachable code or bundle.
- [ ] Replacing an existing product image (uploading a new one) updates `imageUrl` to the new object; the old object's cleanup policy (deleted from S3, or left as an orphan and accepted as a known limitation) is a documented, deliberate choice rather than an unconsidered gap.
- [ ] A user without the required role (following the FLO-013-established product-edit role matrix) cannot upload/change a product image.
- [ ] Tests cover: file-type/size validation (server-side), the S3 upload call (mocked in tests — do not hit real AWS in the automated test suite), and role enforcement.

## Technical Tasks

1. Add the `imageUrl` field to `Product` via a new Prisma migration.
2. Extend the backend env schema (FLO-018) and `.env.example` with the AWS/S3 variables.
3. Provision (or document provisioning steps for) an S3 bucket with an appropriately scoped access policy — least-privilege IAM credentials for the backend, not broad account-level access.
4. Implement the upload endpoint (direct server-proxied upload or presigned-URL flow — decide and document), including server-side file-type/size validation before any S3 call.
5. Wire the AWS SDK (`@aws-sdk/client-s3`, plus `@aws-sdk/s3-request-presigner` if using the presigned-URL approach) in the backend, reading credentials only from the validated env config.
6. Build the frontend upload control (with client-side pre-validation and a preview), and the image display on the list/detail pages, including a graceful placeholder/fallback.
7. Write backend tests mocking the S3 client (no real network calls to AWS in CI) and frontend tests for the upload control's validation/preview behavior.
8. Document the S3 setup steps (bucket creation, IAM policy) for FLO-021's README, since this introduces a new piece of external infrastructure beyond what FLO-020 already covers.

## Dependencies

FLO-013, FLO-018.

## Implementation Notes

- This is the one spec in the entire roadmap that requires a real AWS account and incurs a (typically free-tier-eligible, but real) external dependency — if AWS access isn't available when this spec is implemented, that's a legitimate reason to leave it undone and record it plainly in FLO-021's known-limitations section; it's explicitly a bonus, not a requirement, and the project must remain fully functional without it (the `imageUrl` field being nullable everywhere is what guarantees that).
- Prefer the presigned-URL approach if implementation time allows: it keeps binary upload traffic off the Express server entirely (the browser uploads directly to S3), which is both simpler to scale and avoids adding multipart-upload-handling middleware/complexity to the backend for a bonus feature. If time is tight, a direct server-proxied upload is an acceptable, simpler fallback — just document which was chosen and why.
