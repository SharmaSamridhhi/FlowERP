import type {
  CreateProductInput,
  ListProductsQuery,
  Product,
  SuccessEnvelope,
  UpdateProductInput,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as productService from "../services/product.service.js";
import { buildPaginationMeta } from "../utils/pagination.js";

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.validated?.body as CreateProductInput;
  const product = await productService.createProduct(data);

  const body: SuccessEnvelope<Product> = { data: product };
  res.status(201).json(body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListProductsQuery;
  const { items, total } = await productService.listProducts(query);

  const body: SuccessEnvelope<Product[]> = {
    data: items,
    meta: { pagination: buildPaginationMeta(total, query.page, query.limit) },
  };
  res.status(200).json(body);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const product = await productService.findProductById(id);

  const body: SuccessEnvelope<Product> = { data: product };
  res.status(200).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as UpdateProductInput;
  const product = await productService.updateProduct(id, data);

  const body: SuccessEnvelope<Product> = { data: product };
  res.status(200).json(body);
}
