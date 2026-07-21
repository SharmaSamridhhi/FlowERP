import {
  CreateCustomerSchema,
  CreateFollowUpSchema,
  ListCustomersQuerySchema,
  UpdateCustomerSchema,
} from "@flowerp/shared";
import { Router } from "express";
import { z } from "zod";
import * as customerController from "../controllers/customer.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

// Role matrix (see specs/FLO-012-customer-crm.md's Implementation Notes):
// all four roles can read; only ADMIN/SALES can create, edit, or add
// follow-ups.
const customerIdParams = z.object({ id: z.string() });

const customersRoute = Router();

customersRoute.use(authenticate);

customersRoute.post(
  "/",
  authorize("ADMIN", "SALES"),
  validateRequest({ body: CreateCustomerSchema }),
  customerController.create,
);

customersRoute.get(
  "/",
  validateRequest({ query: ListCustomersQuerySchema }),
  customerController.list,
);

customersRoute.get(
  "/:id",
  validateRequest({ params: customerIdParams }),
  customerController.getById,
);

customersRoute.patch(
  "/:id",
  authorize("ADMIN", "SALES"),
  validateRequest({ params: customerIdParams, body: UpdateCustomerSchema }),
  customerController.update,
);

customersRoute.post(
  "/:id/follow-ups",
  authorize("ADMIN", "SALES"),
  validateRequest({ params: customerIdParams, body: CreateFollowUpSchema }),
  customerController.addFollowUp,
);

export default customersRoute;
