import type { DashboardStats, SuccessEnvelope } from "@flowerp/shared";
import type { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await dashboardService.getDashboardStats();
  const body: SuccessEnvelope<DashboardStats> = { data: stats };
  res.status(200).json(body);
}
