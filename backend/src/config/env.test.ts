import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  const originalValues: Record<string, string | undefined> = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  };

  // `process.env[key] = undefined` coerces to the *string* "undefined"
  // rather than deleting the key — restore by deleting when the
  // original value was genuinely unset.
  afterEach(() => {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.resetModules();
  });

  it("falls back to the default port, environment, JWT expiry, and CORS origin when unset", async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.CORS_ORIGIN;
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe("development");
    expect(env.jwtExpiresIn).toBe("8h");
    expect(env.corsOrigin).toBe("http://localhost:5173");
  });

  it("reads PORT, NODE_ENV, JWT_EXPIRES_IN, and CORS_ORIGIN from the environment when set", async () => {
    process.env.PORT = "5050";
    process.env.NODE_ENV = "production";
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.CORS_ORIGIN = "https://app.flowerp.example";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(5050);
    expect(env.nodeEnv).toBe("production");
    expect(env.jwtExpiresIn).toBe("1h");
    expect(env.corsOrigin).toBe("https://app.flowerp.example");
  });

  it("reads JWT_SECRET and DATABASE_URL from the environment when set", async () => {
    process.env.JWT_SECRET = "a-real-looking-secret";
    process.env.DATABASE_URL = "postgresql://user@localhost:5432/flowerp_dev";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.jwtSecret).toBe("a-real-looking-secret");
    expect(env.databaseUrl).toBe("postgresql://user@localhost:5432/flowerp_dev");
  });

  it("throws immediately on import when JWT_SECRET is unset", async () => {
    delete process.env.JWT_SECRET;
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("JWT_SECRET");
  });

  it("throws immediately on import when JWT_SECRET is too short", async () => {
    process.env.JWT_SECRET = "too-short";
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("JWT_SECRET");
  });

  it("throws immediately on import when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("DATABASE_URL");
  });

  it("throws immediately on import when DATABASE_URL is not a PostgreSQL connection string", async () => {
    process.env.DATABASE_URL = "mysql://user@localhost:3306/flowerp_dev";
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("DATABASE_URL");
  });

  it("throws immediately on import when PORT is not a number", async () => {
    process.env.PORT = "not-a-number";
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("PORT");
  });

  it("throws immediately on import when NODE_ENV is not a recognized value", async () => {
    process.env.NODE_ENV = "staging";
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("NODE_ENV");
  });
});
