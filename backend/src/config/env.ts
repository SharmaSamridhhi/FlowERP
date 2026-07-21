// Informal env access for now — no validation, no .env file loading.
// Replaced by the Zod-validated config module in FLO-018
// (specs/FLO-018-env-config-secrets.md).
//
// JWT_SECRET is the one exception to "no validation yet": an unset or
// empty signing secret is a real security issue, not just a missing
// convenience default, so it fails loudly at startup rather than
// silently falling back to something predictable.

interface Env {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

const DEFAULT_PORT = 4000;
const DEFAULT_JWT_EXPIRES_IN = "8h";

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable must be set");
  }
  return secret;
}

export const env: Env = {
  port: process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT,
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: requireJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? DEFAULT_JWT_EXPIRES_IN,
};
