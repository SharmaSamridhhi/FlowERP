import type {
  CreateProductInput,
  ListProductsQuery,
  Product,
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
