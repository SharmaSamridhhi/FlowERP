import type {
  CreateChallanInput,
  ListChallansQuery,
  SalesChallan,
  SalesChallanWithItems,
  SuccessEnvelope,
  UpdateChallanInput,
} from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function listChallans(query: ListChallansQuery): Promise<SuccessEnvelope<SalesChallan[]>> {
  return apiRequest<SalesChallan[]>("/challans", { query });
}

export function getChallan(id: string): Promise<SuccessEnvelope<SalesChallanWithItems>> {
  return apiRequest<SalesChallanWithItems>(`/challans/${id}`);
}

export function createChallan(
  data: CreateChallanInput,
): Promise<SuccessEnvelope<SalesChallanWithItems>> {
  return apiRequest<SalesChallanWithItems>("/challans", { method: "POST", body: data });
}

export function updateChallan(
  id: string,
  data: UpdateChallanInput,
): Promise<SuccessEnvelope<SalesChallanWithItems>> {
  return apiRequest<SalesChallanWithItems>(`/challans/${id}`, { method: "PATCH", body: data });
}

export function confirmChallan(id: string): Promise<SuccessEnvelope<SalesChallanWithItems>> {
  return apiRequest<SalesChallanWithItems>(`/challans/${id}/confirm`, { method: "POST" });
}

export function cancelChallan(id: string): Promise<SuccessEnvelope<SalesChallanWithItems>> {
  return apiRequest<SalesChallanWithItems>(`/challans/${id}/cancel`, { method: "POST" });
}
