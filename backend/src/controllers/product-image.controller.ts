import type {
  ConfirmProductImageInput,
  Product,
  ProductImageUploadUrl,
  RequestProductImageUploadInput,
  SuccessEnvelope,
} from "@flowerp/shared";
import type { Request, Response } from "express";
import * as productImageService from "../services/product-image.service.js";

export async function requestUploadUrl(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as RequestProductImageUploadInput;
  const result = await productImageService.requestImageUploadUrl(id, data);

  const body: SuccessEnvelope<ProductImageUploadUrl> = { data: result };
  res.status(201).json(body);
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { id } = req.validated?.params as { id: string };
  const data = req.validated?.body as ConfirmProductImageInput;
  const product = await productImageService.confirmImageUpload(id, data);

  const body: SuccessEnvelope<Product> = { data: product };
  res.status(200).json(body);
}
