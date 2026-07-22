// Zod-validated env config, parsed from `process.env` once at import
// time. Fails fast — throws synchronously on import — naming exactly
// which variable(s) are missing or malformed, rather than letting
// `undefined` leak into the app and surface as a confusing error later.
// See specs/FLO-018-env-config-secrets.md.
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // No safe default for a database connection string — an unset or
  // malformed DATABASE_URL must fail startup, not silently point at
  // nothing. Prisma itself also reads this directly (prisma.config.ts);
  // this validation is for the app's own runtime, independent of that.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a PostgreSQL connection string"),
  // No default, and no safe fallback — an unset or empty signing secret
  // is a real security issue, not just a missing convenience default.
  JWT_SECRET: z.string().min(16, "JWT_SECRET is required and must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  // Local-dev default matches the frontend's Vite dev server port
  // (frontend/vite.config.ts has no override, so Vite's default 5173
  // applies). Production deployments must set this explicitly.
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  // Product image upload (FLO-024) — optional so the app boots and stays
  // fully functional without AWS configured (Product.imageUrl is nullable
  // everywhere); the upload endpoints themselves reject with a clear 503
  // if these are unset rather than the whole server failing to start.
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
});

interface Env {
  port: number;
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
  awsRegion: string | undefined;
  awsAccessKeyId: string | undefined;
  awsSecretAccessKey: string | undefined;
  awsBucketName: string | undefined;
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return {
    port: result.data.PORT,
    nodeEnv: result.data.NODE_ENV,
    databaseUrl: result.data.DATABASE_URL,
    jwtSecret: result.data.JWT_SECRET,
    jwtExpiresIn: result.data.JWT_EXPIRES_IN,
    corsOrigin: result.data.CORS_ORIGIN,
    awsRegion: result.data.AWS_REGION,
    awsAccessKeyId: result.data.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: result.data.AWS_SECRET_ACCESS_KEY,
    awsBucketName: result.data.AWS_BUCKET_NAME,
  };
}

export const env: Env = Object.freeze(loadEnv());
