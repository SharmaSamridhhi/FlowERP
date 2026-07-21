import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

const healthRoute = Router();

healthRoute.get("/", getHealth);

export default healthRoute;
