import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";

const dashboardRoute = Router();

dashboardRoute.use(authenticate);

dashboardRoute.get("/stats", dashboardController.getStats);

export default dashboardRoute;
