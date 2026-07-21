import type { SuccessEnvelope } from "@flowerp/shared";
import type { Request, Response } from "express";

interface HealthStatus {
  status: "ok";
}

export function getHealth(_req: Request, res: Response): void {
  const body: SuccessEnvelope<HealthStatus> = { data: { status: "ok" } };
  res.status(200).json(body);
}
