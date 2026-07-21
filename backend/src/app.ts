import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import healthRoute from "./routes/health.route.js";

const app: Express = express();

app.use(cors({ origin: true }));
app.use(express.json());

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.use("/health", healthRoute);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
