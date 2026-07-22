import type { DashboardStats, SuccessEnvelope } from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function getDashboardStats(): Promise<SuccessEnvelope<DashboardStats>> {
  return apiRequest<DashboardStats>("/dashboard/stats");
}
