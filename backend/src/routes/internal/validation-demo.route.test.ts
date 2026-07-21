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

describe("GET /internal/validation-demo/paginated", () => {
  it("returns the { data, meta: { pagination } } envelope shape", async () => {
    const response = await request(app).get("/internal/validation-demo/paginated?page=1&limit=10");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: expect.any(Array),
      meta: {
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
    });
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data[0]).toEqual({ id: 1, name: "Demo item 1" });
  });

  it("applies defaults when page/limit are omitted", async () => {
    const response = await request(app).get("/internal/validation-demo/paginated");

    expect(response.status).toBe(200);
    expect(response.body.meta.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
    });
  });

  it("filters by search and paginates the filtered result", async () => {
    const response = await request(app).get(
      "/internal/validation-demo/paginated?search=Demo item 1&limit=5",
    );

    // "Demo item 1" matches items 1, 10-19 (11 total: "1", "10".."19")
    expect(response.body.meta.pagination.total).toBe(11);
    expect(response.body.data).toHaveLength(5);
  });

  it("rejects an out-of-range limit with 400", async () => {
    const response = await request(app).get("/internal/validation-demo/paginated?limit=1000");

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
