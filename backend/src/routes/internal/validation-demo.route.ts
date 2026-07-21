import { Router } from "express";
import {
  boom,
  list,
  listQuerySchema,
  notFound,
} from "../../controllers/internal/validation-demo.controller.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";

const validationDemoRoute = Router();

validationDemoRoute.get("/", validateRequest({ query: listQuerySchema }), list);
validationDemoRoute.get("/not-found", notFound);
validationDemoRoute.get("/boom", boom);

export default validationDemoRoute;
