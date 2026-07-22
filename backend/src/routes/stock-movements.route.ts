import { ListStockMovementsQuerySchema } from "@flowerp/shared";
import { Router } from "express";
import * as stockMovementController from "../controllers/stock-movement.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

const stockMovementsRoute = Router();

stockMovementsRoute.use(authenticate);

stockMovementsRoute.get(
  "/",
  validateRequest({ query: ListStockMovementsQuerySchema }),
  stockMovementController.listAll,
);

export default stockMovementsRoute;
