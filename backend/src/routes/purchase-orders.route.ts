import {
  CreatePurchaseOrderSchema,
  ListPurchaseOrdersQuerySchema,
  UpdatePurchaseOrderSchema,
} from "@flowerp/shared";
import { Router } from "express";
import { z } from "zod";
import * as purchaseOrderController from "../controllers/purchase-order.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

// Role matrix (see specs/FLO-017-purchase-order.md's Scope): all four
// roles can read; only ADMIN/WAREHOUSE can create, edit, receive, or
// cancel — warehouse owns the inbound stock flow, mirroring FLO-013's
// product catalog role matrix.
const poIdParams = z.object({ id: z.string() });

const purchaseOrdersRoute = Router();

purchaseOrdersRoute.use(authenticate);

purchaseOrdersRoute.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ body: CreatePurchaseOrderSchema }),
  purchaseOrderController.create,
);

purchaseOrdersRoute.get(
  "/",
  validateRequest({ query: ListPurchaseOrdersQuerySchema }),
  purchaseOrderController.list,
);

purchaseOrdersRoute.get(
  "/:id",
  validateRequest({ params: poIdParams }),
  purchaseOrderController.getById,
);

purchaseOrdersRoute.patch(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ params: poIdParams, body: UpdatePurchaseOrderSchema }),
  purchaseOrderController.update,
);

purchaseOrdersRoute.post(
  "/:id/receive",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ params: poIdParams }),
  purchaseOrderController.receive,
);

purchaseOrdersRoute.post(
  "/:id/cancel",
  authorize("ADMIN", "WAREHOUSE"),
  validateRequest({ params: poIdParams }),
  purchaseOrderController.cancel,
);

export default purchaseOrdersRoute;
