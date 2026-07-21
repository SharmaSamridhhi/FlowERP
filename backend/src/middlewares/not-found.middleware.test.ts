import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("notFoundHandler", () => {
  it("returns a 404 JSON body naming the unmatched route", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { message: "Route not found: GET /does-not-exist" },
    });
  });
});
