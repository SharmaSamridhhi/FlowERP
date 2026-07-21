import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../../app.js";

describe("GET /internal/validation-demo", () => {
  it("passes a valid query through validateRequest to the controller", async () => {
    const response = await request(app).get("/internal/validation-demo?limit=10");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { limit: 10 } });
  });

  it("rejects an invalid query with 400 and field-level details", async () => {
    const response = await request(app).get("/internal/validation-demo?limit=not-a-number");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(response.body.error.details[0].path).toEqual(["limit"]);
  });

  it("rejects a missing query param with 400", async () => {
    const response = await request(app).get("/internal/validation-demo");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /internal/validation-demo/not-found", () => {
  it("maps a thrown NotFoundError to 404 without any response-handling code in the controller", async () => {
    const response = await request(app).get("/internal/validation-demo/not-found");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Demo resource not found" },
    });
  });
});

describe("GET /internal/validation-demo/boom", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps an unhandled thrown error to a generic 500 and logs it server-side", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(app).get("/internal/validation-demo/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("Deliberate unhandled error");
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe("demo route mounting", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("is not mounted when NODE_ENV=production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    vi.resetModules();

    const { default: prodApp } = await import("../../app.js");
    const response = await request(prodApp).get("/internal/validation-demo?limit=10");

    expect(response.status).toBe(404);

    process.env.NODE_ENV = originalNodeEnv;
  });
});
