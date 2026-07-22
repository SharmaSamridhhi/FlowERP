import { z } from "zod";
import { SalesChallanStatusSchema } from "./sales-challan.schema.js";

export const SalesTrendPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
});
export type SalesTrendPoint = z.infer<typeof SalesTrendPointSchema>;

export const DashboardChallanSummarySchema = z.object({
  id: z.string(),
  challanNumber: z.string(),
  customerName: z.string(),
  totalAmount: z.number(),
  status: SalesChallanStatusSchema,
  createdAt: z.string(),
});
export type DashboardChallanSummary = z.infer<typeof DashboardChallanSummarySchema>;

export const DashboardStatsSchema = z.object({
  totalInventoryValue: z.number(),
  monthlyConfirmedSales: z.number(),
  totalActiveCustomers: z.number(),
  lowStockAlertCount: z.number(),
  salesTrend: z.array(SalesTrendPointSchema),
  todaysChallans: z.array(DashboardChallanSummarySchema),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
