import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  PurchaseOrder,
  PurchaseOrderWithItems,
  SuccessEnvelope,
  UpdatePurchaseOrderInput,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as purchaseOrderService from "../services/purchase-order.service.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.validated?.body as CreatePurchaseOrderInput;
  const po = await purchaseOrderService.createPurchaseOrder(data, req.user!.id);

  const body: SuccessEnvelope<PurchaseOrderWithItems> = { data: po };
  res.status(201).json(body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListPurchaseOrdersQuery;
  const { items, total } = await purchaseOrderService.listPurchaseOrders(query);

  const body: SuccessEnvelope<PurchaseOrder[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const po = await purchaseOrderService.findPurchaseOrderById(id);

  const body: SuccessEnvelope<PurchaseOrderWithItems> = { data: po };
  res.status(200).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as UpdatePurchaseOrderInput;
  const po = await purchaseOrderService.updateDraftPurchaseOrder(id, data);

  const body: SuccessEnvelope<PurchaseOrderWithItems> = { data: po };
  res.status(200).json(body);
}

export async function receive(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const po = await purchaseOrderService.receivePurchaseOrder(id, req.user!.id);

  const body: SuccessEnvelope<PurchaseOrderWithItems> = { data: po };
  res.status(200).json(body);
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const po = await purchaseOrderService.cancelPurchaseOrder(id, req.user!.id);

  const body: SuccessEnvelope<PurchaseOrderWithItems> = { data: po };
  res.status(200).json(body);
}
