import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  const originalPort = process.env.PORT;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
    vi.resetModules();
  });

  it("falls back to the default port, development, and JWT expiry when unset", async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.JWT_EXPIRES_IN;
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe("development");
    expect(env.jwtExpiresIn).toBe("8h");
  });

  it("reads PORT, NODE_ENV, and JWT_EXPIRES_IN from the environment when set", async () => {
    process.env.PORT = "5050";
    process.env.NODE_ENV = "production";
    process.env.JWT_EXPIRES_IN = "1h";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(5050);
    expect(env.nodeEnv).toBe("production");
    expect(env.jwtExpiresIn).toBe("1h");
  });

  it("reads JWT_SECRET from the environment when set", async () => {
    process.env.JWT_SECRET = "a-real-looking-secret";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.jwtSecret).toBe("a-real-looking-secret");
  });

  it("throws immediately on import when JWT_SECRET is unset", async () => {
    delete process.env.JWT_SECRET;
    vi.resetModules();

    await expect(import("./env.js")).rejects.toThrow("JWT_SECRET environment variable must be set");
  });
});
