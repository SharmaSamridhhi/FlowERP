import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  const originalPort = process.env.PORT;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });

  it("falls back to the default port and development when unset", async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe("development");
  });

  it("reads PORT and NODE_ENV from the environment when set", async () => {
    process.env.PORT = "5050";
    process.env.NODE_ENV = "production";
    vi.resetModules();

    const { env } = await import("./env.js");

    expect(env.port).toBe(5050);
    expect(env.nodeEnv).toBe("production");
  });
});
