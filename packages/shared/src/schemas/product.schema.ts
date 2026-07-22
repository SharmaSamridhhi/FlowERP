import { z } from "zod";
import { PaginationQuery } from "../http/pagination.js";

// HTML inputs submit "" for an empty optional field, never `undefined` —
// treat "" as absent so it becomes NULL in Postgres, not a stored empty
// string, whether the request comes from the real form or a raw API call.
// Mirrors packages/shared/src/schemas/customer.schema.ts.
function optionalString(schema: z.ZodString = z.string()) {
  return z.preprocess((val) => (val === "" ? undefined : val), schema.optional());
}

const productFields = {
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  minStockAlertQuantity: z.coerce
    .number()
    .int()
    .min(0, "Minimum stock alert quantity must be 0 or more"),
  location: optionalString(),
};

export const CreateProductSchema = z.object(productFields);
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// Deliberately excludes `sku` (immutable identifier) and `currentStock` —
// FLO-014's stock movement ledger is the sole path that may change
// currentStock. See specs/FLO-013-product-inventory-catalog.md.
export const UpdateProductSchema = z
  .object({
    name: productFields.name,
    category: productFields.category,
    unitPrice: productFields.unitPrice,
    minStockAlertQuantity: productFields.minStockAlertQuantity,
    location: productFields.location,
  })
  .partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// --- Product image upload (FLO-024) ---
//
// Presigned-URL flow, not a server-proxied upload: the browser PUTs the
// file directly to S3 using a short-lived signed URL, keeping binary
// traffic off the Express server entirely. See specs/FLO-024-product-image-s3.md.
export const PRODUCT_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ProductImageContentTypeSchema = z.enum(PRODUCT_IMAGE_CONTENT_TYPES);
export type ProductImageContentType = z.infer<typeof ProductImageContentTypeSchema>;

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export const RequestProductImageUploadSchema = z.object({
  contentType: ProductImageContentTypeSchema,
  fileSizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PRODUCT_IMAGE_BYTES, "Image must be 5MB or smaller"),
});
export type RequestProductImageUploadInput = z.infer<typeof RequestProductImageUploadSchema>;

export const ProductImageUploadUrlSchema = z.object({
  uploadUrl: z.string(),
  objectKey: z.string(),
  expiresInSeconds: z.number(),
});
export type ProductImageUploadUrl = z.infer<typeof ProductImageUploadUrlSchema>;

export const ConfirmProductImageSchema = z.object({
  objectKey: z.string().min(1, "Object key is required"),
});
export type ConfirmProductImageInput = z.infer<typeof ConfirmProductImageSchema>;

export const ListProductsQuerySchema = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  stockStatus: z.enum(["in_stock", "out_of_stock"]).optional(),
});
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;

// --- Response shapes ---

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  unitPrice: z.number(),
  currentStock: z.number(),
  minStockAlertQuantity: z.number(),
  location: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isLowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;
