import { Router } from "express";
import {
  adminOnly,
  boom,
  list,
  listQuerySchema,
  notFound,
  paginatedList,
  paginatedListQuerySchema,
} from "../../controllers/internal/validation-demo.controller.js";
import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";

const validationDemoRoute = Router();

validationDemoRoute.get("/", validateRequest({ query: listQuerySchema }), list);
validationDemoRoute.get(
  "/paginated",
  validateRequest({ query: paginatedListQuerySchema }),
  paginatedList,
);
validationDemoRoute.get("/not-found", notFound);
validationDemoRoute.get("/boom", boom);
validationDemoRoute.get("/admin-only", authenticate, authorize("ADMIN"), adminOnly);

export default validationDemoRoute;
