import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
  StockMovement,
  SuccessEnvelope,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as stockMovementService from "../services/stock-movement.service.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export async function create(req: Request, res: Response): Promise<void> {
  const { id: productId } = req.validated?.params as { id: string };
  const data = req.validated?.body as CreateStockMovementInput;

  const movement = await stockMovementService.recordMovement({
    productId,
    quantity: data.quantity,
    type: data.type,
    reason: data.reason,
    createdById: req.user!.id,
    sourceType: "MANUAL",
  });

  const body: SuccessEnvelope<StockMovement> = { data: movement };
  res.status(201).json(body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { id: productId } = req.validated?.params as { id: string };
  const query = req.validated?.query as ListStockMovementsQuery;

  const { items, total } = await stockMovementService.listStockMovements(productId, query);

  const body: SuccessEnvelope<StockMovement[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListStockMovementsQuery;

  const { items, total } = await stockMovementService.listAllStockMovements(query);

  const body: SuccessEnvelope<StockMovement[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}
