import { z } from "zod";
import { PaginationQuery } from "../http/pagination.js";

// Mirrors the Prisma `PurchaseOrderStatus` enum
// (backend/prisma/schema/purchase-order.prisma). Kept in sync manually.
export const PurchaseOrderStatusSchema = z.enum(["DRAFT", "RECEIVED", "CANCELLED"]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

export const PurchaseOrderLineItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost must be 0 or more"),
});
export type PurchaseOrderLineItemInput = z.infer<typeof PurchaseOrderLineItemInputSchema>;

export const CreatePurchaseOrderSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required"),
  items: z.array(PurchaseOrderLineItemInputSchema).min(1, "At least one line item is required"),
});
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

// PATCH replaces the supplier name and/or the full line-item set, mirroring
// FLO-015's UpdateChallanSchema — only valid against a Draft; enforced
// server-side, not by this schema.
export const UpdatePurchaseOrderSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required").optional(),
  items: z
    .array(PurchaseOrderLineItemInputSchema)
    .min(1, "At least one line item is required")
    .optional(),
});
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>;

export const ListPurchaseOrdersQuerySchema = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
  status: PurchaseOrderStatusSchema.optional(),
});
export type ListPurchaseOrdersQuery = z.infer<typeof ListPurchaseOrdersQuerySchema>;

// --- Response shapes ---

export const PurchaseOrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productNameSnapshot: z.string(),
  productSkuSnapshot: z.string(),
  unitCost: z.number(),
  quantity: z.number(),
});
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  supplierName: z.string(),
  status: PurchaseOrderStatusSchema,
  totalQuantity: z.number(),
  totalCost: z.number(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseOrderWithItemsSchema = PurchaseOrderSchema.extend({
  items: z.array(PurchaseOrderItemSchema),
});
export type PurchaseOrderWithItems = z.infer<typeof PurchaseOrderWithItemsSchema>;
