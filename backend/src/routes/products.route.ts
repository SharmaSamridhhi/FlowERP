import {
  CreateProductSchema,
  CreateStockMovementSchema,
  ListProductsQuerySchema,
  ListStockMovementsQuerySchema,
  UpdateProductSchema,
} from "@flowerp/shared";
import { Router } from "express";
import { z } from "zod";
import * as productController from "../controllers/product.controller.js";
import * as stockMovementController from "../controllers/stock-movement.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

// Role matrix (see specs/FLO-013-product-inventory-catalog.md's
// Implementation Notes): all four roles can read; only ADMIN/WAREHOUSE can
// create or edit, since the warehouse team owns catalog upkeep and admin
// oversees it.
const productIdParams = z.object({ id: z.string() });

const productsRoute = Router();

productsRoute.use(authenticate);

productsRoute.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ body: CreateProductSchema }),
  productController.create,
);

productsRoute.get("/", validateRequest({ query: ListProductsQuerySchema }), productController.list);

productsRoute.get("/:id", validateRequest({ params: productIdParams }), productController.getById);

productsRoute.patch(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ params: productIdParams, body: UpdateProductSchema }),
  productController.update,
);

// Stock movement ledger (specs/FLO-014-stock-movement-ledger.md): same
// read-broad/write-restricted role matrix as the product entity itself —
// manual adjustments are the one place outside the challan/PO flows where
// Warehouse/Admin can record an IN/OUT movement directly.
productsRoute.get(
  "/:id/stock-movements",
  validateRequest({ params: productIdParams, query: ListStockMovementsQuerySchema }),
  stockMovementController.list,
);

productsRoute.post(
  "/:id/stock-movements",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ params: productIdParams, body: CreateStockMovementSchema }),
  stockMovementController.create,
);

export default productsRoute;
