import { LoginRequestSchema } from "@flowerp/shared";
import { Router } from "express";
import { login, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

const authRoute = Router();

authRoute.post("/login", validateRequest({ body: LoginRequestSchema }), login);
authRoute.get("/me", authenticate, me);

export default authRoute;
