// Informal env access for now — no validation, no .env file loading.
// Replaced by the Zod-validated config module in FLO-018
// (specs/FLO-018-env-config-secrets.md).

interface Env {
  port: number;
  nodeEnv: string;
}

const DEFAULT_PORT = 4000;

export const env: Env = {
  port: process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
