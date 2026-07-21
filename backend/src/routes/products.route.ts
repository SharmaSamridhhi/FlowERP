import { CreateProductSchema, ListProductsQuerySchema, UpdateProductSchema } from "@flowerp/shared";
import { Router } from "express";
import { z } from "zod";
import * as productController from "../controllers/product.controller.js";
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

export default productsRoute;
