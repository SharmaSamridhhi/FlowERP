import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url("VITE_API_BASE_URL must be a valid URL")
    .default("http://localhost:4000"),
});

export interface AppEnv {
  apiBaseUrl: string;
}

export type EnvResult = { success: true; env: AppEnv } | { success: false; message: string };

function loadEnv(): EnvResult {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return {
      success: false,
      message: `Invalid environment configuration — ${issues}. Check frontend/.env against frontend/.env.example.`,
    };
  }

  return { success: true, env: { apiBaseUrl: result.data.VITE_API_BASE_URL } };
}

export const envResult: EnvResult = loadEnv();
export const env: AppEnv = envResult.success ? envResult.env : { apiBaseUrl: "" };
