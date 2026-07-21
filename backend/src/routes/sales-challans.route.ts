import { CreateChallanSchema, ListChallansQuerySchema, UpdateChallanSchema } from "@flowerp/shared";
import { Router } from "express";
import { z } from "zod";
import * as salesChallanController from "../controllers/sales-challan.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

// Role matrix (see specs/FLO-015-sales-challan-backend.md's Scope): all
// four roles can read; only ADMIN/SALES can create, edit, confirm, or
// cancel a challan, mirroring FLO-012's customer role matrix since Sales
// owns the challan lifecycle end to end.
const challanIdParams = z.object({ id: z.string() });

const salesChallansRoute = Router();

salesChallansRoute.use(authenticate);

salesChallansRoute.post(
  "/",
  authorize("ADMIN", "SALES"),
  validateRequest({ body: CreateChallanSchema }),
  salesChallanController.create,
);

salesChallansRoute.get(
  "/",
  validateRequest({ query: ListChallansQuerySchema }),
  salesChallanController.list,
);

salesChallansRoute.get(
  "/:id",
  validateRequest({ params: challanIdParams }),
  salesChallanController.getById,
);

salesChallansRoute.patch(
  "/:id",
  authorize("ADMIN", "SALES"),
  validateRequest({ params: challanIdParams, body: UpdateChallanSchema }),
  salesChallanController.update,
);

salesChallansRoute.post(
  "/:id/confirm",
  authorize("ADMIN", "SALES"),
  validateRequest({ params: challanIdParams }),
  salesChallanController.confirm,
);

salesChallansRoute.post(
  "/:id/cancel",
  authorize("ADMIN", "SALES"),
  validateRequest({ params: challanIdParams }),
  salesChallanController.cancel,
);

export default salesChallansRoute;
