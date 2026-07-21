import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "./app.js";

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

  it("allows requests from the configured CORS_ORIGIN", async () => {
    const response = await request(app).get("/health").set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rejects requests from an origin that doesn't match CORS_ORIGIN", async () => {
    const response = await request(app).get("/health").set("Origin", "http://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows requests with no Origin header (e.g. server-to-server, curl)", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });
});
