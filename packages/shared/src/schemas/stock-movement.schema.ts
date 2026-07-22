import { z } from "zod";
import { PaginationQuery } from "../http/pagination.js";

// Mirrors the Prisma `StockMovementType`/`StockMovementSource` enums
// (backend/prisma/schema/stock-movement.prisma). Kept in sync manually.
export const StockMovementTypeSchema = z.enum(["IN", "OUT"]);
export type StockMovementType = z.infer<typeof StockMovementTypeSchema>;

export const StockMovementSourceSchema = z.enum(["CHALLAN", "PURCHASE_ORDER", "MANUAL"]);
export type StockMovementSource = z.infer<typeof StockMovementSourceSchema>;

// Manual-adjustment request body only — `sourceType`/`sourceId` are always
// set server-side (MANUAL / null for this endpoint; CHALLAN/PURCHASE_ORDER
// are set internally by FLO-015/017's own calls into recordMovement, never
// accepted from a request body).
export const CreateStockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  type: StockMovementTypeSchema,
  reason: z.string().min(1, "Reason is required"),
});
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;

export const ListStockMovementsQuerySchema = z.object({
  ...PaginationQuery.shape,
  productId: z.string().optional(),
  type: StockMovementTypeSchema.optional(),
});
export type ListStockMovementsQuery = z.infer<typeof ListStockMovementsQuerySchema>;

// --- Response shapes ---

export const StockMovementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number(),
  type: StockMovementTypeSchema,
  reason: z.string(),
  sourceType: StockMovementSourceSchema.nullable(),
  sourceId: z.string().nullable(),
  createdAt: z.string(),
  createdById: z.string(),
  createdByName: z.string(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;
