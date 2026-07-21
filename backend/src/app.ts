import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import authRoute from "./routes/auth.route.js";
import customersRoute from "./routes/customers.route.js";
import healthRoute from "./routes/health.route.js";
import validationDemoRoute from "./routes/internal/validation-demo.route.js";

const app: Express = express();

app.use(cors({ origin: true }));
app.use(express.json());

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.use("/health", healthRoute);
app.use("/auth", authRoute);
app.use("/customers", customersRoute);

// Reference implementation of validateRequest + AppError, for Phase 3
// modules to model their own routes on. Not mounted in production.
if (env.nodeEnv !== "production") {
  app.use("/internal/validation-demo", validationDemoRoute);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
