import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  PurchaseOrder,
  PurchaseOrderWithItems,
  SuccessEnvelope,
  UpdatePurchaseOrderInput,
} from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function listPurchaseOrders(
  query: ListPurchaseOrdersQuery,
): Promise<SuccessEnvelope<PurchaseOrder[]>> {
  return apiRequest<PurchaseOrder[]>("/purchase-orders", { query });
}

export function getPurchaseOrder(id: string): Promise<SuccessEnvelope<PurchaseOrderWithItems>> {
  return apiRequest<PurchaseOrderWithItems>(`/purchase-orders/${id}`);
}

export function createPurchaseOrder(
  data: CreatePurchaseOrderInput,
): Promise<SuccessEnvelope<PurchaseOrderWithItems>> {
  return apiRequest<PurchaseOrderWithItems>("/purchase-orders", { method: "POST", body: data });
}

export function updatePurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderInput,
): Promise<SuccessEnvelope<PurchaseOrderWithItems>> {
  return apiRequest<PurchaseOrderWithItems>(`/purchase-orders/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function receivePurchaseOrder(id: string): Promise<SuccessEnvelope<PurchaseOrderWithItems>> {
  return apiRequest<PurchaseOrderWithItems>(`/purchase-orders/${id}/receive`, { method: "POST" });
}

export function cancelPurchaseOrder(id: string): Promise<SuccessEnvelope<PurchaseOrderWithItems>> {
  return apiRequest<PurchaseOrderWithItems>(`/purchase-orders/${id}/cancel`, { method: "POST" });
}
