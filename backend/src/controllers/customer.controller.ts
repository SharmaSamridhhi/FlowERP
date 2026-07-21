import type {
  Customer,
  CustomerFollowUp,
  CustomerWithFollowUps,
  CreateCustomerInput,
  CreateFollowUpInput,
  ListCustomersQuery,
  SuccessEnvelope,
  UpdateCustomerInput,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as customerService from "../services/customer.service.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.validated?.body as CreateCustomerInput;
  const customer = await customerService.createCustomer(data, req.user!.id);

  const body: SuccessEnvelope<Customer> = { data: customer };
  res.status(201).json(body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListCustomersQuery;
  const { items, total } = await customerService.listCustomers(query);

  const body: SuccessEnvelope<Customer[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const customer = await customerService.findCustomerById(id);

  const body: SuccessEnvelope<CustomerWithFollowUps> = { data: customer };
  res.status(200).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as UpdateCustomerInput;
  const customer = await customerService.updateCustomer(id, data);

  const body: SuccessEnvelope<Customer> = { data: customer };
  res.status(200).json(body);
}

export async function addFollowUp(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as CreateFollowUpInput;
  const followUp = await customerService.addFollowUp(id, data, req.user!.id);

  const body: SuccessEnvelope<CustomerFollowUp> = { data: followUp };
  res.status(201).json(body);
}
