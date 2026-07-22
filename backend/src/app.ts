import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import authRoute from "./routes/auth.route.js";
import customersRoute from "./routes/customers.route.js";
import dashboardRoute from "./routes/dashboard.route.js";
import healthRoute from "./routes/health.route.js";
import validationDemoRoute from "./routes/internal/validation-demo.route.js";
import productsRoute from "./routes/products.route.js";
import purchaseOrdersRoute from "./routes/purchase-orders.route.js";
import salesChallansRoute from "./routes/sales-challans.route.js";
import stockMovementsRoute from "./routes/stock-movements.route.js";
import { ForbiddenError } from "./utils/errors.js";

const app: Express = express();

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (same-origin requests, curl, server-to-server) — allow.
      if (!origin || origin === env.corsOrigin) {
        callback(null, true);
        return;
      }
      callback(new ForbiddenError("Origin not allowed by CORS policy"));
    },
  }),
);
app.use(express.json());

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.use("/health", healthRoute);
app.use("/auth", authRoute);
app.use("/dashboard", dashboardRoute);
app.use("/customers", customersRoute);
app.use("/products", productsRoute);
app.use("/challans", salesChallansRoute);
app.use("/purchase-orders", purchaseOrdersRoute);
app.use("/stock-movements", stockMovementsRoute);

// Reference implementation of validateRequest + AppError, for Phase 3
// modules to model their own routes on. Not mounted in production.
if (env.nodeEnv !== "production") {
  app.use("/internal/validation-demo", validationDemoRoute);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
