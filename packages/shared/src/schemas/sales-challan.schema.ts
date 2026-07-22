import { z } from "zod";
import { PaginationQuery } from "../http/pagination.js";

// Mirrors the Prisma `SalesChallanStatus` enum
// (backend/prisma/schema/sales-challan.prisma). Kept in sync manually.
export const SalesChallanStatusSchema = z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]);
export type SalesChallanStatus = z.infer<typeof SalesChallanStatusSchema>;

export const ChallanLineItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
});
export type ChallanLineItemInput = z.infer<typeof ChallanLineItemInputSchema>;

export const CreateChallanSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z.array(ChallanLineItemInputSchema).min(1, "At least one line item is required"),
});
export type CreateChallanInput = z.infer<typeof CreateChallanSchema>;

// PATCH replaces the customer and/or the full line-item set — a Draft's
// items are re-supplied wholesale rather than diffed by id, keeping the
// edit operation (and its re-snapshotting) simple to reason about. Only
// valid against a Draft; enforced server-side, not by this schema.
export const UpdateChallanSchema = z.object({
  customerId: z.string().min(1, "Customer is required").optional(),
  items: z
    .array(ChallanLineItemInputSchema)
    .min(1, "At least one line item is required")
    .optional(),
});
export type UpdateChallanInput = z.infer<typeof UpdateChallanSchema>;

export const ListChallansQuerySchema = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
  status: SalesChallanStatusSchema.optional(),
  customerId: z.string().optional(),
});
export type ListChallansQuery = z.infer<typeof ListChallansQuerySchema>;

// --- Response shapes ---

export const SalesChallanItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productNameSnapshot: z.string(),
  productSkuSnapshot: z.string(),
  unitPriceSnapshot: z.number(),
  quantity: z.number(),
});
export type SalesChallanItem = z.infer<typeof SalesChallanItemSchema>;

export const SalesChallanSchema = z.object({
  id: z.string(),
  challanNumber: z.string(),
  status: SalesChallanStatusSchema,
  totalQuantity: z.number(),
  totalAmount: z.number(),
  customerId: z.string(),
  customerName: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SalesChallan = z.infer<typeof SalesChallanSchema>;

export const SalesChallanWithItemsSchema = SalesChallanSchema.extend({
  items: z.array(SalesChallanItemSchema),
});
export type SalesChallanWithItems = z.infer<typeof SalesChallanWithItemsSchema>;

// Shape of the `error.details` array on POST /challans/:id/confirm's 409
// insufficient-stock response (see specs/FLO-016-sales-challan-frontend.md
// — the builder maps this onto the specific offending line item(s)
// instead of showing only a generic toast). Added alongside FLO-016
// because FLO-015 threw a message-only ConflictError with no structured
// detail for the frontend to key off of.
export const InsufficientStockItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  requestedQuantity: z.number(),
  availableQuantity: z.number(),
});
export type InsufficientStockItem = z.infer<typeof InsufficientStockItemSchema>;
