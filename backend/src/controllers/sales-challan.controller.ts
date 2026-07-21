import type {
  CreateChallanInput,
  ListChallansQuery,
  SalesChallan,
  SalesChallanWithItems,
  SuccessEnvelope,
  UpdateChallanInput,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as salesChallanService from "../services/sales-challan.service.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.validated?.body as CreateChallanInput;
  const challan = await salesChallanService.createChallan(data, req.user!.id);

  const body: SuccessEnvelope<SalesChallanWithItems> = { data: challan };
  res.status(201).json(body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListChallansQuery;
  const { items, total } = await salesChallanService.listChallans(query);

  const body: SuccessEnvelope<SalesChallan[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const challan = await salesChallanService.findChallanById(id);

  const body: SuccessEnvelope<SalesChallanWithItems> = { data: challan };
  res.status(200).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as UpdateChallanInput;
  const challan = await salesChallanService.updateDraftChallan(id, data);

  const body: SuccessEnvelope<SalesChallanWithItems> = { data: challan };
  res.status(200).json(body);
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const challan = await salesChallanService.confirmChallan(id, req.user!.id);

  const body: SuccessEnvelope<SalesChallanWithItems> = { data: challan };
  res.status(200).json(body);
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const challan = await salesChallanService.cancelChallan(id, req.user!.id);

  const body: SuccessEnvelope<SalesChallanWithItems> = { data: challan };
  res.status(200).json(body);
}
