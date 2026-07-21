import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

describe("app", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });

  it("still serves requests correctly when request logging is enabled (NODE_ENV=production)", async () => {
    process.env.NODE_ENV = "production";
    vi.resetModules();

    const { default: app } = await import("./app.js");
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });
});
