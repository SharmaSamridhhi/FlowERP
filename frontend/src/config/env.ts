// Informal env access for now — no validation.
// Replaced by the Zod-validated config module in FLO-018
// (specs/FLO-018-env-config-secrets.md).

interface AppEnv {
  apiBaseUrl: string;
}

const DEFAULT_API_BASE_URL = "http://localhost:4000";

export const env: AppEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};
