import type {
  ConfirmProductImageInput,
  CreateProductInput,
  ListProductsQuery,
  Product,
  ProductImageUploadUrl,
  RequestProductImageUploadInput,
  SuccessEnvelope,
  UpdateProductInput,
} from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function listProducts(query: ListProductsQuery): Promise<SuccessEnvelope<Product[]>> {
  return apiRequest<Product[]>("/products", { query });
}

export function getProduct(id: string): Promise<SuccessEnvelope<Product>> {
  return apiRequest<Product>(`/products/${id}`);
}

export function createProduct(data: CreateProductInput): Promise<SuccessEnvelope<Product>> {
  return apiRequest<Product>("/products", { method: "POST", body: data });
}

export function updateProduct(
  id: string,
  data: UpdateProductInput,
): Promise<SuccessEnvelope<Product>> {
  return apiRequest<Product>(`/products/${id}`, { method: "PATCH", body: data });
}

// Product image upload (FLO-024) — presigned-URL flow. requestImageUploadUrl
// and confirmProductImage go through our API (JSON, authenticated); the
// actual file bytes go straight from the browser to S3 via
// uploadFileToPresignedUrl, never through our server.
export function requestImageUploadUrl(
  id: string,
  data: RequestProductImageUploadInput,
): Promise<SuccessEnvelope<ProductImageUploadUrl>> {
  return apiRequest<ProductImageUploadUrl>(`/products/${id}/image-upload-url`, {
    method: "POST",
    body: data,
  });
}

export function confirmProductImage(
  id: string,
  data: ConfirmProductImageInput,
): Promise<SuccessEnvelope<Product>> {
  return apiRequest<Product>(`/products/${id}/image`, { method: "POST", body: data });
}

export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!response.ok) {
    throw new Error("Upload to storage failed. Please try again.");
  }
}
