import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
  StockMovement,
  SuccessEnvelope,
} from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function listStockMovements(
  productId: string,
  query: ListStockMovementsQuery,
): Promise<SuccessEnvelope<StockMovement[]>> {
  return apiRequest<StockMovement[]>(`/products/${productId}/stock-movements`, { query });
}

export function listAllStockMovements(
  query: ListStockMovementsQuery,
): Promise<SuccessEnvelope<StockMovement[]>> {
  return apiRequest<StockMovement[]>("/stock-movements", { query });
}

export function createStockMovement(
  productId: string,
  data: CreateStockMovementInput,
): Promise<SuccessEnvelope<StockMovement>> {
  return apiRequest<StockMovement>(`/products/${productId}/stock-movements`, {
    method: "POST",
    body: data,
  });
}
